# Changelog

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
