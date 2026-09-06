# C5 — Visual design and craft

Six simulated personas, driven against the real app in Chromium via
`research/c5-visual.mjs`, `c5-wrap.mjs`, `c5-measure.mjs`. All screenshots in
`research/findings/c5-*.png`.

**Sandbox note.** Google Fonts cannot load here, so Archivo Narrow falls back to
the system stack in every screenshot. That is treated below as a real scenario
(offline, blocked CDN, privacy blocker), and reasoned about separately from the
intended face.

**The cohort's answer to its own question:** it looks like a *tasteful* wireframe
someone stopped working on. The restraint is real and the bones are good, but the
one element the whole design is staked on — the strike — is under-built,
mis-applied, and in one common case not drawn at all.

---

## Cross-cutting evidence (measured, not eyeballed)

At 1280×900 on the Today screen (`c5-measure.mjs`):

| measurement | value |
|---|---|
| `.wrap` width | 692px of 1280 — **46% of the screen is empty gutter** |
| action line | 36px type, 41px tall = **4.5% of the viewport height** |
| gap between the controls row and the ledger rule | **251px of nothing** |
| document scroll height | **900px — equal to the viewport. The page does not scroll.** |
| ledger entries visible without scrolling | **8 of 8** |

Palette contrast (sRGB, WCAG):

| pair | ratio | verdict |
|---|---|---|
| ink `#1F2A24` on stock `#DCE2DB` | 11.27 | fine |
| **ink-dim `#5D6C60` on stock** | **4.22** | **fails AA for normal text** |
| entry blue `#26507E` on stock | 6.30 | fine |
| correction red `#8C3A2B` on stock | 5.79 | fine |
| **card `#EDF0EA` on stock** | **1.14** | the "card" is functionally invisible |

---

## 1. Sofia — brand designer

**Looked at:** `c5-01-key`, `c5-02-dump-empty`, `c5-03-dump-filled`, `c5-04-order`,
`c5-05-today-full`, `c5-09-ledger-mixed`, `c5-11-strike-detail`, `c5-12-closed`.

### BLOCKER — done and struck are rendered identically
*Expected:* red is correction. Red says *this was cancelled*. A kept, completed
commitment and an abandoned one must not carry the same mark, because the entire
pitch is "the record of what you struck is as legible as what you kept."
*Actual:* `renderLedger()` applies `.ruled` on `item.state !== "live"` — done and
struck both get the correction rule. `c5-12-closed.png` is the proof: the panel
says **"Cycle closed. 3 done, 0 struck, 0 carried"** above three entries all ruled
through in correction red. Nothing on that page distinguishes a delivered
commitment from a killed one. The product's central claim is contradicted by its
own screen.

### MAJOR — the display/body pairing does no work
*Expected:* a condensed clerical face against a neutral body face — two voices,
column-header vs entry.
*Actual:* with Archivo Narrow unavailable, `--font-display` and `--font-body`
resolve to the same family. In `c5-05-today-full.png` the eyebrow, the action
line and the ledger entries are one typeface at three sizes. The only
differentiation left is weight. The fallback stack is
`'Archivo Narrow', system-ui, sans-serif` — no condensed fallback
(`ui-sans-serif`, `'Liberation Sans Narrow'`, `'Roboto Condensed'`,
`'Arial Narrow'`), no `size-adjust`. Even *with* the font, at 36px in a 660px
column the narrowness barely registers; the face is chosen for a voice the layout
never gives it room to speak in.

### MAJOR — boldness is spent in the wrong place
*Expected (stated system):* "All boldness is spent here" — on the strike.
*Actual:* the loudest object on every screen is a 308×44px slab of saturated
`#26507E` labelled **Done** (`c5-05`, `c5-14`, `c5-18-*`). It is the first thing
the eye lands on, on every Today screen. The strike is a 2px hairline 350px
lower. The hierarchy is exactly inverted against the stated intent, and Done is
the *reversible*, low-stakes act.

### MAJOR — where the eye lands, per screen
- Key (`c5-01`): the blue button, not the sentence that explains the privacy promise.
- Dump (`c5-02`): the blue button, then the placeholder. The eyebrow "DUMP" is 12px at 4.22:1 and is not seen at all.
- Order (`c5-04`): the two cards read as one grey mass — 1.14:1 against the page, separated only by a hairline. The question ("Which one hurts more if it slips?") is the right focal point but is set at `--t-lg` (22px), smaller than the action line it is deciding.
- Today (`c5-05`): Done. Should be the action line.

### MINOR — the metaphor reads as "beige page", not "ledger"
`#DCE2DB` is a cool sage-grey, not ledger stock. Ledger paper is warm — buff,
cream, faint green-blue only in the *rules*, not the field. Nothing else on the
Dump or Key screens carries the metaphor: no rules, no column, no numbering. Two
of the three screens are just a grey page with a blue button.

### POLISH — the card surface is invisible
`#EDF0EA` on `#DCE2DB` is 1.14:1. Every "card" in the app (`.choice`,
`.verdict`, `.closed`, the inputs) is defined by its 1px border alone. Either
commit to the surface or delete it and use rules only — right now it is neither.

**Blunt reaction:** the taste is genuine and the restraint is not laziness, but
this is a system that has been *specified* rather than *made*. The signature is
under-drawn, the loudest colour is on the least important button, and the one
screenshot that should sell the whole idea — the closed cycle — says "3 done, 0
struck" over three items scored out in cancellation red.

**Feature requests**
1. **Two marks, not one.** A settled tick or a filled square in the number gutter
   for *done*; the red rule reserved for *struck*. **Problem it solves:** you
   currently cannot read your own ledger — the artefact the product exists to
   accumulate is unreadable at a glance, and the closed-cycle screen actively
   lies about what happened.
2. **A condensed fallback stack plus `size-adjust`.** **Problem it solves:** for
   any user offline, behind a privacy blocker, or on a corporate network that
   blocks Google Fonts, the entire typographic concept silently evaporates and
   the app becomes one system font at four sizes. The clerical voice is either
   part of the design or it isn't.

---

## 2. Erik — 11pm, dark room

**Looked at:** `c5-13-dark-dump`, `c5-14-dark-today` (both captured with
`context: { colorScheme: "dark" }`), compared byte-for-byte against their light
equivalents `c5-02`, `c5-05`.

### BLOCKER — there is no dark mode, and no acknowledgement that dark exists
*Expected:* a tool used at the two ends of the day either adapts, or makes an
argued case for not adapting.
*Actual:* `c5-14-dark-today.png` is pixel-identical to `c5-05-today-full.png`.
The CSS contains no `prefers-color-scheme` block whatsoever, no `color-scheme`
declaration, and a hardcoded `<meta name="theme-color" content="#DCE2DB">` with
no dark variant. At 11pm in a dark room this is a full-viewport 88%-luminance
flashbang — and because the page is exactly one viewport tall with 46% empty
gutters and a 251px void in the middle, **most of what is emitted at my face is
blank stock.** There is no content there to justify the light.

### MAJOR — `color-scheme` is not declared, so the browser can't help either
Without `color-scheme: light` (or `light dark`), the UA has no signal. Form
controls, scrollbars, autofill styling and the address bar are left to guess. On
the Key screen (`c5-01`) the password input is a UA-styled light field inside a
light page inside a dark browser chrome — three different ideas of what
"background" means.

### MAJOR — the palette is not portable to dark, so this is not a small fix
The system is built on *one* stock colour with everything else defined as
`color-mix` against `--ink` at 5/12/18/24/45%. Inverting `--bg` and `--ink`
alone produces mud: `--warn #8C3A2B` on a dark ground drops to roughly 3:1 and
the correction red — the signature — is the first thing to fail. A dark ledger
needs its own red (lifted toward `#C0563F`-ish) and its own rule alpha, not an
inversion.

### Is light-only defensible?
Partly. A ledger is a paper object and paper does not have a night mode; there
is a real argument that the artefact should look like the artefact. But that
argument survives only if the *emitted area* is small. It isn't — this is a
full-bleed light field with 4.5% of it carrying content. "It's paper" would be
defensible for a dense, ink-heavy page. It is not defensible for a mostly-empty
one. And the app's own ritual puts me here at both 8am and 11pm.

### MINOR — no `light-dark()` even where it would be free
The palette is six custom properties in one `:root` block. A dark override is
six lines. The absence reads as unconsidered rather than decided.

**Blunt reaction:** at 11pm this is a lamp, not a ledger. I closed it and used my
notes app, which is the outcome the product least wants.

**Feature requests**
1. **A dark ledger-stock palette under `prefers-color-scheme: dark`** — dark
   ink-blue ground, warm off-white entries, a lifted correction red re-checked
   for contrast. No toggle, no setting, no new screen: the OS already knows.
   **Problem it solves:** the product asks for a nightly ritual and then makes
   the nightly use physically unpleasant. This is the single change that decides
   whether the evening half of the loop happens.
2. **Declare `color-scheme` and give `theme-color` a dark variant.**
   **Problem it solves:** even before a full dark palette exists, the browser
   chrome, scrollbars and the password field currently fight the page in dark
   environments, which makes a considered object look unfinished at the very
   first screen a new user sees.

---

## 3. Noor — print/editorial, knows Danish ledger books

**Looked at:** `c5-05-today-full`, `c5-09-ledger-mixed`, `c5-11-strike-detail`
(3× device scale), `c5-22-strike-wrap`, `c5-10-ledger-grayscale`, `c5-12-closed`.

### BLOCKER — the strike disappears on any entry whose title wraps
*Expected:* the rule crosses the entry, however many lines it runs to.
*Actual:* `c5-22-strike-wrap.png`. `.entry.ruled > .l` is an **inline** span; its
`::after` is absolutely positioned against a fragmented inline box, so on a
two-line entry the rule collapses to a ~35px red stub sitting under the folio
number on the second line. The item reads as *not struck*. Measured:
`getClientRects().length === 2` for both wrapped entries. This fires at 360–420px
with entirely realistic titles ("Cancel the Contoso enterprise renewal before the
thirtieth"), i.e. on phones, which is where a daily ritual actually gets used.
The product's one signature silently fails to render.

### BLOCKER (with Sofia) — red is used for settlement, not correction
In a kassebog you do not rule through a *completed* entry. Completion is a
settlement mark; the red rule is a *cancellation*, made once, left visible, and
initialled. Ruling everything closed in red is the single most inauthentic thing
on the page — it says "these all failed."

### MAJOR — `rotate(-0.4deg)` is not a hand, it's a rounding error
Over a 110px title ("Ada's offer") −0.4° is 0.77px of rise across the whole run —
below the visible threshold at 1× and swallowed by antialiasing. You can only see
it in `c5-11-strike-detail.png`, which is a 3× capture. Compare the two: in
`c5-09-ledger-mixed.png` the rules read as perfectly level. So the tilt costs a
transform, breaks nothing, and communicates nothing. Either commit (−1.2° to
−1.8°, plus a 1px vertical offset between adjacent entries so no two rules are
parallel — that variance is what reads as a hand) or drop it and use
`text-decoration-line-through` with a red `text-decoration-color`, which would
also fix the wrapping blocker.

### MAJOR — there is no column structure, so it is a list, not a ledger
What a ledger has that this does not:
- **A date column.** Every entry in a real book is dated. Here nothing is. The
  ledger records *what* was struck and never *when* — which halves the value of
  keeping it forever.
- **Column rules.** There are horizontal rules (`border-bottom`, ink at 12%) and
  no vertical ones. A ledger's identity is the *grid*: at minimum a rule between
  the folio number and the entry text, and a right-hand column for the
  settlement mark.
- **A column header row.** "LEDGER" is a section label, not a header. Real
  headers name the columns: `Nr. · Dato · Post · Afgjort`.
- **A running foot.** A page in a kassebog totals. The closed-cycle panel
  (`c5-12`) has the numbers — "3 done, 0 struck, 0 carried" — but sets them in a
  centred card *above* the ledger instead of as a ruled total line *at the foot
  of it*, where a bookkeeper would put it and where it would actually mean
  something.
- **Initials.** A correction is signed. Nothing here is.

### MAJOR — the folio number is struck along with the entry
`.n` sits inside `.l`, so the rule crosses "01" too (`c5-11-strike-detail`). You
never rule out the folio number — it's the index; it has to stay readable so the
entry can be referenced. Small thing, but it's the tell that this was drawn from
a screenshot of a ledger rather than from using one.

### MINOR — the rules are too faint to be structure
`--line` is ink at 12% ≈ 1.1:1 against the stock. In `c5-05-today-full.png` the
rules are barely present. In a ruled book the rules are *printed first* — they
are the given, and the ink sits on them. Here they are a whisper under the text.
The blue entry rules of a real ledger sit around 20–25% of the ink weight.

### MINOR — the entry blue is used as a tint, not as ink
`.entry.at` colours the current row `--accent`. Sound instinct — the live entry
in blue ink — but in `c5-10-ledger-grayscale.png` row 07 is completely
indistinguishable from its neighbours. The current entry is marked by hue alone.
A ledger would mark it in the gutter (a caret, a pointing hand, a pencil tick).

**Blunt reaction:** it has the *silhouette* of a ledger — numbers, rules, a red
correction — assembled by someone who has seen one in a photograph. There is no
date, no grid, no total, no signature, and half the entries are scored out in
cancellation red for having succeeded. It is a to-do list wearing a costume, and
on a phone the costume's one distinguishing feature doesn't render.

**Feature requests**
1. **Date + settlement columns on every entry, with a ruled total line at the
   foot.** `Nr. | Dato | Post | ✓ / —`. **Problem it solves:** a record kept
   forever that cannot tell you *when* you struck something, or show the balance
   of a cycle at its foot, is an archive nobody will ever re-read. Columns and a
   total are what make it a ledger rather than a list with a nice font.
2. **Rebuild the strike as a text decoration on a block-level entry line, and
   commit to the tilt.** **Problem it solves:** the signature currently vanishes
   on wrapped titles (phones) and is invisible at 1× when it does render — the
   single most important mark in the product is the one that is hardest to see.

---

## 4. Tomas — interaction and motion

**Looked at:** `c5-05-today-full` → `c5-07-reason-row` → `c5-08-confront` →
`c5-09-ledger-mixed` as a sequence; `c5-12-closed`. Verified against source: the
only occurrence of `animation` or `transition` in all 966 lines of `spine.html`
is line 36 — the reduced-motion reset.

### MAJOR — the strike has no moment
*Expected:* this is the emotional centre of the product. You are killing a
commitment you made. The verdict screen (`c5-08`) builds to it properly — eyebrow
"THIRD DEFERRAL", the action, a judgement in a red-ruled panel — and then the
click produces **nothing**. `advance()` wipes `todayBody` and re-renders; the
struck entry simply *is* ruled the next time you look down. The user does not see
the line get drawn. Compare `c5-08-confront.png` with `c5-09-ledger-mixed.png`:
row 06 goes from live to ruled with no frame in between, and the whole screen
above it changes at the same instant, so the eye is nowhere near the ledger when
the mark appears. **The one act the product is named for is unwitnessed.**

### MAJOR — "Done" is equally unacknowledged
Click Done and the action line is replaced instantly by the next one. There is no
signal that the *previous* thing was completed — no settle, no downward motion
toward the ledger, nothing. Two very different acts (finishing a commitment,
killing one) produce the identical zero-frame result, which reinforces the
done/struck confusion Sofia and Noor found in the ledger itself.

### MAJOR — `show()` teleports and scroll-jumps
`show(name)` toggles `display: none/block` and calls `window.scrollTo(0, 0)`
synchronously. Dump→Order and Order→Today are hard cuts with no shared element
and no directional sense. Across 17 consecutive pairwise choices (`c5-04`: "1 OF
17 CHOICES") the two cards' contents are swapped in place with zero transition —
at speed this is indistinguishable from the click not having registered, and it
is the screen where a user makes the most rapid consecutive decisions in the
whole app.

### MINOR — the "Not today" → reason row swap removes the buttons under the cursor
`controls.remove()` then appends the reason row (`c5-07-reason-row.png`). The
button you just clicked vanishes and three new ones appear 26px higher, under the
same pointer, in the same frame. No motion, no offset, no delay. That is a
misclick generator, and the layout shift is uncushioned.

### MINOR — the reduced-motion block currently guards nothing
Line 34–36 exists and is correct. With zero animation in the file it is a no-op —
compliance by absence rather than by design. Worth saying plainly: **everything
proposed below must keep that block, and every animation must be additive
polish that removes no information when suppressed.** The strike must be
*present* on the first painted frame for reduced-motion users, not drawn in.

### POLISH — no hover/focus transitions at all
`.btn:hover`, `.choice:hover` and `:focus-visible` all snap. A 120ms
`background-color`/`border-color` ease is the cheapest possible signal that the
surface is alive, and its absence is a large part of why the whole thing reads as
a wireframe.

**Blunt reaction:** the app has the emotional architecture of a ritual and the
motion design of a form submit. It spends three screens building to the strike
and then delivers it as a DOM swap you don't even look at. Zero motion can be a
position — but this isn't the confident zero of a print object, it's the zero of
nobody having got to it.

**Feature requests**
1. **Draw the strike.** On confirming a strike, scroll the ledger entry into
   view, hold ~200ms, then draw the red rule left-to-right over ~350ms
   (`clip-path`/`scaleX` from the left, `ease-out`), then settle. One animation,
   once, on the most consequential click in the product. Under
   `prefers-reduced-motion: reduce` the rule is simply present, fully drawn, on
   the first frame. **Problem it solves:** the product's thesis is that killing a
   commitment should cost something and be witnessed. Right now it costs one
   click and is witnessed by nobody — which makes striking feel exactly as cheap
   as the deferral it replaced.
2. **A settle for the action line handoff.** Completed action fades and drops
   ~8px; the next one rises into place over ~180ms; the corresponding ledger row
   takes its mark in the same beat. **Problem it solves:** finishing and killing
   an item are visually identical events, so the daily loop gives no feedback
   that distinguishes progress from attrition.

---

## 5. Amara — product designer, hierarchy and layout

**Looked at:** `c5-05-today-full` + `c5-06-today-fold` (1280×900),
`c5-17-today-768-full` + `c5-18-today-768-fold`, `c5-17-today-360-full` +
`c5-18-today-360-fold`, `c5-20/21-zoom200-*` (200% zoom = 640×450 CSS),
`c5-16-order-*`, `c5-19-ledger-*`. Geometry from `c5-measure.mjs`.

### BLOCKER — the ledger is not below the fold, and the page does not scroll
*Expected:* "ONE next action in large display type in the upper third of an
otherwise empty page; below the fold a ledger."
*Actual:* at 1280×900 the document's scroll height is **exactly 900px** — there
is nothing below any fold, because there is no fold. All **8 of 8** ledger
entries are visible in the first viewport (`c5-06-today-fold.png`). The ledger
top rule sits at y=466 — the middle of the screen, not below it. The screen the
product is built around does not exist as designed on the most common desktop
size. It gets worse as viewports get taller and at 200% zoom
(`c5-21-zoom200-fold.png`) the ledger starts ~280px down a 450px viewport.

*Why:* `.today { min-height: 42dvh }` + `.ledger { margin-top: 64px }` is a
*floor*, not a *screen*. Nothing pins the action block to a full viewport.

### MAJOR — 2.25rem does not carry a 1280px screen
36px of type, 41px tall, in a 660px column, on a 900px-tall screen, with 46% of
the width empty. The action line occupies **4.5% of the viewport**
(`c5-05-today-full.png`). It reads as a section heading, not as the one thing
you are being asked to do today. At 360px (`c5-17-today-360-full.png`) the same
36px works well — it fills three lines and dominates. So the type ramp is tuned
for the phone and simply never scales up; the desktop rendering is the phone
layout in the middle of a large empty field.

### MAJOR — the 251px void is dead, not quiet
The gap between the controls row (bottom y=215) and the ledger rule (y=466) is
251px of nothing — larger than any other element on the page. That is not
generous whitespace; whitespace works by *relating* things and this relates the
buttons to nothing. Combined with the empty side gutters, the composition is a
660px column of content floating in a field with no anchor, no baseline, and no
reason for the content to be where it is vertically. Contrast with 360px
(`c5-17-today-360-full`), where the same void is ~110px and the composition
holds.

### MAJOR — the highest-stakes button is the weakest object in the app
`c5-08-confront.png`: **"Strike it"** is a 218px outline button with a
45%-opacity red border and red label. Next to it, **"Keep, it's blocked on
someone"** is 417px wide — nearly twice the width — in the standard style. And
one screen earlier, the fully reversible "Done" is a 308px saturated blue slab.
Visual weight, from loudest to quietest: reversible Done > reversible Keep >
irreversible Strike. Exactly backwards. (The source comment at line ~838
correctly argues against *reordering* these buttons; it does not address their
weight or their unequal size, which comes free from `flex: 1 1 auto` sizing to
content.)

### MINOR — button widths are content-derived and change on every screen
`.row > .btn { flex: 1 1 auto }` means every button pair sizes to its labels.
Done/Not today at 1280 is 308/342 (`c5-05`); at 360 it is 141/175
(`c5-17-360`) — "Not today" is *wider* than "Done" at every size. Strike/Keep is
218/417. Blocked/No time/Not real is 213/213/213 (`c5-07`). Four screens, four
different button rhythms. A clerical system should have one.

### MINOR — the typed-reason row is unbalanced
`c5-07-reason-row.png`: the input is `flex: 1 1 12ch` (an inline style) beside a
Save button that ends up ~310px wide. A text field and its confirm button at
roughly 60/40 looks like a layout accident, and it sits directly under a clean
3-up row that establishes a completely different rhythm.

### MINOR — the closed-cycle card floats
`c5-12-closed.png`: a centred card at the top, then 250px of nothing, then three
ruled entries. The single most meaningful screen in the product — the summary of
a completed cycle — is composed as a dialog dropped onto an empty page, with the
evidence for its claim 250px away and contradicting it.

### 360px verdict — the best of the three
`c5-17-today-360-full.png` and `c5-19-ledger-360.png` are genuinely good. Type
scale fits, the 16px gutter is tight but acceptable, the ledger reads, the action
line dominates. **The design works at one width and has not been composed for the
other two.** 768 (`c5-18-today-768-fold.png`) is the worst of both: too wide for
the phone proportions, too narrow to justify the void.

**Blunt reaction:** this is a phone layout displayed on a desktop. The single
structural claim in the brief — one action above, ledger below the fold — is not
true at 1280×900, where the entire app fits on one non-scrolling screen and the
biggest element is a 251px hole.

**Feature requests**
1. **Make the first screen a real screen.** `.today` becomes
   `min-height: 100dvh` with the action block optically positioned in the upper
   third and a small affordance at the foot indicating the ledger continues
   below. **Problem it solves:** the product's core proposition — that you see
   *one* thing — is contradicted on the most common desktop viewport, where all
   eight items are on screen simultaneously. The ordering ritual's entire payoff
   is discarded at the moment it should land.
2. **Add one display step to the ramp for the action line** (e.g. `--t-2xl:
   3.5rem`, applied at ≥768px only, keeping 2.25rem on phones). **Problem it
   solves:** at desktop sizes the one commitment you are being asked to do reads
   as a subhead in an empty field. Six fixed steps is still a fixed ramp; one
   size that is deliberately too small on half the devices is not discipline.

---

## 6. Yusuf — design systems, token audit

**Read:** `spine.html` lines 13–275 (the entire `<style>` block), plus every
inline `style=` attribute in the markup and every `.style.*` assignment in the
script. Screenshots consulted for consequence, not for the audit itself.

### Summary
- **6 colour tokens, 5 type steps, 6 spacing steps, 1 radius, 1 measure** — all
  defined, all real, most respected. Genuinely better discipline than most
  hand-written apps.
- But there are **three whole categories the system never named** — stroke
  weight, tracking, and line-height — and each is inlined 3–4 times with
  different values.
- **Five different `color-mix` alpha values** (5%, 12%, 18%, 24%, 45%) do the
  work of a border/rule scale that doesn't exist.
- **One raw hex outside the palette** (`#000`).
- **The signature is four magic numbers** in a pseudo-element.
- **9 inline styles** (4 in markup, 5 in script). The markup ones use tokens; the
  script ones use tokens too — but they place the same relationship at `--s5` in
  one branch and `--s4` in another.

### Audit table

| Value found | Where (`spine.html`) | What it should be |
|---|---|---|
| `#000` | L108 `.btn-primary:hover` `color-mix(in srgb, #000 12%, var(--accent))` | **Only raw hex in the file.** Use `var(--ink)`, or a `--accent-press` token |
| `min-height: 44px` | L103 `.btn`, L139 inputs/textarea, L171 `.choice` | Off-ramp (4/8/16/24/40/64), repeated 3×. Name it `--touch: 44px` |
| `2px` (outline) | L51 `:focus-visible` | Not on the ramp; a stroke, not a space. `--stroke-focus` |
| `2px` (offset) | L52 `outline-offset` | `--s1` is 4px; 2px is unnamed. Use `--s1`/2 or `--stroke` |
| `2px` (border-left) | L132 `.banner`, L199 `.verdict` | Same value, third role, still unnamed. `--stroke-mark` |
| `2px` (strike height) | L250 `.entry.ruled > .l::after` | The signature's weight. `--strike-weight` |
| `left/right: -2px` | L249 same rule | Strike overhang. `--strike-overhang` |
| `top: 50%` | L249 same rule | Fine as geometry, but should be a token with the rest of the strike |
| `rotate(-0.4deg)` | L252 same rule | **The product's signature angle is an unnamed magic number.** `--strike-tilt` |
| `1px solid …24%` | L94 `.btn`, L124 inputs | Border alpha inlined twice. Should be `--edge` |
| `1px solid …18%` | L154 `.choice` | Third alpha for the same job. Collapse into `--edge` |
| `--line` = ink 12% | L31 | The one that *is* tokenised — and it's the faintest of the three (see Noor) |
| `color-mix(… ink 5%, surface)` | L100 `.btn:hover` | `--surface-hover` |
| `color-mix(… warn 45%, transparent)` | L110 `.btn-warn` border | `--warn-edge` |
| `opacity: 0.5` | L113 `.btn:disabled` | `--opacity-disabled` |
| `letter-spacing: 0.02em` | L57 `h1, h2` | `--track-display` |
| `letter-spacing: 0.16em` ×3 | L85 `.eyebrow`, L219 `.verdict .rec`, L230 `.ledger h2` | `--track-label`. Better: one `.label` class — all three rules also duplicate `--t-xs` + uppercase + `--ink-dim` |
| `line-height: 1.5` | L49 `body` | No line-height scale exists. `--lh-body` |
| `line-height: 1.6` | L141 `textarea` | `--lh-input` — and why does it differ from body at the same size? |
| `line-height: 1.25` | L177 `.choice .t` | `--lh-title` |
| `line-height: 1.15` | L198 `.action-line` | `--lh-display` |
| `min-height: 46dvh` | L155 `#dump-text` | Off-ramp magic number; also viewport-relative, which defeats a fixed spacing scale |
| `min-height: 42dvh` | L190 `.today` | Same. And it is the direct cause of Amara's 251px void + broken fold |
| `min-height: 100dvh` | L51 `body` | Acceptable, but `.today` should be the one carrying this (see Amara FR1) |
| `flex: 1 1 12ch` | L767 (script, inline style on the reason input) | Off-scale `12ch`; inline; should be a `.field` class |
| `style="font-size:var(--t-lg);margin-bottom:var(--s3)"` | L286 (key `<h1>`) | Inline. Tokens used, but `h1` has no size in CSS at all |
| `style="margin-top:var(--s3)"` | L288, L299 | Inline. Should be a `.actions` / `.stack` utility |
| `style="font-size:var(--t-lg);margin-bottom:var(--s4)"` | L307 (order `<h1>`) | Inline — **and it uses `--s4` where L286 uses `--s3` for the same "heading → content" relationship** |
| `controls.style.marginTop = "var(--s5)"` | L729 `renderItem` | Inline (script) |
| `box.style.marginTop = "var(--s5)"` | L750 `reasonRow` | Inline (script) |
| `typed.style.marginTop = "var(--s2)"` | L762 `reasonRow` | Inline (script) |
| `controls.style.marginTop = "var(--s4)"` | L833 `confront` | **Inconsistent:** the same "action line → controls row" gap is `--s5` at L729 and `--s4` at L833 |
| `content="#DCE2DB"` | L6 `<meta theme-color>` | Palette value duplicated in markup; no dark variant (Erik) |
| `--t-xl` (2.25rem) | Used exactly **once**, L196 `.action-line` | The top of the ramp carries one element; `--t-lg` carries four. The ramp is top-heavy and unused |
| `--s1` (4px) | Used **twice**, L182 and L252 | Near-dead token |
| `--radius: 2px` | L107, L137, L167 only | `.banner`, `.verdict`, `.closed` and `.entry` have no radius — defensible for a ledger, but then `.btn` inside `.closed` (L273) is the only rounded thing in a square card |
| `--font-display` fallback | L23 `'Archivo Narrow', system-ui, sans-serif` | No condensed fallback, no `size-adjust`, no `@font-face` metric override (Sofia) |
| *(absent)* `color-scheme` | — | Never declared (Erik) |
| *(absent)* `prefers-color-scheme` | — | No dark block anywhere (Erik) |
| *(absent)* transitions | Only L36, the reduced-motion reset | The guard protects nothing (Tomas) |

### MAJOR — the "eyebrow" is one component implemented three times
`.eyebrow` (L83–88), `.verdict .rec` (L216–222) and `.ledger h2` (L228–234) each
independently set `--t-xs` + `0.16em` + uppercase + `--ink-dim`. Three copies of
one label style, and `.ledger h2` additionally overrides the `h1, h2` display
rule it inherits, so the ledger header's font family comes from one rule and
everything else about it from another.

### MINOR — the spacing ramp is honoured but under-differentiated
Real usage across the file: `--s2` and `--s3` do almost all the work, `--s4` and
`--s5` appear at section breaks, `--s6` twice, `--s1` twice. That's a 6-step
scale operating as a 3-step scale. Not a defect, but the ramp is aspirational
rather than descriptive.

**Blunt reaction:** the token layer is real and mostly obeyed, which puts it
ahead of most codebases — but it stops at colour, type and space, and the three
things it *didn't* name (stroke, tracking, line-height) are exactly the three
that carry the ledger idea. And the one mark the whole design is staked on is
four hardcoded numbers inside a pseudo-element that nobody can tune without
opening the CSS and reading a comment.

**Feature requests**
1. **Name the three missing scales — `--stroke-*`, `--track-*`, `--lh-*` — and
   collapse the five ad-hoc `color-mix` alphas into a two-step `--rule` /
   `--edge` pair.** **Problem it solves:** every rule weight, every tracking
   value and every line-height in the app is currently a local decision, so the
   ledger's most characteristic properties (rule weight, clerical tracking) drift
   between components and cannot be adjusted as a system. It's also why the rules
   are too faint (Noor) with no single place to fix it.
2. **Promote the strike to a first-class, tokenised component:
   `--strike-weight`, `--strike-tilt`, `--strike-color`, `--strike-overhang`, on
   a block-level `.entry__line`.** **Problem it solves:** the signature of the
   entire product is four unnamed numbers in a pseudo-element — untunable,
   untestable, and (per Noor) silently broken on wrapped titles. If "all boldness
   is spent here," this is the one thing in the system that must be a named,
   deliberate, adjustable object rather than the most ad-hoc code in the file.
