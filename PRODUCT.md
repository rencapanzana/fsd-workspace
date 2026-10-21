# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript + Tailwind CSS v4. Supabase for Postgres, Auth, row level security, Edge Functions and scheduled jobs. Hosted on GitHub Pages from a public repository. Native `<dialog>`, `<select>`, date inputs and HTML5 drag-and-drop; no component kit.

## Users

- **Agency lead.** Briefs work and signs off before anything goes live. Checks the sign-off queue, alerts and client status on a laptop and on a phone about equally, often between other work.
- **Account manager.** Builds campaigns, QAs, reports and logs time across many client accounts at once. Mostly on a laptop during focused work blocks.
- Internal only. Clients never log in. More agency staff may be added later.

## Product Purpose

An operations workspace for a small Sydney performance-marketing agency. It replaces scattered chat threads, documents and spreadsheets with one place that answers: what is waiting for sign-off, what is overdue, what each client is waiting on, how each account is performing against its own metric, and where the time went.

Success: the lead can approve or send back work in under a minute, from any device. The account manager starts each work block knowing exactly what to do next.

## Positioning

Built around the agency's own rule, "recommend first, implement after sign-off". Every task passes through Review and Approved, and the history records who signed off and when. Each client is judged by its own control metric (a ROAS floor, a rolling CPA or ROAS alert, cost per lead, new-customer acquisition cost), not by a generic dashboard.

## Operating Context

- Briefs arrive through chat messages, recorded calls and spreadsheet build sheets.
- Messages back to the lead are short chat bullets with the ad name and ad ID, and no em dashes. The app formats these.
- Recurring rituals: a weekly lead-gen creative review for a property group, monthly and fortnightly client reports, and a daily alert check (yesterday against the trailing 60 days, 30% threshold, minimum 3 conversions).
- The work itself happens in Meta Ads Manager and Google Ads. The app stores IDs and links out; it never edits ad accounts.
- Clients come in groups: one property marketer with five developments, one owner with three brands sharing an ad account, plus independents, one prospect and one setup-only engagement.
- Currency is A$ by default; one client also sells in the US.

## Capabilities and Constraints

- Task board with six statuses: To Do, In Progress, Review, Approved, On Hold, Done.
- Client hub: snapshot, account IDs with copy buttons, contacts, notes and performance.
- Monthly plans with scope quotas and budget pacing. Time tracking with CSV export. Recurring tasks. Nightly Meta and Google data with alerts.
- The repository is public: no client names, contacts or account IDs in code, docs or committed screenshots.
- It was modelled on another agency's internal tool. Reuse functional patterns only, never its look, wording or code.
- Terminology: client, group, task, sign-off, plan, scope.

## Brand Commitments

- Name: FSD WorkSpace. Agency: Francis Street Digital (FSD).
- There is no current brand system. The agency website has lapsed, and the archived site was a stock template. No logo is in use.
- Identity direction from the user: plain but not boring, and no generic AI-made look.
- Voice: direct, warm, consultative, concise. No em dashes in interface copy.

## Evidence on Hand

- Real client records live in the database only (seeded from internal client files), never in the repo.
- No testimonials, metrics or screenshots are cleared for public use. Do not fabricate any.

## Product Principles

1. Sign-off is the spine: nothing reads as finished until the lead has seen it.
2. The client is the unit of work: one click into a client's full context.
3. Every number is read against that client's own target.
4. Fast, quiet and dense: built for daily use by people who know the domain.
5. Phone-complete for the approval path, desktop-strong for the build path.

## Accessibility & Inclusion

WCAG 2.2 AA contrast in light and dark themes, every action reachable by keyboard, and reduced motion respected.
