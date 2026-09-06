# Assessment of the research, and what changed

30 simulated personas, five cohorts, 3,160 lines of findings, 141 screenshots.
This is the triage: what converged, what was accepted, what was refused, and
why. The refusals are the more useful half — they are the design argument
written down.

**These were simulated users.** They were good at exactly what synthetic review
is good at: craft defects, logic holes, contradictions between what the code
does and what the copy claims. They cannot tell us whether a real person opens
this on day four. That question is still open.

---

## What converged

Six findings arrived independently from three or more cohorts, or were severe
enough to stand alone. Every one was reproduced before being accepted.

### 1. Done and struck were the same object · C5, C2, C4

`renderLedger()` ruled through any item that was not `live`. Verified: three
items marked **Done**, nothing struck, three red strikes. The closed panel read
*"3 done, 0 struck"* directly above three entries scored out in correction red.
A finished week and a collapsed week rendered identically, and in the
accessibility tree a completed item was byte-identical to an untouched one.

The product's whole claim is that the record of what you struck stays as
legible as what you kept. Its own ledger contradicted that.

**Fixed.** Three states, three marks: done takes a tick and no correction mark
(nothing was corrected); struck takes the red rule; kept takes a blue margin
rule against a named person. Each row also states its condition in words, so
the distinction survives colour blindness and a screen reader.

### 2. The deferral counter counted clicks, not days · C1

`Not today` advanced immediately, so a persona reached the three-deferral
confrontation **90 seconds after first seeing the task**, having dodged it three
times in one sitting. The verdict then announced *"You have deferred this three
times and named nobody"* — a pattern of avoidance that had not happened. The
model was handed a fabricated premise and asked to judge it.

The screen is called Today. The button says Not today. Both were false.

**Fixed.** An item can be deferred at most once per calendar day. Three
deferrals now means three days, so the confrontation is earned and the verdict
is true. Done still advances immediately — a single sitting can clear as much
as you like; you just cannot dodge the same thing twice before tomorrow. When
everything open has been deferred, Today says so and names how many threads are
waiting.

### 3. The confrontation was escapable, and escaping it recorded the lenient
outcome · C2, C3

`confront()` painted the screen and committed nothing. Verified: at the
confrontation, reload — the verdict vanishes, Done / Not today return, and the
ledger now reads **"Kept — blocked on someone"**, a claim the user never made.
A fourth deferral then went through (`deferrals: 4`, state still `live`).

The one moment the product exists to create had a third option, and it was F5.

**Fixed.** The confrontation is committed to storage before the model is
called, so a reload resumes it. `kept` is an explicit state rather than
something inferred from a deferral count, and **Keep now costs a name** —
"carried" is the strongest word in the ledger and it was the cheapest to earn.

### 4. Silent data loss on every interaction · C3

v2's audit made `write()` report failure and checked it at cycle close. It did
not check the one that runs on *every* Done and *every* deferral. Verified: five
call sites discarding the boolean. Under quota the ledger showed work that
storage had refused, and a reload erased the session.

The comment above `write()` says callers must check it. The busiest caller
didn't.

**Fixed.** `saveCycle()` checks and raises a banner. The dump screen now
refuses to start a cycle it cannot store, rather than losing it after twelve
forced choices.

### 5. The ledger was not below the fold · C5, C4

`min-height: 42dvh` is a floor, not a screen. Verified at 1280×900: the ledger
began at y=466 and the page did not scroll — every item visible at once. The
"one thing on an otherwise empty page" proposition did not exist on a normal
desktop, which gives away the entire payoff of the ordering ritual.

**Fixed.** The action owns the viewport; the ledger is reached by scrolling.

### 6. Deferral history was wiped at every cycle boundary · C2

Carried items were pre-filled as text, re-extracted, and came back with
`deferrals: []`. Anything could dodge the three-deferral wall forever by riding
the boundary.

**Fixed.** The carry now takes the history with it, matched on the action text,
and the pre-filled dump says so.

---

## Also fixed

- **A fabricated verdict was presented with real authority** (C3). On any
  non-401 failure the canned sentence rendered in the same type as a real
  judgement, always recommending strike, and was written into `struckReason`
  forever. It is now labelled as a default, and the ledger records that the
  model was never reached.
- **An empty extraction was called a failure** (C3). The prompt tells the model
  to return `[]` when there are no obligations; the app called that broken and
  then invented commitments from the text. `[]` and unparseable are now
  different answers.
- **Double-clicking Done skipped the next item** (C3). The guard is now scoped
  to the button rather than to a time window.
- **The consequence was collected and never shown** (C2, C3). The model's
  headline output — the evidence for the order — now sits under the action.
- **Deferral reasons were write-only** (C2). The ledger gives them back.
- **`--ink-dim` failed AA at 4.22:1** and control borders sat at 1.14–1.58:1
  (C4). Now 5.24:1 and 3.03:1.
- **Focus never moved on a screen change; no headings; no landmarks** (C4).
  Each screen has a focusable heading that takes focus on arrival.
- **The strike vanished on wrapped titles** (C5) — a positioned pseudo-element
  collapsing to a stub on line two. It is a real `line-through` now, and it
  survives the wrap.
- **Strike and Keep were 8px apart** (C4). A real gap, destructive still first
  because the bias toward striking is the design.
- **No dark mode** (C5), for a tool whose ritual runs at both ends of a day.
- **The progress counter overstated by up to 28%** (C3, C4). It states a
  ceiling now, and says so.
- **A mis-tap on "Not today" had no exit** that didn't write a false reason
  (C2). It has one.

---

## Refused, and why

~60 feature requests came back. Most were declined, on two tests.

### Rejected because they make a decision easier to overturn

This is a committer. Anything that lowers the cost of reversing yesterday's
call is refused however many personas want it — the number wanting it measures
the strength of the pull, which is exactly what the design is built to resist.

| Request | From | Why not |
|---|---|---|
| Back / undo on the pairwise screen | C1, C4 | This is the mechanism. Reversing here is the behaviour the tool exists to prevent. |
| Undo a strike | C4 | Striking must cost something. The real concern — an 8px mis-aim killing a commitment — is answered by separating the buttons, not by making the strike cheap. |
| Edit an item after extraction | C1 | An editable list is a list you re-rank. |
| A list view before ranking | C1 | Seeing the whole set is what makes re-sorting tempting. |
| A route back to Dump mid-cycle | C1 | One live cycle, one direction. |
| A settings page | C1 | One setting, and it lives on the key screen. The real gap — no way to replace a key rejected mid-cycle — is a bug, logged below, not an argument for a settings screen. |

### Accepted although they looked like the above

- **Resumable ordering** (C1, C2, C3, C4 — the single most-requested item) is
  *crash safety*, not reversal. Losing 65 answered comparisons to a stray
  browser gesture is data loss. **Not built in this version** — it needs the
  comparison log persisted and replayed as a memoised comparator — and it is
  now the top of the backlog rather than a documented shrug.

### Deferred with reasons

- A mid-cycle path to replace a rejected key (C3). Real dead end; needs a
  route to the key screen that does not become a settings page.
- Date and settlement columns in the ledger (C5, Noor).
- Animating the strike (C5, Tomas) — the most consequential click in the
  product is currently witnessed by nobody.
- A condensed fallback stack with `size-adjust` (C5) so a blocked webfont does
  not cost the entire typographic idea.
- `1` / `2` keys on the ordering screen (C4).

---

## What the research could not tell us

Nobody here used this for a week. Every finding above is about whether the
object is well made and whether it says true things — not whether the ritual
holds. The one test that matters is still the one in the definition of done:
a real dump of a real week, and a Screen 3 that lands on something you would
have quietly skipped.
