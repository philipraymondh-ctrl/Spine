# Decisions

Why the code differs from a plain reading of the build spec. One entry per
departure, with the evidence that forced it.

---

## The cursor wraps over open items

**Spec said:** *"Appends to `deferrals`, cursor advances"*, and separately
*"on the third deferral of the same item, do not advance."*

**Problem:** those two cannot both hold. If the cursor advances on every Done
*and* every Not today, each item is seen exactly once per cycle, so no item can
accumulate more than **one** deferral. Exhaustive walk of a 3-item cycle:

```
max deferrals any item can reach in one cycle: 1
third-deferral rule reachable: false
```

The second escape hatch also fails: closing a cycle pre-fills carried items *as
text*, which goes back through extraction and produces new items with empty
`deferrals` arrays. History does not survive a cycle boundary either.

So `deferrals.length === 3` was unreachable and model call 2 would never have
been made — the mechanism the spec calls "the rule that makes it work".

**Decision:** the cursor wraps. `nextOpen()` skips items that are done, struck,
or parked, and comes back around to whatever is still open.

**Consequences, all deliberate:**

- The third deferral is reachable, and a cycle is bounded at three passes.
- **"Carried" now means "blocked on a person"** and nothing else — the only way
  an item survives a cycle is to reach the confrontation and be kept.
- No schema change. An item is parked when it is still `live` with three
  deferrals; the only path to that state is choosing Keep.

Reverting to the strict linear walk is a one-line change to `advance()`.

---

## `max_tokens` is 4000 on extraction, not 1000

**Spec said:** `max_tokens: 1000` for the single model call path.

**Problem:** call 1 must emit a JSON array where every element carries a title,
an action, a blockedOn *and* a full consequence sentence. A real week is 10–15
items — comfortably 1500–2500 output tokens. At 1000 the array truncates
mid-element, `JSON.parse` throws, the newline fallback fires, and the banner
blames extraction while the model was working correctly. The one load-bearing
model step would fail closed on the first real dump.

**Decision:** 4000 on extraction. Call 2 stays at 1000 — its output is two
sentences and a verdict field.

---

## Model is `claude-sonnet-5`

**Spec said:** `claude-sonnet-4-6`.

That model is real and would work, but it is the previous-generation Sonnet.
`claude-sonnet-5` is current at the same price tier and better at exactly this
task — extracting discrete obligations with a consequence field out of messy
prose. Same request shape; a one-line revert.

---

## Ordering progress counts against a ceiling

**Spec said:** *"Show progress as 4 of 11 choices."*

Merge sort's comparison count is data-dependent — there is no fixed total to
count against. The denominator shown is the worst case,
`n⌈log₂n⌉ − 2^⌈log₂n⌉ + 1`, so the walk can finish early but never overruns the
number on screen. Five items shows "1 of 8 choices" and typically settles in
five or six.
