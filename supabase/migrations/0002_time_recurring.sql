-- Time tracking and recurring tasks (reports, weekly reviews).

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete set null,
  date date not null default current_date,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index on public.time_entries (date);
create index on public.time_entries (client_id);
create index on public.time_entries (task_id);

-- One running timer per person.
create table public.timers (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  started_at timestamptz not null default now()
);

create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  type text not null default 'report' check (type in ('meta', 'google', 'bing_openai', 'tiktok', 'seo', 'website', 'creative', 'report', 'qa', 'admin')),
  assignee_id uuid references public.profiles (id) on delete set null,
  cadence text not null check (cadence in ('weekly', 'fortnightly', 'monthly')),
  day integer check (day between 1 and 31), -- monthly anchor; weekly and fortnightly repeat from next_due
  lead_days integer not null default 3 check (lead_days between 0 and 30),
  template text not null default '' check (char_length(template) <= 5000),
  next_due date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (cadence <> 'monthly' or day is not null)
);
create index on public.recurring (client_id);

alter table public.tasks add column recurring_id uuid references public.recurring (id) on delete set null;
-- A recurring item makes at most one task per due date, however often the job runs.
create unique index tasks_recurring_once on public.tasks (recurring_id, due_date) where recurring_id is not null;

-- Next due date. Monthly keeps its anchor day, clamped to short months (the 31st lands on 28/29/30 and returns to 31).
create function private.recurring_advance(cadence text, anchor integer, from_date date) returns date
language sql immutable set search_path = '' as $$
  select case cadence
    when 'weekly' then from_date + 7
    when 'fortnightly' then from_date + 14
    else (
      select make_date(extract(year from m)::integer, extract(month from m)::integer,
                       least(anchor, extract(day from (m + interval '1 month - 1 day'))::integer))
      from (select (date_trunc('month', from_date) + interval '1 month')::date as m) n
    )
  end;
$$;

create function private.create_recurring_tasks() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.recurring;
  made integer := 0;
  n integer;
  today date := (now() at time zone 'Australia/Sydney')::date;
begin
  for r in select * from public.recurring where active and next_due - lead_days <= today for update loop
    while r.next_due - r.lead_days <= today loop
      insert into public.tasks (client_id, title, description, type, assignee_id, due_date, recurring_id, created_by)
      values (r.client_id, r.title, r.template, r.type, r.assignee_id, r.next_due, r.id, null)
      on conflict do nothing;
      get diagnostics n = row_count;
      made := made + n;
      r.next_due := private.recurring_advance(r.cadence, r.day, r.next_due);
    end loop;
    update public.recurring set next_due = r.next_due where id = r.id;
  end loop;
  return made;
end $$;
revoke execute on all functions in schema private from public;
grant execute on function private.is_staff() to authenticated;

alter table public.time_entries enable row level security;
alter table public.timers enable row level security;
alter table public.recurring enable row level security;

create policy "staff read" on public.time_entries for select to authenticated using ((select private.is_staff()));
create policy "log own" on public.time_entries for insert to authenticated with check ((select private.is_staff()) and user_id = (select auth.uid()));
create policy "edit own" on public.time_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own" on public.time_entries for delete to authenticated using (user_id = (select auth.uid()));
create policy "own timer" on public.timers for all to authenticated
  using ((select private.is_staff()) and user_id = (select auth.uid())) with check ((select private.is_staff()) and user_id = (select auth.uid()));
create policy "staff" on public.recurring for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

-- Daily at 06:00 Sydney summer time (19:00 UTC).
create extension if not exists pg_cron;
select cron.schedule('fsd-recurring-tasks', '0 19 * * *', $$select private.create_recurring_tasks()$$);
