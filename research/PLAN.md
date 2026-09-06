# UX / UI research plan

30 simulated personas, five cohorts of six. Each cohort owns a testing lens and
a slice of the product, so that between them every screen, every state, and
every failure path is exercised by someone whose job is to be hostile to it.

**These are simulated, not real users.** They surface craft defects, logic
holes, and comprehension traps. They cannot tell us whether a real person
returns on day four. That question stays open until Philip runs a real week.

## Coverage matrix

Every cell must be hit by at least one persona.

| Surface / state            | C1 | C2 | C3 | C4 | C5 |
|----------------------------|----|----|----|----|----|
| Key screen, first run      | ●  |    | ●  | ●  | ●  |
| Key rejected (401)         |    |    | ●  |    |    |
| Dump screen, empty         | ●  |    |    | ●  | ●  |
| Dump → extraction          | ●  | ●  | ●  |    |    |
| Extraction failure banner  |    |    | ●  | ●  |    |
| Ordering, pairwise         | ●  | ●  | ●  | ●  | ●  |
| Ordering, reload mid-sort  |    |    | ●  |    |    |
| Today, single action       | ●  | ●  |    | ●  | ●  |
| Deferral + reason row      |    | ●  | ●  | ●  |    |
| Third-deferral confront    |    | ●  | ●  | ●  |    |
| Strike + the ruled line    |    | ●  |    | ●  | ●  |
| Ledger below the fold      |    | ●  | ●  | ●  | ●  |
| Cycle close + carry        |    | ●  | ●  |    |    |
| Storage full               |    |    | ●  |    |    |
| 360px / touch              | ●  |    |    | ●  | ●  |
| Keyboard only              |    |    |    | ●  |    |
| Screen reader              |    |    |    | ●  |    |
| Zoom 200% / low vision     |    |    |    | ●  | ●  |
| Colour vision              |    |    |    | ●  | ●  |
| Dark environment           |    |    |    |    | ●  |

## Cohorts

- **C1 — First run and onboarding.** Can a cold user understand what this is
  before they understand what it is *for*?
- **C2 — The daily loop.** Days three through ten. Does the ritual hold?
- **C3 — Edge cases and failure.** Network, quota, revoked key, 1 item, 40
  items, reload at the worst moment.
- **C4 — Accessibility.** Screen reader, keyboard only, 200% zoom, colour
  vision, motor, cognitive load.
- **C5 — Visual design and craft.** Typography, the ledger metaphor, hierarchy,
  the strike as signature, dark environments, token discipline.

## What each persona returns

1. **Task outcome** — did they complete the flow, where did they stall.
2. **Findings** — severity (blocker / major / minor / polish), what they
   expected, what happened.
3. **Look and feel** — one honest reaction, not a compliment.
4. **1–2 feature requests**, each with the problem it solves.

## How the input gets assessed

Raw requests are scored on two axes and then most of them are killed:

- **Does it serve the thesis?** The product is a committer. Anything that makes
  a decision easier to overturn is rejected on principle, however popular.
- **Is it already forbidden?** Spec §7 bans order editing, calendar sync,
  multiple cycles, tags, search, archive views, streaks, a fourth screen, and a
  settings page. A persona wanting one of these is evidence about the *pull*,
  not a mandate.

A request that survives both is triaged normally. Everything else is recorded
with the reason it was declined — that record is more useful than the backlog.
