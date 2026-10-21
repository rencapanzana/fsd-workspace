-- Logic checks for the database rules. Run with the Supabase MCP execute_sql or the SQL editor.
-- Insert-only fixtures inside one transaction that always rolls back. A failed assert raises and names the rule.
begin;
do $$
declare c uuid; a1 uuid; a2 uuid; a3 uuid; a4 uuid; r uuid; p uuid; n integer;
  y date := date '2026-10-21';
begin
  -- Recurring dates: the 31st clamps to short months and returns; weekly and fortnightly step from the last due date.
  assert private.recurring_advance('monthly', 31, date '2027-01-31') = date '2027-02-28', 'monthly 31st -> 28 Feb';
  assert private.recurring_advance('monthly', 31, date '2027-02-28') = date '2027-03-31', 'monthly back to 31 Mar';
  assert private.recurring_advance('monthly', 12, date '2026-12-12') = date '2027-01-12', 'monthly across the year';
  assert private.recurring_advance('weekly', null, date '2026-10-26') = date '2026-11-02', 'weekly';
  assert private.recurring_advance('fortnightly', null, date '2026-10-26') = date '2026-11-09', 'fortnightly';

  insert into public.clients (slug, name) values ('zz-logic-test', 'Logic test') returning id into c;

  -- Running the recurring job twice makes one task, and the database refuses a second one for the same date.
  insert into public.recurring (client_id, title, cadence, next_due, lead_days)
    values (c, 'Test report', 'weekly', (now() at time zone 'Australia/Sydney')::date + 1, 3) returning id into r;
  perform private.create_recurring_tasks();
  perform private.create_recurring_tasks();
  select count(*) into n from public.tasks where recurring_id = r;
  assert n = 1, format('recurring job twice: expected 1 task, got %s', n);
  begin
    insert into public.tasks (client_id, title, recurring_id, due_date)
      select client_id, title, recurring_id, due_date from public.tasks where recurring_id = r;
    assert false, 'a duplicate recurring task was allowed';
  exception when unique_violation then null;
  end;

  -- Alert rule. 60 days at CPA A$50, yesterday A$70 (1.4x).
  insert into public.accounts (client_id, platform, external_id, alert) values (c, 'google', 'test-1', 'cpa') returning id into a1;
  insert into public.accounts (client_id, platform, external_id, alert) values (c, 'google', 'test-2', 'cpa') returning id into a2;
  insert into public.accounts (client_id, platform, external_id, alert) values (c, 'google', 'test-3', 'roas') returning id into a3;
  insert into public.ad_daily (account_id, date, spend, conversions, conv_value)
    select a, y - g, 500, 10, 2500 from unnest(array[a1, a2, a3]) a, generate_series(1, 60) g;
  insert into public.ad_daily (account_id, date, spend, conversions, conv_value) values
    (a1, y, 210, 3, 0),    -- CPA 70 with 3 conversions: flag
    (a2, y, 140, 2, 0),    -- CPA 70 with only 2 conversions: no flag
    (a3, y, 100, 4, 300);  -- ROAS 3.0 against 5.0 (0.6x): flag
  assert (select count(*) from public.alerts_on(y) where account_id = a1) = 1, 'CPA 1.4x with 3 conversions should flag';
  assert (select count(*) from public.alerts_on(y) where account_id = a2) = 0, 'only 2 conversions should not flag';
  assert (select count(*) from public.alerts_on(y) where account_id = a3) = 1, 'ROAS 0.6x should flag';
  assert (select round(change, 2) from public.alerts_on(y) where account_id = a1) = 0.40, 'CPA change is +40%';
  -- Conditions report every tracked account, flagged or not; a ROAS floor alone makes an account tracked.
  assert (select flagged from public.conditions_on(y) where account_id = a2) = false, 'unflagged account still reported';
  insert into public.accounts (client_id, platform, external_id, roas_floor) values (c, 'google', 'test-5', 10) returning id into a4;
  insert into public.ad_daily (account_id, date, spend, conversions, conv_value)
    select a4, y - g, 100, 5, 1200 from generate_series(0, 60) g;
  assert (select round(base_metric, 1) from public.conditions_on(y) where account_id = a4 and not flagged) = 12.0, 'floor-only account tracked at 12x';

  -- Pacing: A$1,000 over the first 10 days of October projects A$3,100 for the month.
  insert into public.accounts (client_id, platform, external_id) values (c, 'meta', 'test-6') returning id into a4;
  insert into public.ad_daily (account_id, date, spend) select a4, date '2026-10-01' + g, 100 from generate_series(0, 9) g;
  insert into public.plans (client_id, month, budgets) values (c, date '2026-10-01', '{"meta": 3100}') returning id into p;
  assert (select count(*) from public.plan_pacing where plan_id = p and platform = 'meta'
          and budget = 3100 and spend_mtd = 1000 and projected = 3100) = 1, 'pacing projects A$3,100';
end $$;
rollback;
select 'all logic checks passed' as result;
