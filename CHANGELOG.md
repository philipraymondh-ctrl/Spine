# Changelog

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
