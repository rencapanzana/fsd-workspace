---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Today.tsx"]
---

## Scope

App shell and Today, the first surface. Mode: operate. Board, client hub, plans and time inherit this world.

## Audience and job

The agency lead approves or sends back work from a phone or a laptop in under a minute. The account manager actions approved work, clears overdue items and reads each account against its own target.

## Constraints

Public repo: no client data in source or committed captures. Must not resemble the reference tool it was modelled on. WCAG 2.2 AA in light and dark. Standard web controls only.

## Direction contract

THESIS: Nothing goes live outside the flags. Approval is the red-over-yellow patrol flag and every account reads like the morning surf report against its own target. Refuses the grey sidebar, white cards, one indigo accent and KPI tiles.

OWN-WORLD: Ocean-teal rail with white type, patrol-board white work surface on a cool sea-salt ground, deep-water ink. Flag red and flag yellow reserved for the flag mark and hazard states. Flat colour only; depth from 1px rules and solid fills. Sofia Sans for UI, Sofia Sans Extra Condensed caps for headings and the wordmark; three sizes in the shell; tabular figures. Status marks are shapes: empty pole waiting, raised flag approved, hazard diamond overdue or alert.

STORY: The lead sees what is waiting for the flags and raises or returns each one in seconds. The account manager sees what came back, what is cleared to action, what is late, and the conditions on every account.

FIRST VIEWPORT: 248px teal rail: wordmark with flag mark, nav, grouped client switcher with open-work bars. 52px white top bar: date, Sydney and Manila clocks, search, New task. Main: TODAY in extra-condensed caps with a one-line count; "Waiting for the flags" rows with Approve (the primary action) and Send back; then Sent back, Cleared to action, Overdue, This week. Right 380px Conditions column: rating word, yesterday vs 60-day, 30-day bars with yesterday marked. Phone: top bar with drawer; the waiting queue first, full-width Approve.

FORM: Bondi surf report and lifesaving patrol flags; grounded candidate 4 of 7, dealt on re-roll 1. seed:761d62b836cb7054
RAISED (Timetable Slides): three type sizes; rank from weight, case and rules.
RAISED (Character Catalog): every client page keeps the same furniture in the same order.
RAISED (Acetate Manual): each client in the switcher carries a bar proportional to its open work.
RAISED (Guide Map): flat colour only, no shadows, gradients or glass.
RAISED (Emission Rail): state never relies on colour alone.
SIGNATURE: Approve raises the flag: the pole mark rises into the red-over-yellow flag in 200ms and the row settles into Cleared to action. Motion only on state change; reduced motion swaps instantly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
