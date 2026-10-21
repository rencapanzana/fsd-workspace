# FSD WorkSpace

Internal operations app for Francis Street Digital: client hub, task board with sign-off (Review → Approved), Today view, recurring reports, time tracking, monthly plans with scope, and nightly Meta and Google numbers with CPA/ROAS alerts.

Static React app on GitHub Pages. Data, logins and scheduled jobs in Supabase.

**This repo is public.** Client names, contacts, account IDs and secrets live only in Supabase. Never commit them. `supabase/seed.sql` (the client data) is gitignored on purpose.

## Stack

- Vite, React, TypeScript, Tailwind CSS v4. Native `<dialog>`, `<select>` and date inputs, HTML5 drag and drop.
- Supabase: Postgres with row level security, Auth (email and password), Edge Functions, pg_cron, pg_net, Vault.
- GitHub Pages, built by `.github/workflows/deploy.yml` on every push to `main` (tests run first).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/fsd-workspace/
npm test         # Slack copy, checklist and CSV rules
npm run build    # type-check + production build (adds the CSP meta tag)
```

Database rules are tested in SQL: run `supabase/tests/logic.sql` in the Supabase SQL editor. It rolls back everything it creates.

## Database

Apply `supabase/migrations/0001` to `0005` in order (Supabase MCP `apply_migration` or the SQL editor), then the private seed.

- Every table has RLS. Anyone signed in **with a role** (`admin` or `team` in `profiles`) can read and write. New accounts get no role, so they see nothing until an admin sets one.
- `task_events` is written by a trigger only: it is the sign-off history (who moved what, when).
- `conditions_on(day)` holds the alert rule: yesterday against the 60 days before, sum over sum, CPA +30% or ROAS −30%, at least 3 conversions yesterday. `alerts` and the Today conditions column both read from it.
- `create_recurring_tasks()` runs daily at 06:00 Sydney (19:00 UTC) and creates each recurring task `lead_days` before it is due. A unique index stops duplicates.

## People

1. Supabase dashboard, **Authentication > Sign In / Providers**: turn off "Allow new users to sign up".
2. **Authentication > Users > Add user > Create new user**, tick auto-confirm, set a password.
3. Give the person a role in the SQL editor:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Full Name'
   where id = (select id from auth.users where email = 'person@example.com');
   ```
   Use `'team'` for everyone except whoever signs work off. People change their own name and password from the menu at the bottom of the sidebar.

## Live ad data

**Meta** (`supabase/functions/meta-sync`) runs daily at 06:30 Sydney via pg_cron.

1. In FSD's Business Manager, create a system user with `ads_read`, assign it every client ad account (including partner-shared ones) and generate a token.
2. Supabase dashboard > **Edge Functions > Secrets**: add `META_ACCESS_TOKEN`.
3. Load 60 days of history once, from the SQL editor:
   ```sql
   select net.http_post(
     url := 'https://ojmkekoxupjebwixhgil.supabase.co/functions/v1/meta-sync?backfill=60',
     headers := jsonb_build_object('Content-Type', 'application/json',
       'x-ingest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret')),
     body := '{}'::jsonb, timeout_milliseconds := 120000);
   ```
4. Each Meta ad account needs its `conversion_event` set on the client page (`lead` for lead-gen, `omni_purchase` for e-commerce).

**Google** needs no developer token. `scripts/google-ads-sync.js` is a Google Ads Script.

1. Get the shared secret: `select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret';`
2. Paste the script into Google Ads (**Tools > Bulk actions > Scripts**) in the MCC, and once more in any standalone account. Replace `PASTE_INGEST_SECRET`.
3. First run with `BACKFILL_DAYS = 60`, then set it to `0` and schedule it daily.

Sync problems show in plain words on each client page (for example "Waiting for the Meta access token"). The raw errors are in the Edge Function logs.

## Free-tier note

Supabase pauses free projects after 7 days with no activity. The daily sync and normal use keep it awake. If it ever pauses, restore it from the dashboard, or move to Pro.
