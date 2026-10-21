-- FSD WorkSpace core schema.
-- Internal tool: any signed-in FSD staff member (profiles.role set) can read and write everything.
-- New auth users get role = null and see nothing until an admin sets their role, so the data stays
-- locked even if public signups are switched on by mistake.

-- Helpers and trigger functions live in `private`, which the Data API does not expose.
create schema private;
grant usage on schema private to authenticated;

-- Future tables and functions start closed to logged-out visitors too.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- People ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role text check (role in ('admin', 'team')),
  created_at timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
grant usage on schema private to supabase_auth_admin;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role is not null);
$$;

-- Clients -----------------------------------------------------------------
-- Client groups are rows too; their brands point at them via parent_id.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 120),
  parent_id uuid references public.clients (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'setup', 'prospect', 'paused', 'ended')),
  priority text check (char_length(priority) <= 40),
  services text[] not null default '{}',
  key_metric text check (char_length(key_metric) <= 300),
  budget text check (char_length(budget) <= 1000),
  reporting text check (char_length(reporting) <= 500),
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),
  website text check (char_length(website) <= 300),
  notes text not null default '' check (char_length(notes) <= 20000),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  role text check (char_length(role) <= 200),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 60),
  preferred_channel text check (char_length(preferred_channel) <= 60),
  is_primary boolean not null default false,
  notes text check (char_length(notes) <= 2000)
);
create index on public.contacts (client_id);

-- Ad accounts, pixels, pages, catalogs, analytics properties.
-- Only platform in (meta, google) + kind = ad_account rows are synced for live data (phase 5).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google', 'bing', 'openai', 'tiktok', 'ga4', 'gbp', 'se_rankings', 'shopify', 'other')),
  kind text not null default 'ad_account' check (kind in ('ad_account', 'pixel', 'page', 'catalog', 'property', 'other')),
  external_id text not null check (char_length(external_id) between 1 and 120),
  label text check (char_length(label) <= 200),
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),
  conversion_event text check (char_length(conversion_event) <= 100),
  alert text check (alert in ('cpa', 'roas')),
  roas_floor numeric check (roas_floor > 0),
  last_synced_at timestamptz,
  last_sync_error text,
  notes text check (char_length(notes) <= 2000)
);
create index on public.accounts (client_id);

-- Tasks -------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  ref integer generated always as identity unique,
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '' check (char_length(description) <= 20000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'approved', 'on_hold', 'done')),
  type text not null default 'admin' check (type in ('meta', 'google', 'bing_openai', 'tiktok', 'seo', 'website', 'creative', 'report', 'qa', 'admin')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  from_client boolean not null default false,
  due_date date,
  brief_url text check (char_length(brief_url) <= 1000),
  ads text not null default '' check (char_length(ads) <= 10000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (client_id);
create index on public.tasks (status);
create index on public.tasks (assignee_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index on public.comments (task_id);

-- Every status change, including who made it. This is the sign-off record, so only the trigger writes it.
create table public.task_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);
create index on public.task_events (task_id);

create function private.tasks_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status is distinct from 'done' then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  return new;
end $$;
create trigger tasks_touch before update on public.tasks for each row execute function private.tasks_touch();

create function private.tasks_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.task_events (task_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return null;
end $$;
create trigger tasks_log after insert or update of status on public.tasks for each row execute function private.tasks_log();

-- Row level security ------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.accounts enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.task_events enable row level security;

create policy "staff read, self read" on public.profiles for select to authenticated
  using ((select private.is_staff()) or id = (select auth.uid()));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "staff" on public.clients for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff" on public.contacts for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff" on public.accounts for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff" on public.tasks for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff read" on public.comments for select to authenticated using ((select private.is_staff()));
create policy "staff write" on public.comments for insert to authenticated with check ((select private.is_staff()) and author_id = (select auth.uid()));
create policy "own edit" on public.comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "own delete" on public.comments for delete to authenticated using (author_id = (select auth.uid()));
create policy "staff read" on public.task_events for select to authenticated using ((select private.is_staff()));

-- Logged-out visitors get nothing (RLS already blocks them; this is the second lock).
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema private from public;
grant execute on function private.is_staff() to authenticated;

-- People can rename themselves but never change their own role.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- History is written by the trigger only.
revoke insert, update, delete on public.task_events from authenticated;
