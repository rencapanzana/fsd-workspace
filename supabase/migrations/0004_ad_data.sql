-- Live ad data (Meta + Google, account level, daily), the CPA/ROAS alert rule, and plan pacing.

create table public.ad_daily (
  account_id uuid not null references public.accounts (id) on delete cascade,
  date date not null,
  spend numeric(12, 2) not null default 0,
  conversions numeric(12, 2) not null default 0,
  conv_value numeric(14, 2) not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  primary key (account_id, date)
);
alter table public.ad_daily enable row level security;
create policy "staff read" on public.ad_daily for select to authenticated using ((select private.is_staff()));
-- Written only by the sync Edge Functions (service role).
revoke insert, update, delete on public.ad_daily from authenticated;

-- FSD's alert rule: yesterday vs the 60 days before it, sum over sum, minimum 3 conversions yesterday.
-- CPA flags at more than 30% above average; ROAS flags at more than 30% below.
create function public.alerts_on(on_day date)
returns table (
  account_id uuid, client_id uuid, platform text, alert text,
  y_spend numeric, y_conv numeric, base_conv numeric, y_metric numeric, base_metric numeric, change numeric
)
language sql stable set search_path = '' as $$
  with agg as (
    select a.id as account_id, a.client_id, a.platform, a.alert,
      sum(d.spend) filter (where d.date = on_day) as y_spend,
      sum(d.conversions) filter (where d.date = on_day) as y_conv,
      sum(d.conv_value) filter (where d.date = on_day) as y_value,
      sum(d.spend) filter (where d.date < on_day) as b_spend,
      sum(d.conversions) filter (where d.date < on_day) as b_conv,
      sum(d.conv_value) filter (where d.date < on_day) as b_value
    from public.accounts a
    join public.ad_daily d on d.account_id = a.id and d.date between on_day - 60 and on_day
    where a.alert is not null
    group by a.id, a.client_id, a.platform, a.alert
  ), m as (
    select agg.*,
      case when alert = 'cpa' then y_spend / nullif(y_conv, 0) else y_value / nullif(y_spend, 0) end as y_metric,
      case when alert = 'cpa' then b_spend / nullif(b_conv, 0) else b_value / nullif(b_spend, 0) end as base_metric
    from agg
  )
  select account_id, client_id, platform, alert, y_spend, y_conv, b_conv, y_metric, base_metric, y_metric / base_metric - 1
  from m
  where y_conv >= 3 and base_metric > 0 and y_metric is not null
    and ((alert = 'cpa' and y_metric > 1.3 * base_metric) or (alert = 'roas' and y_metric < 0.7 * base_metric));
$$;
grant execute on function public.alerts_on(date) to authenticated;

create view public.alerts with (security_invoker = true) as
  select * from public.alerts_on((now() at time zone 'Australia/Sydney')::date - 1);

-- Budget per platform against month-to-date spend, with a straight-line month-end projection.
create view public.plan_pacing with (security_invoker = true) as
  select p.id as plan_id, b.key as platform, b.value::numeric as budget,
    coalesce(sum(d.spend), 0) as spend_mtd,
    max(d.date) as data_through,
    case when max(d.date) is null then null
      else round(sum(d.spend) / extract(day from max(d.date)) * extract(day from (p.month + interval '1 month - 1 day')), 2)
    end as projected
  from public.plans p
  cross join lateral jsonb_each_text(p.budgets) b
  left join public.accounts a on a.client_id = p.client_id and a.platform = b.key and a.kind = 'ad_account'
  left join public.ad_daily d on d.account_id = a.id and d.date >= p.month and d.date < p.month + interval '1 month'
  group by p.id, p.month, b.key, b.value;

-- One shared secret for machine callers (the daily cron and the Google Ads script). Generated here, never in the repo.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ingest_secret',
  'x-ingest-secret for meta-sync (cron) and google-ingest (Google Ads script)');

create function public.check_ingest_secret(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'ingest_secret' and decrypted_secret = candidate);
$$;
revoke execute on function public.check_ingest_secret(text) from public, anon, authenticated;
grant execute on function public.check_ingest_secret(text) to service_role;

-- Daily Meta pull at 06:30 Sydney summer time.
create extension if not exists pg_net with schema extensions;
select cron.schedule('fsd-meta-sync', '30 19 * * *', $$
  select net.http_post(
    url := 'https://ojmkekoxupjebwixhgil.supabase.co/functions/v1/meta-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-ingest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
$$);
