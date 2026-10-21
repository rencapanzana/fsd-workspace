-- Monthly plans per client, checked against contracted scope (deliverables per task type per month).

create table public.scope_quotas (
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('meta', 'google', 'bing_openai', 'tiktok', 'seo', 'website', 'creative', 'report', 'qa', 'admin')),
  monthly_quota integer not null check (monthly_quota between 0 and 999),
  primary key (client_id, type)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved')),
  budgets jsonb not null default '{}' check (jsonb_typeof(budgets) = 'object'), -- {"meta": 15000, "google": 30000}, monthly A$
  notes text not null default '' check (char_length(notes) <= 20000),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);

-- Who approved is stamped by the database, never sent by the browser.
create function private.plans_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif new.status <> 'approved' then
    new.approved_by := null;
    new.approved_at := null;
  end if;
  return new;
end $$;
create trigger plans_touch before update on public.plans for each row execute function private.plans_touch();
revoke execute on all functions in schema private from public;
grant execute on function private.is_staff() to authenticated;

-- Plan activities are ordinary tasks, so the board, time and history stay in one place.
alter table public.tasks add column plan_id uuid references public.plans (id) on delete set null;
create index on public.tasks (plan_id);

alter table public.comments add column plan_id uuid references public.plans (id) on delete cascade;
alter table public.comments add constraint comments_one_target check (num_nonnulls(task_id, plan_id) = 1);
create index on public.comments (plan_id);

alter table public.scope_quotas enable row level security;
alter table public.plans enable row level security;
create policy "staff" on public.scope_quotas for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff" on public.plans for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
