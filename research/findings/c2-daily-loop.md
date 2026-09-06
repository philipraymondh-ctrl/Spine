# C2 — The Daily Loop

**Question owned:** does the ritual survive contact with days three through ten?

Six personas, all driven against `spine.html` in a real Chromium via `research/lab.mjs`.
Scripts are checked in as `research/c2-marcus.mjs` … `research/c2-verify2.mjs`; screenshots are in
this directory. Every claim below was observed in the browser and, where it concerns
persistence, verified against `localStorage` via `page.evaluate`.

**Headline:** the loop *runs* — nothing crashes, state survives reload, the wrap works, the
third-deferral rule fires exactly where it should. But the three things the product is
betting its identity on — the forced confrontation, the fixed order, the permanent ledger —
each have a hole in them that a returning user finds by accident within a week. The tool
is currently strict in the places that don't cost anything and soft in the three that do.

---

## 1. Marcus — day 3, cold open. "What's coming, and how much is left?"

### Session

Ran a full dump → 17 pairwise choices → three simulated days (done, defer, reload, done,
defer, reload). On day 3 he lands on `Send Ada the signed offer letter / Blocked on Ada`,
scrolls past 42dvh of empty ground, and reads the ledger. Eight rows, numbered 01–08, two
of them ruled through in red, two annotated "1 deferral", one in blue.

He asked the ledger three questions. It answered one.

- *How much is left?* — no. There is no count anywhere on the screen. The only digits are
  the row numbers 01–08 (positions in the fixed order, never renumbered) and the words
  "1 deferral". He has to count un-ruled rows by eye, and the ruled/un-ruled distinction is
  the thing he can't trust (below).
- *What's coming next?* — no, and worse than no. The ledger reads top-to-bottom as a
  running order, but the cursor **wraps**. Standing at 05, the real sequence is 06, 07, 08,
  then back up to 02 and 04. Nothing on the page hints at the wrap. A reader who takes the
  ledger literally builds a wrong model of his own week and only discovers it when item 02
  reappears after item 08.
- *Where am I?* — yes, but by colour alone: the current row is `--accent` blue (`.entry.at`,
  `#26507E`) with no weight change, no marker, no glyph. At 14px against `#DCE2DB` it is
  easy to miss and invisible to a colour-vision-impaired reader (C4/C5's problem, but it is
  the "you are here" of the daily loop, so it is mine too).

### Findings

**MAJOR — done and struck are the same picture.**
Expected: a finished item and a killed item are the two outcomes the ledger exists to
distinguish. Actual: both get `class="entry ruled"` and an identical 2px `--warn`
(`rgb(140,58,43)`) rule. Verified across a closed cycle: 7 done + 1 struck → eight rows,
all `entry ruled`, all the same rule colour, no `aria-label`, no `title`, no second class.
The only tell is that a struck row *may* carry the verdict sentence underneath — and only
if the model returned one. Day 3 Marcus cannot read his own record. See
`findings/c2-owen-closed.png`: a cycle where he did six of eight things looks like a massacre.

**MAJOR — the ledger cannot be interrogated.**
Expected: tap a row to remember what it was. Actual: rows are `<div>` with `cursor: auto`,
`tabIndex -1`, no handler. Click, double-click, drag — nothing, no feedback of any kind.
(Confirmed in Kai's run.) This is correct as a refusal to *reorder*; it is a loss as a
refusal to *look*.

**MINOR — "1 deferral" is a count, not a memory.** He deferred it and typed a reason. The
ledger tells him the number and throws the reason away (see Lena).

**MINOR — no date, anywhere.** `cycle.startedAt` is stored and never rendered. On day 3 he
cannot tell whether this cycle is three days or three weeks old, which is exactly the
judgement "should I still be running this cycle?" depends on.

### Look and feel

The 42dvh of empty ground under the two buttons is meant to make the ledger a deliberate
scroll, but on a 900px desktop it just reads as a page that failed to load its middle. The
one action is at the top, the record is at the bottom, and between them is nothing — not
whitespace with intent, just absence.

### Feature requests

1. **Two different ruled lines — or one ruled line and one check.** *Problem:* on day 3 the
   ledger is the only proof that the week is going anywhere, and right now a good week and a
   collapsed week render identically. The red rule is the product's signature for *killing*
   a thing; spending it on completion devalues both.
2. **One line under the LEDGER heading: "N left, M done, K struck."** *Problem:* "how much
   is left" is the first question of every returning morning, and the answer currently
   requires counting rows whose meaning he doesn't trust. Three integers, no chart, no
   streak, no reward for volume — it survives §7 because it describes the current cycle
   rather than rewarding it.

---

## 2. Ruth — three deferrals, on purpose. Judging the confrontation.

### Session

Ruth targeted `Draft the three funding slides` and deferred it three times, clearing the
other seven items in between so the wrap brought it back. **11 taps** and one full lap of
the cycle to reach the confrontation. The wrap works exactly as designed: deferral 1, seven
items, deferral 2, immediate return (everything else was settled), deferral 3 → confront.

The screen (`findings/c2-ruth-confront.png`): eyebrow `THIRD DEFERRAL`, the action in 36px, a
verdict card with a warn-coloured left rule, the model's two sentences, then
`READS AS NOT A COMMITMENT.` in dim uppercase, then two buttons. No third option, no back,
no escape — the only two controls on the entire screen.

**The moment lands.** The framing is right: it names the pattern rather than the person,
it puts the action itself back at the top so she is judging the thing and not an abstraction,
and the absence of any other control is genuinely uncomfortable in the way it is meant to be.
Then four things undercut it.

### Findings

**BLOCKER — the confrontation is escapable with F5, and the escape defaults to leniency.**
Expected: this is the one screen the product does not let you leave. Actual: reload during
the confrontation returns her to a normal `TODAY` screen for the *same* item with `Done` and
`Not today` — the forced choice simply gone. The cause is structural: `confront()` paints
`todayBody` directly and never advances the cursor, so on boot `currentItem()` returns
`orderedIds[cursor]` — the settled item — and `renderItem()` draws it as live. Verified in
storage: `{state: "live", deferrals: 3}`.
Two consequences, both bad:
- The ledger *simultaneously* labels that row **"Kept — blocked on someone"** (because
  `settled()` counts three deferrals). The app has silently made the lenient choice on her
  behalf, and recorded a claim she never made, on the same screen that is telling her to act.
- She can then press `Not today` a fourth time (verified: `deferrals: 4`), re-summoning the
  confrontation; or press `Done` and convert a forced strike into a completion. The rule
  becomes advisory.

  This is the single most important defect in the cohort. The whole thesis is "overturning
  a decision costs something." Right now the cost is one keystroke, and the default outcome
  of pressing it is the softest of the two.

**MAJOR — "Keep, it's blocked on someone" never asks who.**
Expected: per the README, *carried* means "blocked on a person and nothing else". Actual:
`keep` calls `advance()` immediately. No name is requested, `blockedOn` stays `""`, state
stays `live`, and the ledger prints **"Kept — blocked on someone"** — the app asserting a
blocker that does not exist and that she never named. Ruth reached "kept" from three
consecutive "No time" deferrals. The strict half of the rule is doing all the work while
the escape half has no bar at all.

**MAJOR — the app offers "No time" and then convicts her for it.**
`No time` is one of three first-class reason buttons. Three of them produce a verdict that
says she "named nobody who is holding it up", therefore it is "a wish, not a commitment."
That is not scolding exactly — it is worse, it is a trap. If "no time" is never an
acceptable answer, it should not be a button; if it is acceptable, the verdict has to say
something about *time* rather than about her character. Day 3–10 is entirely populated by
real commitments that genuinely have not had a two-hour block yet.

**MINOR — the receipt contradicts the accusation.** The header says `THIRD DEFERRAL`; the
ledger row four inches below says **"2 deferrals"**. `confront()` doesn't call
`renderToday()`, so the ledger is stale by one. At the highest-stakes moment in the app,
the only number on screen disagrees with the headline.

**POLISH — the recommended button is the weak one.** `Strike it` is 235px, warn-coloured
text on the same surface as everything else. `Keep, it's blocked on someone` is 417px —
1.8× wider, and the largest target on the screen. Fixed order is right and the comment in
the source defends it well, but the app argues for striking and then hands her a
noticeably bigger button for not doing it. The bias the README claims is not in the pixels.

### Look and feel

`READS AS NOT A COMMITMENT.` is set in the exact same dim-uppercase-tracked style as the
`TODAY` and `LEDGER` eyebrows. It's the verdict — the sharpest sentence the product ever
says — dressed as a section label. It slides off the eye.

### Feature requests

1. **Make the confrontation the persisted state, not a transient repaint.** *Problem:* the
   product's one non-negotiable moment is currently negotiable by refresh, and refreshing
   silently records the outcome she was refusing to choose. Store a `confronting: true` on
   the item so boot re-enters the confrontation; the wall has to survive the browser.
2. **"Keep" must take a name.** One text field, "Who is it waiting on?", required.
   *Problem:* "carried" is supposed to be the strongest word in the ledger and it currently
   costs less than "done". Requiring a human name makes keeping a real claim she has to look
   at again next cycle, and makes the ledger's "Kept — blocked on Ada" true.

---

## 3. Owen — the whole cycle in one sitting, through the close and into the next dump.

### Session

Eight items, **20 taps, 2.4 seconds** of machine time — call it four or five minutes of
human time. Six done, one driven to a strike, one driven to a keep. The walk closes cleanly:
`Cycle closed. 6 done, 1 struck, 1 carried.` The counts are correct. `Start a new cycle`
archives correctly (`spine.v1.archive` length 0 → 1, all eight items with their full
deferral history intact), removes `spine.v1.cycle`, and lands on the dump.

Then the pre-fill, which is where it goes wrong.

### Findings

**MAJOR — the carry loses everything that made it a carry.**
Expected: an item kept *because it is blocked on a person* arrives in the next cycle still
knowing that. Actual: the pre-fill is `carriedItems.map(i => i.action || i.title).join("\n")`
— one bare line of text, `"Read Jess's deck and send her three notes"`. That text goes back
through extraction and comes out as a brand-new item with `deferrals: []`, `blockedOn: ""`.
Verified in cycle 2's storage: `Jess's deck | d=0 | blockedOn=''`.

  So: an item can be deferred three times, kept, carried, deferred three more times, kept,
  carried — forever. **The three-deferral rule resets every cycle.** For a cohort whose
  question is "does this hold on day 10", this is the loophole that matters most. The
  ledger's promise that a thing you keep dodging eventually has to be killed is only true
  inside a single cycle, and cycles are exactly the thing that turn over.

**MINOR — the pre-filled dump is unexplained.** He clicks `Start a new cycle` and finds one
line already typed in the box with no banner, no eyebrow change, nothing (see
`findings/c2-owen-prefill.png`; `banner(dumpBanner, "")` explicitly clears it). Is that
something he wrote? Something the app wrote? Should he delete it? A returning user on day 8
who carried three items sees three orphan lines and has to reconstruct their provenance.

**MINOR — the record vanishes at the moment it becomes history.** The instant he starts
cycle 2, the ledger is empty except the new items. Six weeks of struck lines are in
`spine.v1.archive` and cannot be seen. §7 forbids archive views and I am not asking for one
— but I am reporting the pull, because it is strong and it comes from the product's own
thesis: the README says the record of what you decided *not* to do is the durable artefact,
and the UI keeps it visible for exactly as long as one cycle.

**MINOR — cycle ids collide.** `id: now.slice(0,10)` is the date. Owen closed a cycle and
opened another the same afternoon; both are `2026-09-06`. Nothing breaks today, but the
archive is keyed on a value that is not unique and is the only handle on a cycle.

### Look and feel

`Cycle closed. 6 done, 1 struck, 1 carried.` sits in a pale box at the top of a page whose
lower half is eight rows, seven of them slashed in red. He had a *good* week. The page reads
like a coroner's report. The one row that isn't struck through is the one thing he failed to
do — the strongest visual weight on the page is on his single failure.

### Feature requests

1. **Carry the item, not its text.** Move the object across the cycle boundary with
   `deferrals` and `blockedOn` intact (and skip re-extraction for it). *Problem:* an item can
   currently escape the three-deferral rule indefinitely by riding the cycle boundary, which
   is the exact behaviour the rule exists to stop.
2. **A one-line banner on the pre-filled dump: "Two items carried from the last cycle —
   still waiting on Ada and Jess."** *Problem:* the carry is the only thread connecting one
   cycle to the next, and it currently arrives as anonymous pre-typed text with no
   explanation of why it survived.

---

## 4. Lena — back after a week. Cold reload.

### Session

Built a realistic week — two done, a typed deferral (*"waiting on legal to send the
redline"*), a `Not real`, a `No time`, one item driven to a strike — then reloaded cold.
Restoration is flawless: `spine.v1.cycle` rehydrates, the cursor is where she left it, the
right action is in 36px at the top, the ledger is intact. Nothing is lost. Everything is
*hidden*.

I searched the entire rendered Today screen for the things she would need:

| she needs | in storage | on screen |
|---|---|---|
| *why* did I defer this? ("waiting on legal…") | yes | **no** — the ledger says "1 deferral" |
| *when* did any of this happen | yes (`startedAt`, per-deferral ISO dates) | **no** — no date anywhere |
| *why* is this item first? (the consequence) | yes | **no** — shown once, during ordering, never again |
| what did I strike, and on what grounds | yes | yes, if the model wrote a verdict |
| how old is this cycle | yes | **no** |

### Findings

**MAJOR — her own words are write-only.** She typed *"waiting on legal to send the
redline"* into the reason field. It is stored on the item forever and rendered nowhere,
ever. The ledger replaces it with the integer 1. This is the single most decision-relevant
sentence in the cycle and the app collects it, keeps it, and never shows it to her again.
A week later she is looking at a row that says "1 deferral" and re-deriving from memory the
thing she already wrote down. That is *re-deciding what she already decided* — the precise
failure mode in the README's first paragraph.

**MAJOR — the consequence field disappears after ordering.** The README says the model is
load-bearing in exactly one place: writing "what breaks if this slips two weeks". That
sentence appears on the pairwise buttons and then never again. On the cold return, the
top item is `Send Ada the signed offer letter` with no `Ada accepts the competing offer and
the role reopens.` anywhere on the page. The app is asking her to trust a decision made a
week ago while withholding the evidence for it — and this is the moment the whole product
depends on her trusting it. One dim line under the action would do it.

**MINOR — nothing is timestamped.** Not the cycle, not the deferrals, not the strikes. She
cannot tell a cycle she started Monday from one she started three weeks ago, which is
precisely the judgement that decides whether to keep going or dump again.

**MINOR — the ledger is inert.** Clicking the row she wants to remember does nothing at all
(verified: no handler, `tabIndex -1`, `cursor: auto`). The refusal to reorder is
comprehensible; the refusal to *expand* reads as unfinished, because there is no visible
distinction between "we won't let you touch this" and "nothing is wired up here".

### Look and feel

Coming back after a week, the page is beautifully calm and completely amnesiac. It shows her
a decision with total confidence and none of its reasoning — the tone of someone who has
forgotten the argument but is certain they won it.

### Feature requests

1. **Show the last deferral reason on the ledger row, in her words.** `Jess's deck — "waiting
   on legal to send the redline"` instead of `1 deferral`. *Problem:* the reason is the only
   thing that lets her decide whether the deferral is still valid, and it is currently
   collected and buried.
2. **Keep the consequence on the Today screen, one dim line under the action.** *Problem:*
   she has to trust an order she made a week ago and can no longer remember why. The
   consequence is the reason, it is already written and already stored, and showing it is
   the cheapest possible defence against re-ranking.

---

## 5. Kai — disagrees with the order and tries to change it.

### Session

Kai reached Today, saw `Draft the three funding slides` on top, and decided the Contoso
renewal (a hard 30th-of-the-month deadline, ledger position 07) mattered more. Everything he
tried, in order:

1. **Clicked the row he wanted** in the ledger. Nothing. No highlight, no message, no cursor
   change, no state change.
2. **Double-clicked it.** Nothing.
3. **Dragged it to the top.** Nothing; order unchanged.
4. **Tabbed through Today** looking for a control. Two focusable elements exist on the
   entire screen: `Done` and `Not today`.
5. **Looked for settings / redo / re-sort.** The full list of visible controls in the whole
   application at that moment: `["Done", "Not today"]`.
6. **Reloaded**, hoping for a re-sort. Same item, same order.
7. **Read the screen for an explanation.** The full visible text of Today is: `TODAY`, the
   action, `Done`, `Not today`, `LEDGER`, eight titles. The word "order" does not appear.
   Nothing anywhere says the order is fixed, or why, or that he chose it.
8. **Used `Not today` as a reorder tool.** Two taps — `Not today` → `No time` — and the item
   he didn't want moved out of the way. Twice more and he was on the item he wanted.

### Is the refusal principled or broken?

**Right now it reads as broken, and the fix is small.** The bet is sound and I would not
touch the mechanism. The problem is that the refusal is expressed entirely as *absence*:
inert divs, no handlers, no copy. There is no observable difference between "this app
refuses to let you reorder" and "the ledger is a static list nobody has wired up yet." A
principled refusal has to be *spoken*. Silence is indistinguishable from an unfinished
feature, and Kai is on day 4 — he will attribute it to an early build, not to a philosophy.

**The specific signal that flips it:** make the refusal answer him at the exact moment he
reaches for it. Tapping a ledger row should do *something* — surface one line where the
consequence would sit: *"You ranked this 7th on Monday. The order doesn't change inside a
cycle — that's the point."* One sentence, no button, no undo. Absence becomes a position the
moment it is stated once, at the moment of the reach.

**But there is a second, larger problem: the refusal is cosmetic anyway.** He got the
reordering he wanted in two taps via `Not today` → `No time`, at zero cost, with no
warning, and with `No time` sitting there as a socially free reason. The order is immutable;
the *sequence he actually experiences* is fully mutable, and the app hands him the lever.
The first two deferrals of any item cost nothing at all. If the wall is meant to be felt, it
has to be felt on deferral one — the third-deferral confrontation is far too late to be the
only friction in the mechanism.

### Findings

**MAJOR — browser Back or reload mid-ordering discards every answered comparison, silently.**
Expected: at worst, resume. Actual: after six of seventeen choices, Back → `about:blank`
(the app pushes no history state, so it is the first history entry), Forward → the app
reloads, `boot()` sees `orderedIds.length === 0`, and `startOrdering()` restarts from
scratch: `1 OF 17 CHOICES`, `Board deck vs Ada's offer`. Plain reload does the same. No
warning, no confirmation, no partial save. For a 17-choice sort this is punishing; the
comparison count is n·log n, so a 20-item day-8 dump means ~65 forced choices thrown away by
one stray gesture. "No back button" is a design position; the browser's own back button
being an unguarded reset is not.

**MAJOR — no copy anywhere states the order is fixed.** Zero occurrences of "order",
"change", "commit" or "reverse" on the Today screen. The central bet of the product is
never articulated to the user in the product.

**MINOR — the pairwise screen has no keyboard affordance beyond Tab.** No 1/2 or ←/→ keys
for a screen that is nothing but seventeen binary choices. (C4 owns keyboard properly; I
note it because it is the highest-repetition screen in the loop.)

### Look and feel

The Today screen is confident and the ledger under it is furniture — eight rows that look
like a list, behave like a photograph, and explain themselves not at all. The gap between
what it looks like it can do and what it does is the whole of Kai's frustration.

### Feature requests

1. **Say the refusal out loud, once, at the point of the reach.** A tap on a ledger row
   returns one sentence naming when he ranked it and why it won't move. *Problem:* the
   product's central bet is currently indistinguishable from an unimplemented feature, so
   the user attributes it to incompleteness rather than to intent, and stops respecting it.
2. **Make the first deferral cost something visible** — the item's rank stated back to him,
   or the deferral count shown on the Today screen before he confirms. *Problem:* the
   forced strike only bites on deferral three, so deferrals one and two are a free,
   frictionless reorder tool, which is exactly what the app claims not to have.

---

## 6. Jo — the 30-second morning check.

### Session

Timed a cold open on a mid-cycle state, desktop (1280×900) and phone (390×844).

| | desktop | phone |
|---|---|---|
| open → action readable | 54 ms (fonts failing fast) | 54 ms |
| open → acted, `Done` | ~110 ms after readable | ~110 ms |
| **taps to complete the ritual** | **1** | **1** |
| `Done` target | 308×44 | 157×44 |
| scroll needed to act | no | no (page 875 vs 844 — the ledger's last row clips, the action doesn't) |
| taps if it's *not* today | 2 (`Not today` + reason) | 2 |

**This is the best thing in the product.** One tap. No nav, no list, no triage, no
decision. The action is at 90px from the top in 36px type on both viewports and the primary
button is directly under it. Jo's ritual is genuinely 5 seconds, and the two-tap deferral
path with a mandatory reason is exactly the right amount of friction — she cannot skip
saying why, and I would not let her.

Two things are in the way.

### Findings

**MAJOR — a hanging font request blanks the entire ritual.**
`spine.html:12` is a render-blocking `<link>` to `fonts.googleapis.com`. `display=swap` and
both `preconnect`s are correctly in place, and a *fast* failure is a non-event: 54 ms to a
readable action. But I routed the stylesheet to **hang** rather than fail (captive wifi,
hotel, tunnel, flaky LTE — the actual morning conditions this persona lives in) and the
action line never rendered at all: **20 s, nothing on screen.** `display=swap` governs the
font file, not the stylesheet request. A 30-second ritual whose one job is to show one
sentence should not be behind a third-party request that can hang. (This is *not* the
sandbox caveat — I verified the fast-fail path separately and it is clean.)

**MAJOR — a mis-tap on `Not today` cannot be undone.** `Not today` sits 8px from `Done`
(157px targets on phone). Tapping it removes the `Done` button entirely and replaces it with
the reason row: `Blocked / No time / Not real / [or type one] / Save`. There is **no cancel,
no back, no `Done` any more**. Verified: the buttons available after a mis-tap are exactly
`["Blocked","No time","Not real","Save"]`. The only escape is to reload the page — which
Jo has no reason to think of, and which is also (see Ruth) the gesture that breaks the
confrontation. So a fat thumb at 7am forces her to write a false reason into a permanent
record, or to abandon the app for the morning.

**MINOR — nothing acknowledges the tap.** `Done` swaps instantly to the next action with no
transition and no confirmation. On a fast morning she cannot tell whether she completed one
item or two, and there is no count on screen to check against.

### Look and feel

For five seconds a day this is close to perfect and I resent having to find something wrong
with it. What I'll say is that `Done` and `Not today` are equal-height twins 8px apart with
no destructive styling on the one that writes to a permanent record — the two buttons look
like a symmetric choice, and they are not one.

### Feature requests

1. **Inline the display font, or drop it to a system stack and stop blocking on the
   network.** *Problem:* the morning ritual can be a blank page on exactly the connections
   it needs to work on, and a ritual that fails twice is a ritual that ends.
2. **A cancel on the reason row** — restore `Done`, or a tap-outside dismiss. *Problem:* a
   mis-tap currently has no exit that doesn't write a false deferral into the permanent
   ledger, and the ledger's whole value is that it is true.

---

## The deliberately hard moments — intentional discipline, or missing feature?

**No back button on Order — currently reads as missing.** Not because of the missing button,
which is fine, but because the *browser's* back button is unhandled and destroys 17 answered
choices with no warning. A user who loses seventeen forced decisions to one stray gesture
does not read "principled"; they read "fragile", and fragile is the word that ends a habit
on day 5. **Signal that would flip it:** push a history entry so Back is captured and
answered — *"There's no going back inside a sort. Answer the pair."* — and persist partial
comparisons so a genuine crash resumes. Refusing to go back is a position; losing the work
is a bug wearing the position's coat.

**The forced strike — reads as intentional, and it's the best-executed moment in the app,
but it is not enforced.** The copy is right, two options is right, fixed button order is
right and well-defended in the source. It fails only in that F5 walks out of it and records
the lenient outcome unasked, and that the lenient outcome requires naming nobody. **Signal
that would flip it:** persist the confronting state so the wall survives a refresh, and make
`Keep` take a human name. Both are small; both convert a stated principle into an enforced
one. Until then a returning user learns, by accident, that the wall is a poster.

**One item at a time — reads as intentional discipline, unambiguously.** Five of six
personas accepted it without complaint and Jo's one-tap morning is entirely built on it. The
only pull against it came from Marcus wanting a *count* (not a list) and Kai wanting a
different item — and Kai's real problem was the silence, not the constraint. Keep it. The
thing that would erode it is not a fourth screen; it is the two-tap free deferral, which
already lets anyone see any item they want without the app ever saying no.

---

## Verdict on the cohort question

Does the ritual survive days three through ten? **The mechanics do; the discipline doesn't.**
Nothing breaks, state is durable across reloads, the wrap and the three-deferral rule fire
exactly as specified. But by day 10 a user will have discovered, without trying, that
deferring twice is free, that the third-deferral wall is a refresh away from vanishing, that
"keep" costs nothing and needs no name, and that carrying an item into the next cycle wipes
its deferral count to zero. Four independent escape routes from a mechanism whose entire
value is that there is no escape route. Meanwhile the ledger — the artefact that is supposed
to make all of this worth it — renders a good week and a collapsed week identically, and
throws away every word the user wrote about why.

Close those four holes and show the user their own reasons back, and the ritual has a real
chance on day 30. Leave them, and the tool degrades into a nicely-typeset list that happens
to show one row at a time.
