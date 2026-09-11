# Changelog

## v3.2.0 — the strike is witnessed

The 30-persona study said the strike — the most consequential and irreversible
click in the product — was "witnessed by nobody". The literal reason turned out
not to be the absence of animation: **the ledger sits below the fold, so the
row you just killed changed off-screen.**

- The struck row **scrolls into view**, then its correction rule lands:
  `text-decoration-color` transparent → `--warn` and the tilt arriving over
  320ms. Drawn as a decoration rather than a pseudo-element bar, so it still
  survives a wrapped title.
- The reason row **enters** instead of teleporting into the space two buttons
  just vacated — 180ms, opacity and 4px.
- The confrontation's wait **breathes** on the rule, not the text. Up to 45
  seconds of static type at the moment you are braced for a judgement reads as
  a crash. Never a spinner: that implies progress nobody can measure.
- `prefers-reduced-motion` previously guarded nothing, and would have hard
  killed the strike the moment motion existed. It now **reduces rather than
  removes** — the rotation and the pulse go, the colour landing stays at 120ms.
  A struck commitment must still register.

Deliberately left still, and asserted in tests so it stays that way: the
pairwise cards (twelve clicks in a burst — animating them would compound twelve
times), screen swaps, ledger row entrances, banner entrances, and any flourish
on cycle close, which would reward volume the product explicitly refuses to
count.

Suite: 156 checks, up from 138.

## v3.1.0 — adding to a live spine

A week is long and obligations arrive mid-cycle. Until now they had nowhere to
go until the next reset, which meant keeping a shadow list — and a shadow list
defeats the tool completely.

**Something new** on Today reuses the dump screen, then places the newcomer by
binary search against the live spine: ~4 questions for 12 items rather than 12.
The invariant holds exactly — no pair that has already been decided is ever
re-asked, no existing item changes position relative to any other, and today's
action does not change under your hands.

Rejected alternatives, for the record: appending at the bottom always (an
urgent newcomer sits under everything and you resent it), and re-ranking the
whole cycle (which is the thing this refuses).

Also: an exit from the add screen, so changing your mind is possible.

Suite: 138 checks, up from 120.

## v3.0.0 — 30-user research

Five cohorts of six simulated personas drove the real app in a real browser.
Full triage, including the refusals, in `research/ASSESSMENT.md`.

Six things were badly wrong, and each was reproduced before being fixed:

- **Done and struck rendered identically.** A finished week and a collapsed one
  were the same page, and the closed panel said "3 done, 0 struck" above three
  entries scored out in red. Three states now carry three marks, each also
  stated in words.
- **Deferrals counted clicks, not days**, so the confrontation could fire 90
  seconds after first sight and the verdict announced a pattern of avoidance
  that never happened. One deferral per item per day.
- **The confrontation was escapable by reload**, and escaping it silently
  recorded "Kept — blocked on someone". It is now committed before the model
  call, `kept` is an explicit state, and Keep costs a name.
- **Every Done and every deferral discarded the storage result.** v2 checked
  the once-per-cycle write and left the once-per-click one unchecked.
- **The ledger was never below the fold** at desktop sizes, giving away the
  ordering ritual's entire payoff.
- **Deferral history was wiped at every cycle boundary**, so anything could
  dodge the wall forever by riding a reset.

Also: fabricated verdicts are labelled as defaults rather than impersonating a
judgement; an empty extraction is an answer rather than a failure with invented
commitments; the consequence and the user's own deferral reasons are shown
instead of collected and buried; contrast raised to AA and control borders to
3:1; focus moves to a real heading on every screen; the strike survives a
wrapped title; dark mode; an honest progress ceiling; and a way out of the
reason row.

Refused on principle: undo on the pairwise screen, undo on a strike, item
editing, a pre-ranking list view, a settings page. Accepted but not yet built:
resumable ordering — the most-requested item, and crash safety rather than
reversal.

Suite: 120 checks, up from 82.

## v2.0.0 — audit fixes

Findings and reasoning in `docs/AUDIT.md`. Seven fixes, three of them
protecting data or the flow itself.

- **Closing a cycle can no longer destroy it.** A failed archive write used to
  delete the cycle anyway. It now rolls back, leaves the cycle open and says so.
- **Both model calls are on a clock** (90s / 45s). A hung connection used to
  strand the flow with no way out but reload — the spec required a timeout and
  v1 had none.
- **A rejected API key says so** instead of masquerading as a failed
  extraction. The key is cleared, the key screen returns, the dump survives.
- **Confrontation buttons hold their position.** They used to swap by
  recommendation; the recommendation is now a line of text instead.
- **A double-tapped reason counts once.**
- **Fence-stripping no longer eats backticks inside the content.**
- **Screen 3 announces the current action** to assistive tech.

Accepted and documented rather than fixed: reloading mid-sort restarts the
ordering, and the archive still grows without bound.

Suite: 82 checks, up from 60.

## v1.0.0 — first version

Three screens, one model call path, the ledger. Two departures from the build
spec recorded in `docs/DECISIONS.md`: the cursor wraps over open items (without
which the third-deferral rule is unreachable), and extraction gets 4000
`max_tokens` rather than 1000.
