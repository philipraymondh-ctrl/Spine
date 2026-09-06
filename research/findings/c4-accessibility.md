# C4 — Accessibility

Six simulated personas driven against the real `spine.html` in headless Chromium
via `research/lab.mjs`. Every number below is measured, not estimated: computed
styles read out of the live page, real accessibility trees, real bounding boxes,
real keyboard events.

Scripts written for this cohort (all runnable with `node research/<name>.mjs`):

| script | what it measures |
|---|---|
| `c4-esther.mjs` | `page.accessibility.snapshot()` + `ariaSnapshot()` on every screen; landmarks, headings, live regions; MutationObserver on `#today-body` |
| `c4-esther2.mjs` | ledger semantics — accessible text of done / struck / kept / deferred rows |
| `c4-esther3.mjs` | status messages (4.1.3): banner insertion, `Extracting…`, verdict wait, live-region payload size |
| `c4-esther4.mjs` | whether a live region is *rendered* at the moment it mutates (conclusive for the banner, inconclusive for same-frame render→show — see Esther finding 2) |
| `c4-paul.mjs` | keyboard-only run of the whole flow; tab tours; focus destination after every screen change |
| `c4-mira.mjs` / `c4-mira2.mjs` | reflow 1.4.10 at 1280/640/360/320 CSS px; resize-text 1.4.4; text-spacing 1.4.12 |
| `c4-gus.mjs` / `c4-gus2.mjs` | contrast of every text/background pair from computed styles; non-text contrast; Viénot deuteranopia simulation |
| `c4-hana.mjs` | bounding box of every interactive element at 1280 and 360; nearest-neighbour target gaps; mis-click recovery |
| `c4-leo.mjs` / `c4-leo2.mjs` | measured comparison counts at n = 1…40; ledger fold position; motion inventory; reload mid-sort |
| `c4-strike.mjs` | done-vs-struck ledger encoding |

Google Fonts is blocked in the sandbox; the resulting `ERR_CONNECTION_RESET`
console error is expected and is not counted as a finding. `Archivo Narrow`
therefore never loaded, so all display type fell back to `system-ui`. Contrast
numbers are unaffected; line-count numbers at extreme zoom would shift slightly
with the real font.

**Headline: nobody is completely locked out — the flow is completable with a
keyboard alone and every target is ≥44×44 — but a screen-reader user cannot tell
a completed commitment from a killed one, which destroys the one artefact the
product exists to build.**

---

## 1. Esther — screen reader

### Method

Dumped `page.accessibility.snapshot({interestingOnly:false})` and
`locator.ariaSnapshot()` on the key, dump, order, today, confrontation and
cycle-closed screens. Instrumented `#today-body` with a `MutationObserver` that
records, for every mutation, the added nodes *and* whether the containing
section was `display:none` at that instant (a live region inside a
`display:none` subtree is not in the accessibility tree and announces nothing).
Read back the accessible text of every ledger row against the item state stored
in `localStorage`.

### Findings

**BLOCKER — A completed commitment and a killed commitment are the same object
in the accessibility tree. (WCAG 1.3.1 Info and Relationships, A; 1.4.1 Use of
Color, A)**

`renderLedger()` adds `.ruled` for *any* non-live item, and `.entry.ruled > .l::after`
draws the strike as a 2px `background` on a CSS pseudo-element. Measured
`text-decoration-line: none` on every row. The pseudo-element is decorative
content, not text — it is invisible to AT. Measured accessible text
(`c4-strike.mjs`, real run):

| item state | class | accessible text |
|---|---|---|
| `done` | `entry ruled` | `01Board deck` |
| `struck` | `entry ruled` | `02Ada's offer You have deferred this three times and named nobody…` |
| `live`, 2 deferrals | `entry` | `04Offsite venue 2 deferrals` |
| `live`, 0 deferrals | `entry` | `04Offsite venue` |

Expected: "Board deck, done" vs "Ada's offer, struck". Actual: a done item is
byte-identical to an untouched live item. A struck item is only distinguishable
because the model happened to return a verdict sentence — if `struckReason` is
empty (the `parseVerdict` fallback path always sets one, but an item struck
through any future path might not) it too collapses to a bare title. The red
line — the product's declared visual signature — carries 100% of the meaning and
transmits 0% of it to a screen reader.

**BLOCKER — Arriving on a screen has no announcement mechanism at all, and the
ordering screen announces only half of each choice. (WCAG 4.1.3 Status Messages,
AA; 2.4.3 Focus Order, A)**

On every screen change the app does `show(name)` + `window.scrollTo(0,0)` and
nothing else. Measured across all six transitions: focus lands on `<body>`
(see Paul), `document.title` never changes, there is no landmark to land in, and
on two of four screens there is no heading either. Nothing tells Esther the
application has changed state.

`startOrdering()` and `boot()` both call `renderToday()` *before* `show("today")`,
so `#today-body` is populated while `#s-today` is still `display:none` and the
`show()` that follows is only a visibility flip — which fires no live-region
event of its own. I could not prove the resulting silence from this rig:
`MutationObserver` callbacks are microtask-batched and run after the synchronous
`render → show` block, so the probe in `c4-esther4.mjs` reports
`screenDisplay: "block"` for those mutations even though they occurred while
hidden. Whether Chromium's accessibility-tree diff attributes them to a visible
region is browser- and AT-dependent and not decidable here. **What is decidable,
and is the finding: on arrival the user gets at most a raw re-read of the card
body, with no statement that a screen changed, no focus move, and no title
change** — and Esther presses "Extract items", waits up to 90 s, and the page
becomes a different application with no reliable cue.

On the ordering screen there is no live region at all. After pressing Enter on
`#pick-a`, focus measurably stays on `#pick-a` while its accessible name changes
underneath from `"Board deck Thursday's board meeting has no funding ask."` to
`"Contoso renewal You are billed for another year on the 30th."`. Most screen
readers will re-announce the name of the focused node, so option A is heard —
but `#pick-b` changes silently. Half of a forced binary choice is never spoken
unless the user manually tabs to it, seventeen times in a row.

**MAJOR — The failure banner is never announced. (WCAG 4.1.3 Status Messages, AA)**

`banner()` creates a `<div role="status">` *already containing its text* and
appends it. Measured `hadTextWhenInserted: true` — the accepted-practice
requirement is that the live region exist in the DOM before its content arrives.
Worse, measured `hostScreenDisplay: "none"` at insertion time: the extraction-failure
banner is written into `#today-banner` while `#s-today` is still hidden. By the
time the section is shown, the text is stale static content. One of seven
observed status mutations announces nothing at all; that one is the error.

The same applies to `dumpGo.textContent = "Extracting…"`. Measured during a slow
call: `aria-busy` is unset, no live region has text, and focus has already been
dropped to `<body>` (the button was disabled while focused, which removes it from
the accessibility tree's focus). A blind user gets absolute silence for up to 90
seconds while the model runs.

**MAJOR — No landmarks, and two of four screens have no heading at all. (WCAG
1.3.1, A; 2.4.6 Headings and Labels, AA)**

Measured `landmarks: []` on every screen — no `<main>`, no `role="main"`, no
`<nav>`, nothing. `document.querySelectorAll("h1,h2,h3…")` returns three
elements for the whole app; only ever one is visible at a time:

| screen | visible headings |
|---|---|
| key | `h1` "Paste your Anthropic API key…" |
| dump | **none** |
| order | `h1` "Which one hurts more if it slips?" |
| today | `h2` "Ledger" only — no `h1`, and the `h2` has no `h1` above it |

The screen names ("Dump", "Today", "Why not", "Third deferral") are `<p class="eyebrow">`.
Heading navigation — the primary way a screen-reader user orients in an
unfamiliar page — reaches the ledger but never the action itself. The 36px action
line, the single most important string in the product, is an anonymous
`<p class="action-line">`.

**MINOR — The polite region is moderately chatty, and re-announces the buttons.**

Measured payload per transition on `#today-body`:

| transition | characters announced |
|---|---|
| initial | 57 — `TODAY / Draft the three funding slides / Done / Not today` |
| after Done | 76 — `TODAY / Send Ada the signed offer letter / Blocked on Ada / Done / Not today` |
| after Not today | 105 — `TODAY / … / WHY NOT / Blocked / No time / Not real / Save` |

`renderItem()` clears and rebuilds the whole card inside the live region, so
`aria-relevant`'s default `additions text` re-announces the eyebrow and both
button labels every time. Not fatal — the payloads are small — but there is no
confirmation of what just happened. Pressing Done produces "Today, Send Ada the
signed offer letter, Blocked on Ada, Done, Not today". The word "done" appears,
but as a button label for the *next* item, which is actively misleading.

**MINOR — The ledger is one undifferentiated text run. (WCAG 1.3.1, A)**

Measured `ariaSnapshot()` of `.ledger`:

```
- heading "Ledger" [level=2]
- text: 01Board deck 02Ada's offer 2 deferrals 03Contoso renewal 2 deferrals 04Offsite venue…
```

No list, no list items, no per-row boundaries, and the ordinal runs into the
title with no separating whitespace ("01Board deck" — VoiceOver reads this as
"zero one board deck"). There is no way to step row by row.

**MINOR — The ledger is stale during the confrontation.** `confront()` rewrites
`todayBody` but never calls `renderLedger()`. Measured: an item that has just
recorded its third deferral still shows "2 deferrals" in the ledger behind the
verdict.

**MINOR — `document.title` is `"Spine"` on all four screens.** Technically
satisfies 2.4.2 Page Titled, but gives no state cue on an SPA.

### Feature requests

**FR-E1 — Give each ledger row a state word in text, and make the ledger a list.**
*Problem it solves:* today, "done" and "struck" are the same node in the
accessibility tree, so a blind user cannot read the artefact the product exists
to accumulate. Render each entry as an `<li>` whose accessible name ends in
"— done" / "— struck" / "— kept, blocked on Ada" / "— 2 deferrals", and keep the
red rule as pure decoration on top of it. Sighted users lose nothing.

**FR-E2 — Announce the screen you just arrived on, once.** *Problem it solves:*
Esther presses a button and the application silently becomes a different
application; extraction can run 90 s with no output at all. Move focus to a
per-screen `<h1>` (`tabindex="-1"`) on every `show()`, and give the Extract
button an `aria-busy` / live "Extracting your dump…" status. That single change
also fixes the arrival-silence half of the 4.1.3 failure and Paul's focus loss.

---

## 2. Paul — keyboard only

### Method

`c4-paul.mjs` never calls `.click()`. Everything is `keyboard.press("Tab")` /
`"Enter"` / typed text. After each Tab the script reads `document.activeElement`,
its computed `outline`, and whether it matches `:focus-visible`. After every
state change it records where focus landed and counts how many Tab presses are
needed to get back to a control.

### Findings

**PASS — The whole cycle is completable with a keyboard alone.** Measured:
typed the dump, tabbed to Extract, Enter; answered every comparison with Enter;
completed all eight items; reached "Cycle closed. 8 done, 0 struck, 0 carried."
in 7 further actions. **No focus traps. Nothing unreachable. WCAG 2.1.1 (A) and
2.1.2 (A) pass.**

**PASS — Focus is visible on every single control.** Measured
`outline: solid 2px rgb(38, 80, 126) offset 2px` and `:focus-visible = true` on
all 12 distinct focusable elements across all screens: `#dump-text`, `#dump-go`,
`#pick-a`, `#pick-b`, Done, Not today, Blocked, No time, Not real, the reason
input, Save, Strike it, Keep, Start a new cycle, key input, Save key. The ring
measures **6.3:1** against the page background — comfortably over the 3:1 that
1.4.11 requires. `:focus-visible` is restyled, never removed. This is better
than most production apps.

**MAJOR — Focus is dropped to `<body>` after every action and every screen
change. (WCAG 2.4.3 Focus Order, A)**

Measured focus destination at each transition:

| transition | `document.activeElement` after |
|---|---|
| dump → order (Enter on Extract items) | `BODY` |
| order → today (last comparison) | `BODY` |
| Done (item advances) | `BODY` |
| Not today (its own button is removed) | `BODY` |
| reason chip chosen | `BODY` |
| Strike it | `BODY` |

Expected: focus moves to the new screen's heading, or to the equivalent control
on the rebuilt card. Actual: `advance()` does `todayBody.textContent = ""`,
which destroys the focused node, and nothing takes its place.

Honest mitigation, measured: because only one short section is ever visible and
`show()` scrolls to top, it takes exactly **1 Tab press** to reach the first
control of the new state. For a sighted keyboard user the practical cost is one
extra keystroke per action. The damage is concentrated on Esther (reading
position resets to the top of the document with no announcement) and on Mira at
high zoom (see below), not on Paul. Severity MAJOR rather than BLOCKER for that
reason.

**MINOR — Focus survives on the ordering screen, but silently.** After Enter on
`#pick-a`, focus measurably *stays* on `#pick-a`, which now holds the next pair's
option A. Convenient for speed (17 Enters, no tabbing), but the content under a
stationary focus ring changes with no cue, and there is no `Back` — one stray
Enter permanently mis-ranks an item.

**MINOR — The app creates no history entries.** Measured `history.length: 2`
after a full run and `goBack()` navigates out of the application entirely. There
is no `Escape`, no `Back`, and no browser-level recovery from any action:
measured "after Escape, state: struck".

**POLISH — Tab order is DOM order and is correct on every screen.** Order:
textarea → Extract; pick-a → pick-b; Done → Not today; Blocked → No time → Not
real → Reason input → Save; Strike it → Keep. No `tabindex` above 0 anywhere,
so 2.4.3's ordering half is clean.

### Feature requests

**FR-P1 — On every re-render, put focus on the element that replaced the one
that was destroyed.** *Problem it solves:* six of six state changes drop focus
to `<body>`, so the user gets no confirmation that the keypress did anything and
must re-enter the page each time. Focus the new `<h1>` on a screen change, and
the new primary action ("Done") after an advance.

**FR-P2 — A keyboard shortcut layer on the ordering screen: `1`/`2` (or `←`/`→`)
to choose, `Backspace` to un-answer the previous comparison.** *Problem it
solves:* seventeen forced choices with no way back means one mis-key
permanently corrupts the ranking, and the only recovery is to abandon the cycle.
An undo of the last comparison is cheap — the merge sort is already
promise-driven and could keep a one-deep answer stack.

---

## 3. Mira — low vision, 200% zoom

### Method

Real browser-zoom emulation: browser zoom at N% on a 1280×900 window yields a
CSS viewport of `1280/N × 900/N` at `deviceScaleFactor N`. Tested 100 %
(1280×900), 200 % (640×450, dsf 2), 400 % (320×225, dsf 2) and a 360×640 phone
at dsf 3. Separately tested text-only zoom (`html { font-size: 200% }`, root
16px → 32px) for 1.4.4, and the 1.4.12 text-spacing overrides. On each screen the
script walks every element and flags anything whose right edge exceeds
`documentElement.clientWidth` or whose `scrollWidth/scrollHeight` exceeds its
client box under a non-scrolling overflow.

### Findings

**PASS — WCAG 1.4.10 Reflow (AA).** Measured `documentElement.scrollWidth ===
clientWidth` on all four screens at 1280, 640, 360 **and 320 CSS px**. Zero
elements overflow to the right. Zero clipped elements. The `max-width: 68ch` +
percentage-width layout reflows cleanly; `.action-line` has
`overflow-wrap: break-word` and wraps rather than overflowing.

**PASS — WCAG 1.4.4 Resize Text (AA).** At root 32px the action line computes to
72px, the layout still produces no horizontal scroll at either 1280 or 640 CSS px,
and no element clips or overlaps (measured `overlap: false`, `clipped: []`).

**PASS — WCAG 1.4.12 Text Spacing (AA).** With 1.5 line-height / 0.12em letter /
0.16em word / 2em paragraph spacing forced: no horizontal scroll, no clipping,
no overlap.

**MAJOR — At 400% zoom the only two buttons on the Today screen are below the
fold, with no cue that they exist.**

Measured at 320×225 CSS px (400 % zoom on a 1280×900 window):

| | value |
|---|---|
| viewport height | 225 px |
| action line height (short action, 3 lines) | 124.2 px |
| Done / Not today row top | **254.2 px — off screen** |
| `buttonsInView` | **false** |
| with a realistic long action (8 lines) | row bottom at **505.1 px**, i.e. 2¼ screens down |

Expected: the one action and its two answers on one screen — that is the entire
product thesis. Actual: Mira sees a very large sentence and an empty space, and
must scroll blind to find out that answering is even possible. Compounded by
`.today { padding-top: 40px }` and `min-height: 42dvh` pushing content down, and
by Paul's focus-to-`<body>` problem: after each Done, the page scrolls back to
top and she must scroll down again, every single time. Not a formal WCAG failure
(vertical scrolling is permitted), but it is the highest-cost usability defect
for this persona.

**MINOR — At 200% text-only zoom the measure cap stops working.** `--measure: 68ch`
resolves relative to the enlarged font, so at root 32px the wrap grows to the
full 1248px viewport width. Ledger rows become 1248px lines of 32px text — well
past the ~80-character comfortable maximum, which is exactly the wrong direction
for a low-vision reader. The `max-width` should also be capped in absolute units.

**MINOR — Three text styles fail 1.4.3 (see Gus's table).** All three land on
`--ink-dim` over `--bg` at **4.22:1**: `.eyebrow` (the screen name), the Ledger
`h2`, `.entry .n`, `.entry .why`, `.blocked` and — critically — `.entry.ruled > .l`,
the text colour of every done and struck ledger row. The permanent record is the least
legible text in the app.

**MINOR — Every non-primary control has a 1.58:1 boundary (see Gus, 1.4.11).**
At 200 % zoom on a low-contrast panel, "Not today", "Strike it", "Keep…", the
reason chips and both choice cards read as flat rectangles of paper rather than
as buttons.

### Feature requests

**FR-M1 — Pin the answer buttons to the bottom of the viewport (or above the
action line) when they would otherwise fall below the fold.** *Problem it solves:*
at 400 % zoom the Done / Not today pair sits 254–505 px down a 225 px viewport,
so the "one action, two answers, one screen" promise silently breaks for exactly
the users who most need it. A `position: sticky` footer row costs nothing at
100 %.

**FR-M2 — Raise `--ink-dim` to at least 4.5:1 on `--bg` and cap `--measure` in
`ch` *and* `rem`.** *Problem it solves:* the ledger — the artefact the product is
built to accumulate — is rendered in the app's only failing text colour, at
12–14px, and its line length grows unbounded under text zoom. `#4F5D52` on
`#DCE2DB` measures 5.24:1 and is visually indistinguishable from the current
token.

---

## 4. Gus — deuteranopia

### Method

For every visible element that owns a text node, read computed `color`, walk the
ancestor chain compositing `background-color` (including alpha and `color-mix`,
which Chrome serialises as `color(srgb …)` — the first pass of the audit silently
mis-parsed these, which is why the script normalises through the browser),
compute the WCAG relative-luminance ratio, and pick the 4.5:1 or 3:1 threshold
from the real `font-size`/`font-weight`. Non-text elements (borders, the strike
bar, the focus ring) measured the same way against 1.4.11's 3:1. Deuteranopia
simulated with the Viénot 1999 matrix in linear RGB, and applied to the live page
as an `feColorMatrix` for the screenshot at
`research/findings/c4-gus-ledger-deuteranopia.png`.

### Findings

**BLOCKER — "Done" and "struck" are the same treatment. Not just for Gus — for
everyone. (WCAG 1.4.1 Use of Color, A; 1.3.1, A)**

Measured, on a ledger containing one done, one struck and six live items:

| state | text colour | text-decoration | pseudo-bar | distinguishing text |
|---|---|---|---|---|
| done | `#5D6C60` | none | `#8C3A2B`, 2px, rotate(−0.4°) | *(none)* |
| struck | `#5D6C60` | none | `#8C3A2B`, 2px, rotate(−0.4°) | the verdict sentence, 12px, 4.22:1 |

Identical colour, identical weight, identical opacity, identical bar. See
`c4-gus-ledger-normal.png`: "01 Board deck" (completed) and "02 Ada's offer"
(killed) are pixel-equivalent apart from a paragraph of grey 12px text beneath
the second. The single most important distinction in a tool whose whole premise
is "a killed commitment stays visible so you have to look at it" is not encoded
at all. Colour vision is irrelevant here — **no user of any kind can reliably tell
a finished commitment from an abandoned one.** This is the finding of the cohort.

**MAJOR — The "you are here" marker in the ledger is colour-only and nearly
isoluminant. (WCAG 1.4.1 Use of Color, A)**

`.entry.at { color: var(--accent) }` is the only cue for the current item.
Measured luminance ratio between `--accent` and `--ink` (the colour of every
other live row): **1.79:1 normal vision, 1.47:1 simulated deuteranopic.** In the
deuteranopia render, "03 Contoso renewal" is indistinguishable from rows 04–08.
Remove colour (greyscale, e-ink, bright sun) and the marker vanishes entirely.

**MINOR — The strike bar survives deuteranopia, but stops reading as "red".**

| pair | normal | deuteranopic (Viénot) |
|---|---|---|
| `--warn` vs `--bg` | 5.79:1 | **3.39:1** |
| `--warn` vs `--surface` | 6.62:1 | **3.93:1** |
| `--accent` vs `--bg` | 6.30:1 | 7.90:1 |
| `--ink` vs `--bg` | 11.27:1 | 11.61:1 |
| `--ink-dim` vs `--bg` | 4.22:1 | 4.51:1 |
| `--accent` vs `--ink` | 1.79:1 | 1.47:1 |
| `--warn` vs `--ink` | 1.95:1 | 3.42:1 |

Token simulation: `--warn #8C3A2B → #767A30` (olive), `--accent #26507E → #3A3773`
(indigo), `--bg #DCE2DB → #DEDEDD`. The bar stays visible as a dark line on a
light ground (3.39:1, above 1.4.11's 3:1), so the *strike* is legible. What is
lost is its meaning: "correction red" becomes highlighter-olive, and the
red/blue semantic pair the design system depends on (`--warn` destructive vs
`--accent` primary) collapses from a hue contrast into two similar dark colours.

**MINOR — "Strike it", the most destructive button in the app, drops to 3.93:1
for a deuteranopic reader.** `#8C3A2B` on `#EDF0EA` measures 6.62:1 normally —
a clean pass — and 3.93:1 simulated, below the 4.5:1 that 16px normal-weight
text needs. WCAG is defined on normal colour vision so this is not a formal
failure, but for this exact persona the highest-stakes label is the least legible
one on the screen.

**MAJOR — Non-text contrast: every non-primary control's boundary is 1.4–1.6:1.
(WCAG 1.4.11 Non-text Contrast, AA)**

| component | boundary | measured | required |
|---|---|---|---|
| `.btn` border (`ink @ 24%` → `#AFB6AF`) on `--bg` | 1px | **1.58:1** | 3:1 |
| `.btn` fill (`--surface`) vs page (`--bg`) | fill | **1.14:1** | — |
| `.choice` card border (`ink @ 18%` → `#BAC1BA`) on `--bg` | 1px | **1.40:1** | 3:1 |
| textarea / text input border (`ink @ 24%`) on `--bg` | 1px | **1.58:1** | 3:1 |
| `--line` ledger rule (`ink @ 12%` → `#C5CCC5`) on `--bg` | 1px | 1.24:1 | n/a (decorative) |

Neither the fill (1.14:1) nor the border (1.58:1) reaches 3:1, so there is no
visual information at 3:1 or better identifying where "Not today", "Blocked",
"No time", "Not real", "Save", "Strike it", "Keep, it's blocked on someone", the
two ordering cards, the dump textarea or the reason input begin and end. This is
a straightforward 1.4.11 failure, and it is the one I nearly missed by eye —
the paper-on-paper look is deliberate and it is exactly what fails.

### Contrast table — everything measured

Text (from computed styles on the live page; `L` = qualifies as large text under
1.4.3, i.e. ≥24px, or ≥18.66px at weight ≥700):

| # | where | sample | fg | bg | px | wt | L | ratio | needs | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `.eyebrow` (Dump / Today / Why not / Third deferral) | "Dump" | `#5D6C60` | `#DCE2DB` | 12 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 2 | `.ledger h2` | "Ledger" | `#5D6C60` | `#DCE2DB` | 12 | 600 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 3 | `.entry .n` (row ordinals) | "01" | `#5D6C60` | `#DCE2DB` | 14 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 4 | `.entry.ruled > .l` (all done + struck titles) | "Board deck" | `#5D6C60` | `#DCE2DB` | 14 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 5 | `.entry .why` (deferral count, strike reason, "Kept — blocked on…") | "2 deferrals" | `#5D6C60` | `#DCE2DB` | 12 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 6 | `.blocked` ("Blocked on Ada") | — | `#5D6C60` | `#DCE2DB` | 14 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 7 | `.empty` ("Nothing in this cycle…", ledger-error fallback) | — | `#5D6C60` | `#DCE2DB` | 14 | 400 | – | **4.22** | 4.5 | **FAIL 1.4.3** |
| 8 | `.choice .c` (consequence line) | "Thursday's board meeting…" | `#5D6C60` | `#EDF0EA` | 14 | 400 | – | 4.83 | 4.5 | pass |
| 9 | `.verdict .rec` | "Reads as not a commitment." | `#5D6C60` | `#EDF0EA` | 12 | 400 | – | 4.83 | 4.5 | pass |
| 10 | `.entry.at > .l` (current ledger row) | "Contoso renewal" | `#26507E` | `#DCE2DB` | 14 | 400 | – | 6.30 | 4.5 | pass |
| 11 | `.btn-warn` label | "Strike it" | `#8C3A2B` | `#EDF0EA` | 16 | 400 | – | 6.62 | 4.5 | pass (3.93 deuteranopic) |
| 12 | `.banner` | "Extraction failed…" | `#8C3A2B` | `#EDF0EA` | 14 | 400 | – | 6.62 | 4.5 | pass |
| 13 | `.btn-primary` label | "Extract items" / "Done" | `#EDF0EA` | `#26507E` | 16 | 400 | – | 7.21 | 4.5 | pass |
| 14 | `#s-order h1` | "Which one hurts more if it slips?" | `#1F2A24` | `#DCE2DB` | 22 | 600 | – | 11.27 | 4.5 | pass |
| 15 | `.action-line` | "Draft the three funding slides" | `#1F2A24` | `#DCE2DB` | 36 | 600 | ✓ | 11.27 | 3.0 | pass |
| 16 | `.entry > .l` (live rows) | "Offsite venue" | `#1F2A24` | `#DCE2DB` | 14 | 400 | – | 11.27 | 4.5 | pass |
| 17 | `.choice .t` | "Board deck" | `#1F2A24` | `#EDF0EA` | 22 | 400 | – | 12.90 | 4.5 | pass |
| 18 | `.btn` label | "Not today", chips, "Save" | `#1F2A24` | `#EDF0EA` | 16 | 400 | – | 12.90 | 4.5 | pass |
| 19 | `.verdict p` | verdict sentence | `#1F2A24` | `#EDF0EA` | 16 | 400 | – | 12.90 | 4.5 | pass |
| 20 | `.closed p` | "Cycle closed. 8 done, 0 struck, 0 carried." | `#1F2A24` | `#EDF0EA` | 22 | 400 | – | 12.90 | 4.5 | pass |

Non-text (1.4.11, 3:1):

| # | what | resolved colour | against | size | ratio | verdict |
|---|---|---|---|---|---|---|
| 21 | focus ring (`--accent`, 2px, offset 2px) | `#26507E` | `#DCE2DB` | 2px | 6.30 | pass |
| 22 | strike bar `.entry.ruled .l::after` | `#8C3A2B` | `#DCE2DB` | 2px | 5.79 (3.39 deut.) | pass |
| 23 | `.btn-primary` fill/border | `#26507E` | `#DCE2DB` | fill | 6.30 | pass |
| 24 | `.entry.at` current-row cue vs other rows | `#26507E` | `#1F2A24` | text | **1.79** (1.47 deut.) | **FAIL 1.4.1** |
| 25 | `.btn` (secondary) border, `ink @ 24%` | `#AFB6AF` | `#DCE2DB` | 1px | **1.58** | **FAIL 1.4.11** |
| 26 | `.btn` (secondary) fill vs page | `#EDF0EA` | `#DCE2DB` | fill | **1.14** | **FAIL 1.4.11** |
| 27 | `.choice` card border, `ink @ 18%` | `#BAC1BA` | `#DCE2DB` | 1px | **1.40** | **FAIL 1.4.11** |
| 28 | text input / textarea border, `ink @ 24%` | `#AFB6AF` | `#DCE2DB` | 1px | **1.58** | **FAIL 1.4.11** |
| 29 | `--line` ledger rule, `ink @ 12%` | `#C5CCC5` | `#DCE2DB` | 1px | 1.24 | decorative, n/a |
| 30 | focus ring vs the `.btn-primary` fill it encircles | `#26507E` | `#26507E` | 2px | 1.00 | polish — see below |

The focus ring passes 1.4.11 because `outline-offset: 2px` puts a 2px band of
page background between ring and button, so the *adjacent* colour is `--bg` at
6.30:1. But on the primary button the ring is the same colour as the button, so
it reads as a slightly fatter blue button rather than as focus. POLISH.

### Feature requests

**FR-G1 — Split the two settled states: done gets a checked/lighter treatment,
struck keeps the red rule, and both get a text label.** *Problem it solves:* a
completed commitment and an abandoned one are currently the same object, so the
ledger cannot do the one job it exists to do — show you what you killed. Keep
the red rule exclusively for `struck` (it is the signature and it survives
deuteranopia at 3.39:1); give `done` a `text-decoration: line-through` in
`--ink-dim` plus a leading "✓", and append the state as text to every row.

**FR-G2 — Give every control a 3:1 boundary and give `.entry.at` a non-colour
marker.** *Problem it solves:* two 1.4.11 failures and one 1.4.1 failure at once.
Take the `.btn`/`.choice`/input border from `ink @ 24%`/`@ 18%` to a solid token
measuring ≥3:1 on `--bg` (`#8E978F` measures 3.03:1), and mark the current ledger
row with a `▸` glyph or a 2px left rule rather than a 1.79:1 hue shift.

---

## 5. Hana — motor impairment

### Method

`c4-hana.mjs` selects every `button, [role=button], a[href], input, textarea,
select, [tabindex]` with a non-zero box on each of the six states (key, dump,
order, today, today + reason row, third-deferral confrontation), at 1280×900 and
at 360×640 with `hasTouch`. It records the real `getBoundingClientRect()` for
each, then computes the nearest-neighbour edge distance between every pair of
targets under 60px apart. Mis-click recovery tested by striking a real item and
enumerating every control, dialog and `localStorage` write afterwards.

### Findings

**PASS — Every interactive element clears 44×44 CSS px. (WCAG 2.5.8 Target Size
(Minimum), AA — and 2.5.5 (Enhanced), AAA.)** Zero elements under 44×44 at
either viewport. `min-height: 44px` on `.btn`, `.choice` and every input is
doing real work. This is unusually good.

**MAJOR — The destructive action sits 8px from its opposite, has no
confirmation, and cannot be undone. (WCAG 3.3.4 Error Prevention, AA — arguably;
3.3.6 Error Prevention (All), AAA — clearly)**

Measured on the confrontation screen:

| viewport | "Strike it" | "Keep, it's blocked on someone" | gap |
|---|---|---|---|
| 1280 | 235.2 × 44, left-most | 417 × 44 | **8px horizontal** |
| 360 | 328 × 44 | 328 × 44 | **8px vertical** |

Then, measured after a single click on "Strike it":

- confirmation dialog present: **false**
- controls named undo / restore / revert / cancel / back: **`[]`**
- item state in `localStorage`: **`"struck"`, written immediately** (cycle JSON changed on disk: true)
- after `Escape`: still `"struck"`
- browser Back: `history.length` is 2, so Back leaves the application entirely

Expected: the app's own source comments call this "the highest-stakes click in
the app". Actual: it is a one-click, one-frame, permanently persisted deletion of
a commitment, with the destructive option in the left/first reading position, 8px
from the safe one, and the safe option carrying the longer, harder-to-parse label
("Keep, it's blocked on someone" — 29 characters vs 9). If Hana's hand drifts
left she kills a real commitment and there is no path back short of editing
`localStorage`.

The same is true of **Done** vs **Not today** (8px apart, 307.9px and 344.4px
wide at 1280) — a mis-click marks an untouched obligation complete forever and
removes it from the walk. There is no undo for that either.

**MINOR — Adjacent-target spacing is a uniform 8px everywhere.** Measured
nearest-neighbour gaps: 8px between every pair on every screen (Done↔Not today,
Blocked↔No time↔Not real, Reason input↔Save, Strike↔Keep, pick-a↔pick-b), and
23px between the dump textarea and Extract items, 16px between the key field and
Save key. 2.5.8's spacing requirement is moot because every target is already
≥24px, so this is a comfort finding, not a conformance one — but 8px between a
destructive and a non-destructive button is the wrong number.

**MINOR — Double-firing is guarded for deferral only.** The `deferring` flag in
`defer()` prevents a double-tap from jumping an item from its first deferral
past its third. There is no equivalent guard on `Done`, `Strike it` or `Keep` —
though because each rebuilds the card synchronously, a second click lands on the
*next* item's button in the same screen position. A tremor producing two clicks
270ms apart would mark two items done in a row.

### Interactive element inventory — every measured box

| screen | element | 1280×900 (w × h) | 360×640 (w × h) | ≥24² (2.5.8) | ≥44² (2.5.5) |
|---|---|---|---|---|---|
| key | `#key-input` "Anthropic API key" | 660.2 × 44 | 328 × 44 | ✓ | ✓ |
| key | `#key-save` "Save key" | 660.2 × 44 | 328 × 44 | ✓ | ✓ |
| dump | `#dump-text` textarea | 660.2 × 414 | 328 × 294 | ✓ | ✓ |
| dump | `#dump-go` "Extract items" | 660.2 × 44 | 328 × 44 | ✓ | ✓ |
| order | `#pick-a` choice card | 660.2 × 81.5 | 328 × 97.5 | ✓ | ✓ |
| order | `#pick-b` choice card | 660.2 × 81.5 | 328 × 97.5 | ✓ | ✓ |
| today | "Done" | 307.9 × 44 | 141.8 × 44 | ✓ | ✓ |
| today | "Not today" | 344.4 × 44 | 178.3 × 44 | ✓ | ✓ |
| reason row | "Blocked" | 214.4 × 44 | 159.9 × 44 | ✓ | ✓ |
| reason row | "No time" | 214.7 × 44 | 160.2 × 44 | ✓ | ✓ |
| reason row | "Not real" | 215.1 × 44 | 328 × 44 | ✓ | ✓ |
| reason row | reason `input` (aria-label "Reason") | 342.5 × 44 | 176.4 × 44 | ✓ | ✓ |
| reason row | "Save" | 309.7 × 44 | 143.6 × 44 | ✓ | ✓ |
| confrontation | **"Strike it"** | 235.2 × 44 | 328 × 44 | ✓ | ✓ |
| confrontation | "Keep, it's blocked on someone" | 417 × 44 | 328 × 44 | ✓ | ✓ |
| closed | "Start a new cycle" | 660.2 × 44 | 328 × 44 | ✓ | ✓ |

Smallest measured target anywhere: **141.8 × 44** ("Done" at 360px). Nothing
fails.

### Feature requests

**FR-H1 — Make Strike undoable for the rest of the session.** *Problem it solves:*
one 8px-wide mis-aim permanently and silently destroys a real commitment, with no
dialog, no undo, and no browser-level recovery — measured. Do not add a
confirmation modal (it would blunt the confrontation, which is the point of the
screen); instead keep the struck item's previous state in memory and render an
"Undo strike" affordance on the ledger row itself until the cycle closes. Same
for Done.

**FR-H2 — Separate destructive from safe by more than 8px, and stop putting the
destructive one first.** *Problem it solves:* Strike/Keep and Done/Not today are
each 8px apart with the higher-cost option leading. Widen the gap to ≥24px on the
confrontation row specifically, and either right-align "Strike it" or drop it to
its own line — without changing its position between renders, which the source
correctly identifies as its own hazard.

---

## 6. Leo — ADHD (the target user)

### Method

Seeded cycles of 8, 12, 20 and 40 items directly into `localStorage` (the lab
stub caps extraction at 8) and counted the comparisons the merge sort *actually*
asks versus the number the progress line states. Measured the ledger's position
relative to the fold at five viewports. Inventoried every element with a non-zero
`transition-duration` or `animation-duration` under both
`reducedMotion: "no-preference"` and `"reduce"`. Reloaded mid-sort to see what
survives.

### Findings

**PASS — `reducedMotion: "reduce"` is honoured, trivially.** Measured
`elementsWithMotion: 0` under both settings; `scroll-behavior: auto`. There is no
animation, no transition, no fade, no slide anywhere in the app. The
`@media (prefers-reduced-motion: reduce)` block is a no-op because there is
nothing to reduce. WCAG 2.3.3 (AAA) and 2.2.2 (A) pass by construction. For Leo
this is genuinely the right call — nothing moves, nothing pulses, nothing
demands attention.

**MAJOR — The progress counter overstates the work and never completes.**

Measured, answering consistently (always pick A):

| items | counter says | last value shown before the screen changes | choices actually asked | overstated by |
|---|---|---|---|---|
| 2 | 1 of 1 | 1 of 1 | 1 | 0 |
| 3 | 1 of 3 | — | 2 | 1 |
| 5 | 1 of 8 | — | 5 | 3 |
| 8 | 1 of 17 | **12 of 17** | 12 | 5 |
| 12 | 1 of 33 | **20 of 33** | 20 | 13 |
| 20 | 1 of 69 | **40 of 69** | 40 | 29 |
| 40 | 1 of 177 | **100 of 177** | 100 | 77 |

Expected: a progress indicator that reaches its end. Actual: `comparisonBound()`
returns merge sort's worst case, so the screen opens by telling a person with
eight items that they face **seventeen** forced choices, then ends at "12 of 17".
For an ADHD user, opening with an inflated number is the difference between
starting and not starting; and a counter that jumps from 12/17 straight to a
different screen reads as "you abandoned it", not "you finished". Answering
inconsistently *does* hit the bound — measured exactly 17 with alternating
answers — so the number is honest arithmetic and dishonest UX.

At 40 items the walk is 100 forced choices: **8.3 minutes at 5 s per choice,
16.7 minutes at 10 s.** "Which one hurts more if it slips?" is not a 5-second
question. This is the single most exhausting screen in the product and it comes
before any reward.

**MAJOR — The ledger is not below the fold. On every desktop viewport, the full
list of everything you have not done is visible under the one thing you are
supposed to be doing.**

Measured `.ledger` top and the number of entries visible without scrolling:

| viewport | ledger top | entries visible without scrolling | of total |
|---|---|---|---|
| 1280 × 900 | 466 px | **8** | 8 |
| 1512 × 982 | 500 px | **8** | 8 |
| 1280 × 1200 | 592 px | **8** | 8 |
| 390 × 844 | 442 px | **8** | 8 |
| 360 × 640 | 357 px | 7 | 8 |

Expected (per the product description): "below the fold a ledger". Actual: on a
standard laptop the design's carefully protected single action is followed
immediately by an eight-row list of undone obligations, each annotated
"2 deferrals". The one-thing-at-a-time discipline — the entire reason this tool
would help Leo rather than hurt him — holds only on a phone, and only just.
`.today { min-height: 42dvh }` reserves the space but 42 dvh of 900 px is only
378 px, which is not enough to push eight rows off a laptop screen.

**MAJOR — Nothing is reversible, and the language is maximally final.**

Inventory: Done (irreversible, instant), Strike it (irreversible, instant,
persisted), Keep (irreversible), the pairwise ranking (no back button — measured
`["pick-a", "pick-b"]` as the only controls on the screen), and a mid-sort reload
that throws away every answer (measured: 5 of 17 answered, reload → "1 of 17
choices", all five lost). The word set is "Strike it", "Not real", "That makes it
a wish, not a commitment", "Reads as not a commitment". For a user whose
relationship with unfinished tasks is already the problem, a tool that
permanently rules a red line through their intentions and offers no way back is
going to be opened once and avoided afterwards. The dread is a design choice; the
irreversibility is not obviously part of it.

**MINOR — There is genuine calm in the core loop.** One 36px sentence, two
buttons, no counters, no streaks, no badges, no time pressure, no notification
surface, nothing moving. The reason chips ("Blocked" / "No time" / "Not real")
are three words each and require no composition. Deferring is one click and does
not scold. When the ledger is off-screen (phone, 360 × 640), the Today screen is
the most cognitively quiet task UI I measured in this cohort. The problem is
everything around it.

**MINOR — The third-deferral confrontation arrives with no warning.** An item is
deferred twice with no signal that a third will trigger a verdict. The ledger
does say "2 deferrals", but at 12px and 4.22:1 in the least legible style in the
app.

### Feature requests

**FR-L1 — Make the ledger genuinely optional and genuinely below the fold.**
*Problem it solves:* on every desktop viewport measured, all eight undone items
are visible under the single action, which converts "one thing at a time" back
into "here is your list" — the exact anxiety the product claims to remove. Give
`.today` a `min-height` that guarantees the ledger starts below the viewport
(`100dvh` minus the header), and collapse the ledger behind a "Ledger (8)"
disclosure that remembers its state.

**FR-L2 — State the real number of choices, and let the ordering screen be
resumable.** *Problem it solves:* the screen opens by claiming 17 choices when it
will ask 12 (177 vs 100 at forty items), and a reload discards every answer
already given. Show a progress bar driven by items placed rather than the
worst-case comparison bound, and persist the partial sort so a mid-cycle
interruption — the defining experience of the target user — does not cost the
entire session.

---

## Severity roll-up

| # | severity | finding | criterion |
|---|---|---|---|
| 1 | **BLOCKER** | Done and struck are the same node in the a11y tree and the same pixels on screen | 1.3.1 A, 1.4.1 A |
| 2 | **BLOCKER** | No arrival announcement mechanism (no focus move, no title, no landmark, no heading); ordering screen has no live region so only option A is ever spoken | 4.1.3 AA, 2.4.3 A |
| 3 | **MAJOR** | Focus dropped to `<body>` at all six state changes | 2.4.3 A |
| 4 | **MAJOR** | Failure banner and `Extracting…` never announced (created with text, inside a hidden section) | 4.1.3 AA |
| 5 | **MAJOR** | Every non-primary control's boundary is 1.40–1.58:1 | 1.4.11 AA |
| 6 | **MAJOR** | Strike is one click, 8px from Keep, with no confirm and no undo | 3.3.4 AA / 3.3.6 AAA |
| 7 | **MAJOR** | Ledger visible without scrolling on every desktop viewport | — (product thesis) |
| 8 | **MAJOR** | Progress counter overstates by up to 77 choices and never completes | 2.4.x adjacent |
| 9 | **MAJOR** | No landmarks; no heading on dump or today | 1.3.1 A, 2.4.6 AA |
| 10 | **MAJOR** | At 400% zoom the answer buttons are 254–505px below a 225px viewport | — (1.4.10 itself passes) |
| 11 | **MINOR** | `--ink-dim` on `--bg` = 4.22:1 across 7 text styles including all settled ledger rows | 1.4.3 AA |
| 12 | **MINOR** | Current-row cue is colour-only at 1.79:1 (1.47:1 deuteranopic) | 1.4.1 A |
| 13 | **MINOR** | Ledger is one undifferentiated text run, "01Board deck" | 1.3.1 A |
| 14 | **MINOR** | Mid-sort reload discards every answer | — |
| 15 | **POLISH** | Focus ring is the same colour as the primary button it encircles | 1.4.11 (passes) |

### What passes, measured, and should not be broken

- Keyboard completion of the entire cycle, no traps, no unreachable controls (2.1.1, 2.1.2).
- A visible 2px `#26507E` focus ring at 6.30:1 on all 16 focusable elements, `:focus-visible` restyled rather than removed.
- Reflow to 320 CSS px with zero horizontal scroll and zero clipping (1.4.10).
- Text resize to 200% and the full 1.4.12 text-spacing overrides, with no overlap.
- Every interactive target ≥44×44 CSS px at both 1280 and 360 (2.5.8 AA and 2.5.5 AAA).
- Zero animation anywhere; `prefers-reduced-motion` needs nothing to do (2.2.2, 2.3.3).
- `lang="en"`, a `<title>`, and real `<button>` elements throughout — no div-buttons anywhere in the app.

(Note: `.hint` is defined in the stylesheet but never rendered by any code path —
verified with `document.querySelector(".hint")` on all four screens. It is
listed here only so a future author does not reintroduce `--ink-dim` on `--bg`
through it.)
