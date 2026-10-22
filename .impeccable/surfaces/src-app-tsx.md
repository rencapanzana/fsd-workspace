---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Today.tsx"]
---

## Scope

Whole app (shell, Today, Board, task dialog, clients, plans, time). Mode: operate. Redesign 22 Oct 2026: the user rejected "Between the Flags" once built (colours, fonts, layout and theme) and chose Job Docket from full-fidelity mockups.

## Audience and job

The agency lead approves or sends back work from a phone or a laptop in under a minute. The account manager actions approved work, clears overdue items and reads each account against its own target.

## Constraints

Public repo: no client data in source or committed captures. WCAG 2.2 AA in light and dark. Standard web controls only.

## Direction contract

THESIS: Every task is a job docket that cannot go live until the right initials are in its box. Refuses the grey sidebar, white cards and one indigo accent of the category, and the beach theme it replaced.

OWN-WORLD: Carbonless copy stock. Carbon-blue ink and rail (#1f2b5c), white dockets on a cool grey ground, canary for waiting for initials, pink for on hold, blue for in progress, a red rubber stamp for Approved and for overdue. Work Sans throughout; tracked small caps for labels; square corners; hairline rules and a dashed rule under each docket number.

STORY: The lead sees dockets waiting for initials and approves or returns each in seconds. The account manager sees what came back, what is stamped and ready to go live, what is late, and the checks on every account.

FIRST VIEWPORT: Navy rail (wordmark, "Traffic", nav, grouped clients with open counts). Top bar on the ground: date, Sydney and Manila clocks, search, red "+ New docket". Main: "Traffic sheet" at 44px with the counts; "Waiting for sign-off" as a 3-column grid of dockets, each with Built / Sent / Approved initials boxes and Approve / Send back; below, white panels for Sent back, Approved, Overdue, This week, Coming up; right 320px Account checks panel.

FORM: Pre-web agency job docket and traffic sheet; user-pinned from the first hand's pick card after a full-fidelity mockup comparison. seed:761d62b836cb7054
SIGNATURE: Approve fills the last initials box and the red APPROVED stamp presses onto the docket (220ms scale-in); reduced motion shows it instantly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
