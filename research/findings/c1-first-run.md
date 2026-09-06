# C1 — First run and onboarding

**Question owned:** can a cold user understand what this is before they understand what it's for?

Six personas, each meeting Spine for the first time. Every finding below was
observed by driving `spine.html` in Chromium via `research/lab.mjs`. Scripts:
`research/p1-priya.mjs`, `p1b/c/d-priya.mjs`, `p2-tom.mjs`, `p2b/c-tom.mjs`,
`p3-dana.mjs`, `p3b/c/d/e-dana.mjs`, `p4-sam.mjs`, `p4b-sam.mjs`,
`p5-ana.mjs`, `p5b-ana.mjs`, `p6-wei.mjs`. Screenshots: `research/findings/c1-*.png`.

The short answer to the question: **no.** The cold user understands the
*mechanics* within about forty seconds — a box, then a fork, then one big
sentence — and never understands the *thesis* at all, because the app never
states it. Nothing on any screen says the word "commit", "decide once", or
"re-ranking". Five of six personas invented a wrong model in the first five
seconds and were only corrected by being refused.

---

## 1. Priya — programme director, desktop, zero context

### Session

Cold open on 1280×900. The entire page is 70 characters of text: the eyebrow
`SPINE`, the sentence *"Paste your Anthropic API key. It stays on this device."*,
a masked field, and a blue `Save key` button (`c1-priya-01-cold.png`). She sat
on it. Her read, out loud: *"This is somebody's developer tool. It wants my
credit card by proxy."* She has no idea what Spine is, does, or costs. There is
no tagline, no example, no link, no `<a>` element anywhere on the page (checked:
`links: []`).

She clicked `Save key` with the field empty, to see if it would explain itself.
**Nothing happened.** No error, no shake, no message — the body text was byte-
identical before and after. She clicked twice more before concluding the button
was broken.

She pasted a key, landed on `DUMP`: an empty textarea and `Extract items`. The
word "Spine" is now gone from the screen entirely — the eyebrow slot is reused
for the screen name, so from the second screen onward the product has no name
anywhere in the UI. She clicked `Extract items` on the empty box. **Nothing
happened again.**

She dumped, and got `1 OF 17 CHOICES` / *"Which one hurts more if it slips?"*
Her reaction: *"Seventeen? I have eight things."* She finished in **12**
choices — the counter counted 1…12 of 17 and then the screen changed
(`p2b-tom.mjs` logged every label). She pressed browser Back mid-sort to
un-pick one; the tab navigated to `about:blank` and the app vanished. Coming
back via reload, the sort **restarted at `1 OF 17`** with the same first pair —
her answers were gone.

Today screen: one big line, `Done` / `Not today`, ~250px of empty space, then
the ledger. On a 900px-tall desktop the whole page fits with zero scroll
(`scrollHeight 900 === innerHeight 900`), so the "below the fold" ledger is not
below anything — it's just a gap.

### Findings

**BLOCKER — The first screen never says what the product is.**
Expected: a cold visitor learns, in one line, what they are about to do, before
being asked for a credential that costs money.
Actual: the entire first render is `SPINE` + *"Paste your Anthropic API key."*
No tagline, no description, no example, no link. A programme director will not
paste a billable API key into an unexplained box. This is the single highest-
cost defect in the cohort: the onboarding funnel's first step is "trust us".

**MAJOR — Buttons that look live, aren't, and say nothing.**
Expected: clicking a full-width primary button with an empty required field
produces an error.
Actual: `Save key` with an empty field (`keyInput.focus(); return;`) and
`Extract items` with an empty textarea both do *literally nothing* — verified by
diffing `document.body.innerText` before and after. The button doesn't disable,
grey out, or complain. Priya concluded the app was broken. (Same defect recurs a
third time on `Save` in the Why-not row — see Dana.)

**MAJOR — Reload or Back mid-sort destroys every comparison made.**
Expected: `spine.v1.cycle` is in localStorage after the dump (confirmed it is),
so the sort should resume.
Actual: after two answered comparisons, reload returned `1 OF 17 CHOICES` with
the identical first pair `[Board deck, Ada's offer]`. The items persist; the
merge-sort state does not. Browser Back is worse — it leaves the app entirely
(`url after back: about:blank`, empty body). For a screen with no back button by
design, "one stray Back keystroke nukes the session" is not an acceptable
failure mode.

**MINOR — The progress denominator is a lie.**
Expected: `1 OF 17` means seventeen decisions.
Actual: 17 is the worst case; the actual run took 12 (picking "a" every time) and
17 (alternating). The counter never revises down, so the user is quoted a price
25–30% above what they pay. Overestimating is the kinder direction, but the
number is the only commitment the ordering screen makes and it isn't kept.

**POLISH — The app name disappears after screen one.**
`.eyebrow` carries `SPINE` on the key screen and then `DUMP`, `1 OF 17 CHOICES`,
`TODAY`. `document.title` stays "Spine" but nothing in the viewport does. A user
who lands on Today from a bookmark on day four sees no product identity at all.

### Look and feel

It looks like a settings pane that lost its application. Everything is jammed
into the top 25% of a 1280×900 window inside a 660px column, and the remaining
~670px of sage-grey is dead. The restraint reads as unfinished rather than
considered — there is no anchoring device (no rule, no footer, no centred
composition) to make the emptiness feel deliberate, so the eye keeps hunting
below the fold for the rest of the page that never arrives.

### Feature requests

1. **One sentence above the key field, before the field.** *Problem:* she is
   asked to paste a billable credential by an app that has not told her what it
   does, so the rational move is to close the tab. A single line —
   what it is, what happens next, what it costs — converts a credential prompt
   into an offer.
2. **Resumable ordering.** *Problem:* she made 2 of 17 irreversible decisions,
   hit reload, and lost them; the screen with no back button is also the screen
   with no crash-safety, which is the worst possible pairing. Persist the sort
   cursor next to the items already in `spine.v1.cycle`.

---

## 2. Tom — 40 things in his head, pastes a genuine wall

### Session

Tom pasted 40 lines / 2,439 characters of real mess (`p2-tom.mjs` — board deck,
Ada, Contoso, mum's birthday, "i owe someone an apology and i keep not doing
it"). The textarea is a fixed 412px box; his content is 1,245px tall, so it
scrolled to the bottom on fill (`scrollTop: 821`) and shows only the last ~16
lines (`c1-tom-01-pasted.png`). Meanwhile 400px of empty page sits below the
box. The one piece of customisation available in the whole app is the native
resize grip in the textarea's corner.

He clicked `Extract items`. Under `mode: "slow"` the button becomes a disabled
`Extracting…` and stays that way with no spinner, no progress, no cancel, and —
critically — **the textarea stays editable**. Tom remembered his passport and
typed it in while it was thinking. Verified in `p2c-tom.mjs`: the addition was
in the field, the request had already gone with the old text, and on return the
textarea was **cleared to `""`**. His last thought was silently deleted.

40 lines went in. **8 items came out.** No count, no "found 8", no review step,
no way to see which of his 40 lines produced which item or which produced
nothing. He noticed his mum's birthday wasn't in the ledger and had no mechanism
to find out whether it was merged, dropped, or judged unimportant. He then had
to make 17 forced choices about a list he had never been shown.

### Findings

**MAJOR — The dump is destroyed on submit with no record and no reconciliation.**
Expected: after extraction he can check his 40 lines against the items produced.
Actual: `dumpText.value` is cleared; there is no count anywhere ("8 items from 40
lines" appears nowhere); the raw text is not retained on screen or in the
ledger. His only artefact of the brain-dump is 8 titles he can't trace back. For
a tool whose entire premise is "get it out of your head", silently eating 80% of
what he got out is the wrong first impression.

**MAJOR — Edits made during an in-flight extraction are silently discarded.**
Expected: the input is locked while the request is in flight, or the new text is
used.
Actual: `#dump-go` is disabled and relabelled `Extracting…`, but `#dump-text` is
not disabled (`ta: false`). Typing is accepted, ignored, and then wiped. There is
no "your edits after clicking are not included" affordance of any kind.

**MINOR — A 40-line dump is reviewed through a 412px keyhole.**
The textarea is a fixed height on a page with 400px of unused space beneath it,
and it jumps to the bottom on paste so he can't see the top of what he wrote.
Auto-growing to available height would cost nothing.

**POLISH — `Extracting…` gives no sense of duration.**
Under `slow` mode it sat for 2.5s with a disabled button and no other change. On
a real 40-line dump this will be 5–15s of a page that looks frozen.

### Look and feel

The empty textarea looks generous; the full one looks like a broken window. The
moment it has real content in it, the design's one interactive surface becomes
a cramped scroller with a resize handle floating in a sea of unused page — the
layout is tuned for the placeholder, not for a person with forty things.

### Feature requests

1. **A one-line extraction receipt: "40 lines → 8 items" with the dropped lines
   listed once.** *Problem:* he cannot tell the difference between "the app
   merged my forty things sensibly" and "the app lost thirty-two of them", and
   that difference decides whether he trusts it tomorrow. This does not add a
   fourth screen or let him edit the order — it's a line of text on the screen
   he's already on.
2. **Keep the raw dump text visible until the cycle closes.** *Problem:* the
   thing he most fears is that something he was carrying quietly vanished; the
   app currently deletes the only evidence at the exact moment it stops being
   checkable.

---

## 3. Dana — sceptic, expects a to-do app

### Session

Dana went looking for the app she assumed this was. Every refusal, in order, as
logged by `p3-dana.mjs` / `p3d` / `p3e`:

| # | She reached for | What the app did |
|---|---|---|
| 1 | "Add task" / "+" on the first screen | No such control. The only interactive elements on Dump are `TEXTAREA#dump-text` and `BUTTON#dump-go`. |
| 2 | A list of everything, before ranking | The Order screen contains exactly two buttons and a question. There is no list view at any point before Today. |
| 3 | Back / undo on a pairwise choice | No back button. `Escape`, `Backspace`, `ArrowLeft`, `ArrowUp` all leave `1 OF 17 CHOICES` unchanged. Browser Back exits the app to `about:blank`. |
| 4 | "They're equal" / "skip this pair" | Two options only. No third. |
| 5 | Reload to get a do-over | Got one, but a total one: the sort restarted from pair 1 with all answers lost. |
| 6 | Click ledger row `04 Offsite venue` to promote it | Inert `<div>`, `cursor: auto`, no handler. Nothing happens. |
| 7 | Double-click Today's big action to edit the wording | Not editable. (I verified this by clicking the heading's exact bounding box — an earlier probe that appeared to defer the item was my own click landing on the `Not today` button, not a hidden handler.) |
| 8 | Get back to Dump to add the thing she forgot | No route. Reload from Today returns to Today. The only buttons on the page are `Done` and `Not today`. |
| 9 | A settings page, to change the key or start over | None. The only path back to the key screen is to trigger a 401. |
| 10 | `Save` in the Why-not row without picking a reason | **Nothing happened.** Button is `disabled: false`, looks live, silently returns. |

Then the interesting one. She clicked `Not today` expecting the day to end —
that's what "not today" means. Instead the reason row appeared, she clicked
`No time`, and **the next item appeared immediately**. `Not today` is wired as
`Next`. She kept going out of curiosity and, in a single sitting on day one,
walked the whole ledger three times — 17 deferrals — and hit the confrontation
(`c1-dana-confront.png`): *"THIRD DEFERRAL… You have deferred this three times
and named nobody who is holding it up. That makes it a wish, not a commitment."*
The ledger below it says `2 deferrals`.

### Findings

**BLOCKER — "Not today" means "next item", so the one-item-per-day discipline
collapses in the first session.**
Expected: the product shows ONE item; declining it ends the interaction.
Actual: `defer()` calls `advance()`, which renders the next item instantly.
There is no day boundary anywhere in the code path — `p3e-dana.mjs` walked the
full 8-item ledger three times in under a minute. The product's central claim
("ONE item's next physical action") is unenforced. Worse, the forced
confrontation — a deliberately heavy, shaming moment, earned over three days —
fires on **day one, after 17 clicks**, at a user who has committed to nothing
yet. That is the single most damaging first-run experience in the app: the tool
calls her a fantasist about a task she first saw ninety seconds ago.

**MAJOR — The Why-not row has two contradictory commit models.**
Expected: pick a reason, then confirm.
Actual: clicking `Blocked` / `No time` / `Not real` **commits instantly and
advances** — no confirmation, no undo. The adjacent `Save` button belongs only
to the `or type one` text field, and does nothing at all if that field is empty.
So three of the four buttons in the row are instant-commit and the fourth,
which is the one that *looks* like the commit, is inert. Dana clicked `Save`
first, got silence, and assumed the row was broken.

**MAJOR — The confrontation contradicts the ledger on the same screen.**
Expected: the header and the ledger agree.
Actual: header reads `THIRD DEFERRAL`; the ledger row directly below reads
`2 deferrals`. `defer()` pushes the deferral and calls `confront()`, which
rewrites `#today-body` only — `renderLedger()` is never re-run. Verified in the
screenshot. On the app's highest-stakes screen, the evidence contradicts the
accusation.

**MINOR — The current item is marked in the ledger with link-blue.**
`01 Board deck` renders in the same blue as the primary button
(`c1-priya-07-today.png`). It reads as a hyperlink, invites a click, and does
nothing. The one piece of state in the ledger is signalled with the app's
"clickable" colour.

**MINOR — The reason chips give no read-back.**
Once she picked `No time`, that reason appears nowhere on the Today screen. The
ledger shows only `1 deferral`. She could not check what she'd told it.

### Look and feel

It behaves less like a tool with opinions and more like a form that lost half
its handlers. Genuine refusal has a texture — a message, a disabled state, an
explanation. Spine's refusals are indistinguishable from bugs: three separate
buttons that swallow the click and say nothing. The discipline is real; the
*evidence* of discipline is missing, so the first-run read is "unfinished", not
"strict".

### Feature requests

1. **A day boundary on `Not today` — after deferring, the session ends until
   tomorrow.** *Problem:* the app's whole claim is that it stops you re-deciding,
   but it currently hands you the next item the instant you decline one, so the
   first session degrades into exactly the list-scrolling it exists to prevent —
   and it triggers the three-deferral confrontation on day one, unearned.
   (This is not a settings page or a fourth screen; it's the missing half of the
   existing rule.)
2. **Make the refusals speak.** *Problem:* she cannot distinguish "this app is
   deliberately strict" from "this app is broken", and on first run she picks
   the second. One line where a refused click happens — *"Pick a reason first."*,
   *"Nothing to extract yet."*, *"No going back. That's the point."* — turns
   three apparent bugs into the product's actual argument.

---

## 4. Sam — pastes a key with a trailing space and a newline

### Session

`withKey: false`, then filled `#key-input` with `"  sk-ant-xyz \n"`.

The whitespace is handled correctly, and this deserves saying plainly because
it's the one place the app is more careful than it looks. The `\n` is dropped by
the single-line `<input>` itself (field value came back as `"  sk-ant-xyz "`),
and `keyInput.value.trim()` removes the spaces. Stored:
`{"apiKey":"sk-ant-xyz","createdAt":"..."}` — verified by reading localStorage.
**No finding. It works.**

Everything around it is where Sam got hurt.

The field is `type="password"` with no reveal toggle (`hasRevealToggle: false`),
so he could not see what he had pasted. He then tested what happens with a key
that is not a key at all: filled `"not-a-key-at-all"`, clicked `Save key`, and
was moved straight to the Dump screen. No format check, no confirmation, no
"saved" acknowledgement of any kind (`text.includes("saved")` → false). He does
not learn the key is wrong until after he has written and submitted a full
brain-dump.

When he did hit a real 401 (`mode: "unauthorized"`), the recovery is good: back
to the key screen with a red-ruled banner — *"That key was rejected. Paste a
working one — your dump is still here."* — and after re-saving a good key, the
dump text was genuinely still in the textarea (`c1-sam-04-rejected.png`,
`c1-sam-05-recovered.png`). But the field comes back **empty** and the old key
has been **deleted from localStorage** (`localStorage.getItem` → `null`), so if
his key had one wrong character he cannot see it, fix it, or recover it — he has
to go find it again.

### Findings

**MAJOR — The key is accepted with no validation and no acknowledgement; the
first sign of trouble is one screen and one long paste later.**
Expected: an obviously malformed key is caught at the field, or at minimum the
save is confirmed.
Actual: `"not-a-key-at-all"` saved silently and advanced to Dump. A trivial
`sk-ant-` prefix/length check at save time, or a one-word confirmation, would
put the failure where the user's attention already is instead of after their
first real piece of work.

**MINOR — Masked field with no reveal, so a paste error is invisible.**
`type="password"`, no toggle. The most common real failure — pasting the wrong
clipboard entry, an org id, or half a key — is undetectable by looking.
"It stays on this device" already establishes this is a local secret; a reveal
toggle costs nothing against that threat model.

**MINOR — On rejection the stored key is wiped and the field is not repopulated.**
He had one character wrong; the app deleted the evidence and gave him an empty
box. Prefilling the rejected value (still masked, now revealable) turns a
key-hunt into a one-character fix.

**MINOR — There is no way to change the key except by getting one rejected.**
No settings page (by design), and no other route. A user who pastes a *valid*
key for the wrong account is parked on the Dump screen permanently. Recording
this as pull, not as a mandate for a settings screen.

**POLISH — No `paste` handling or hint about where a key comes from.**
No link to console.anthropic.com, no note about cost. Sam knew; Priya didn't.

### Look and feel

The key screen is the only screen in the app that asks for trust and it is
dressed exactly like the others — same eyebrow, same grey box, same blue bar. A
credential prompt should feel different from a text box. It doesn't, and the
result is that the most consequential input in the product has the least
ceremony.

### Feature requests

1. **Validate the key shape at save, and say "saved" when it works.**
   *Problem:* he currently discovers a bad key only after composing and
   submitting a full dump, which is the most expensive possible place to find
   out and the one most likely to make him quit.
2. **Reveal toggle on the key field.** *Problem:* the failure he actually hit —
   clipboard containing the wrong thing — is invisible in a masked field, so he
   cannot debug the one input the whole app depends on.

---

## 5. Ana — non-native English speaker, reads every string literally

### Session

Ana walked every screen and every state and read the strings out loud:
key, dump (empty), order, today, why-not, third-deferral, cycle-closed,
extraction-failed, one-item. Full inventory in `p5-ana.mjs` output.

She got through the flow. She could not have told you what any of it meant.
Her summary: *"I understand each button. I do not understand the sentences."*
The copy is dense with British workplace idiom, and the app's core vocabulary —
dump, ledger, cycle, strike, struck, carried, deferral — is never defined
anywhere.

### Findings

**MAJOR — `WHY NOT` as a heading means the opposite of what's intended.**
Expected: a prompt asking for a reason.
Actual: in English, "Why not!" is an idiom of *agreement* ("Shall we? — Why
not!"). Ana read the heading above three buttons as enthusiastic assent and
could not work out why agreeing offered her `Blocked / No time / Not real`. It
is also the only heading in the app with no punctuation, which removes the one
cue that would disambiguate it as a question. `Why not?` or, better,
`What stopped you` removes the trap entirely.

**MAJOR — `Reads as not a commitment.` is unparseable literally.**
On the confrontation screen (`c1-dana-confront.png`), under the verdict, in
small caps: `READS AS NOT A COMMITMENT.` "Reads as" = "comes across as" is
idiomatic; the literal parse is "someone reads this as…", and there is no
subject. Ana's reading: *"Who reads? Reads what?"* This is the line carrying the
app's recommendation on its highest-stakes screen and it is the most idiomatic
sentence in the product.

**MAJOR — The app's core nouns are jargon, used as UI labels, never defined.**
Observed, in order of appearance:
- `DUMP` — as the primary label of the first screen. In English "dump" is also
  a rubbish tip and a vulgarism. It is the first word a user sees after the key
  screen and it is the riskiest word in the app.
- `LEDGER` — accounting/bookkeeping term. Ana did not know it. There is no
  gloss.
- `Cycle closed. 8 done, 0 struck, 0 carried.` — three past participles with no
  nouns. `struck` (from "strike it") and `carried` are internal state names
  leaked into user copy. A user who has never struck anything sees `0 struck`
  and has no way to learn what it counts.
- `Third deferral` — legal/administrative register, in an app that otherwise
  writes "Not today".
- `Extract items` — technical/chemical.

**MAJOR — `Extraction failed. Items are raw — fill in the next action yourself.`
tells her to do something the app provides no way to do, and tells her too late.**
Under `mode: "garbage"` and `mode: "http500"` the app falls back to raw dump
lines. The failure banner is written to `#today-banner` — so it does not appear
until **after** the ordering. Verified: at the moment the failure occurs
`#dump-banner` is empty and invisible (`visible: false`, `rect: [0,0]`) and the
active screen is `s-order`. She made 12–17 forced choices about truncated raw
fragments (`board deck for thursday, still no funding slides` /
`ada's offer letter — she said she'd wait til fri…`) with no indication anything
had gone wrong, and only then was told the items were raw. Then: "fill in the
next action yourself" — there is no editable field anywhere in the app.
`c1-ana-04-garbage.png`, `c1-ana-07-garbage-today.png`.

**MINOR — `Not today` is not what the button does.**
It advances to the next item immediately (see Dana). Ana read it as "I am
finished for today" and was surprised to be handed more work. The label
describes an intent the app does not honour.

**MINOR — `Which one hurts more if it slips?` stacks two idioms in seven words.**
"Hurts" (metaphorical harm) and "slips" (a deadline slipping, not a physical
slip). This is the single most repeated sentence in the app — she read it 17
times — and it is the one sentence that most needs to be literal. She eventually
understood it from the consequence lines underneath, not from the question.

**MINOR — `Blocked on Ada` / `Keep, it's blocked on someone`.**
"Blocked *on*" is Anglophone-workplace-specific; most languages take "blocked
*by*". Ana's literal parse of "blocked on someone" was physical. The second
string is also a comma splice reading as two fragments.

**MINOR — Other literal misreads, each observed on screen:**
- `Everything you're carrying` (textarea label + placeholder) — physical objects.
- `Don't organise it` sits directly above a button called `Extract items`. She
  concluded the app *would* organise it for her — which is half true and set the
  wrong expectation for the pairwise screen, where she then had to organise it
  herself, one pair at a time.
- `Nothing breaks.` as a consequence line — read as a warranty statement.
- `or type one` — "one" has no antecedent on screen.
- `The ledger could not be drawn.` — "drawn" as sketched/pulled.
- `Nothing in this cycle. Start with a dump.` — two undefined nouns in eight words.
- `Strike it` — strike = industrial action, or to hit. Cross-out is the third
  meaning. It is the destructive button.

**POLISH — `<html lang="en">` with British spelling (`organise`).**
Not wrong, but `en-GB` is the accurate tag and it is what translation tooling
and screen readers will act on.

**POLISH — `document.title` is `Spine` on all five screens.**
No state in the tab title; a returning user's bookmark says nothing.

### Look and feel

The typography is calm and the copy is loud. Every screen is set like a quiet
literary object and then says `DUMP` at the top in letterspaced caps. The visual
register (restrained, considered, English-country-grey) and the verbal register
(clipped, idiomatic, slightly contemptuous) are two different products, and a
reader who doesn't have native access to the second one only gets the first.

### Feature requests

1. **Punctuate and de-idiom the six load-bearing strings** — `Why not` →
   `Why not?`, `Reads as not a commitment.` → `This looks like a wish, not a
   commitment.`, `0 struck` → `0 crossed out`, `Not today` → a label matching
   what the button does. *Problem:* she completed the whole flow while
   misunderstanding the two moments the product cares most about — the deferral
   reason and the confrontation verdict — so the discipline landed as confusion
   rather than as pressure.
2. **Show the extraction-failure banner on the screen where it happens.**
   *Problem:* she spent 17 forced choices ranking garbled fragments before
   anyone told her the extraction had failed, and the message she finally got
   instructed her to edit text the app has no field for. Moving the banner to
   `#dump-banner` at the moment of failure costs one line and saves the whole
   session.

---

## 6. Wei — phone first, 360×740, touch

### Session

`viewport: {width: 360, height: 740}`, `hasTouch: true`, `isMobile: true`.
Measured geometry throughout (`p6-wei.mjs`).

The good news first, because it's real: `meta viewport` is correct
(`width=device-width, initial-scale=1, viewport-fit=cover`), all inputs are
16px so iOS won't zoom on focus, there is **no horizontal scroll on any screen**
(`scrollWidth 360 === innerWidth 360`), and the Today screen is the one place the
design works better on mobile than desktop — the page is 810px against a 740px
viewport, so the `LEDGER` heading and rows 01–04 are already visible below the
action (341px of ledger in view at rest). Wei found the ledger without being
told. That is the discoverability question answered, positively.

Everything about the *touch* design is wrong.

On the Order screen — the screen he will tap 17 times — both choice cards sit in
the **top half** of the phone: `pick-a` at y=140, `pick-b` at y=246, both 98px
tall, ending at y=344 of a 740px screen. The bottom 396px, the entire natural
thumb arc, is empty sage-grey (`c1-wei-03-order.png`). Seventeen consecutive
one-handed reaches to the top of the phone.

The gap between the two choice cards is **8px**. Two 98px targets, 8px apart,
one-handed, on a screen where a mis-tap is a permanent unreviewable decision
with no back button.

On Today: `Done` is **142px** wide, `Not today` is **178px** — the defer button
is 25% larger than the commit button, and it's on the right, under the right
thumb. The app's preferred action is the smaller, further one.

In the Why-not row at 360px, `Blocked` and `No time` share a row at 160px each,
and `Not real` wraps onto its own **full 328px row** (`c1-wei-06-whynot.png`),
which visually promotes it into a different class of answer. Below it,
`or type one` (176px) sits beside `Save` (144px) — and `Save`, as established, is
the one button in the row that does nothing unless the adjacent field is filled.

### Findings

**MAJOR — The most-tapped screen in the app puts its only targets out of thumb
reach.**
Expected: a screen requiring 12–17 consecutive taps places them in the lower
half of the phone.
Actual: `pick-a` top = 140px, `pick-b` bottom = 344px, on a 740px viewport;
`pick-a.top >= 493` (bottom third) is `false`. 396px of empty space sits below
them. Every tap is a stretch, and by tap seven it's a grip change.

**MAJOR — 8px between two adjacent, irreversible, no-undo targets.**
Measured `pick-b.top − pick-a.bottom = 8`. Standard minimum separation for
touch targets is 8–12px for *low-stakes* controls; this is the highest-stakes
repeated tap in the product and the only screen with no way to correct a
mistake. A fat-finger on the boundary silently records the wrong priority
forever.

**MINOR — `Done` is smaller than `Not today` (142px vs 178px).**
The buttons are sized by content, so the longer label wins. The result is that
the deferral is the bigger, right-hand, thumb-adjacent target and the commitment
is the smaller one. In an app whose thesis is that committing should be easier
than re-deciding, this is backwards at the pixel level. Same on desktop
(307px vs 344px).

**MINOR — `Not real` wraps to its own full-width row at 360px.**
Three peer options render as `[Blocked][No time]` / `[Not real]`, which reads as
a hierarchy that doesn't exist.

**POLISH — 396px of dead space below the choice cards.**
Not merely a reach problem — on a phone the emptiness reads as "the page hasn't
finished loading". Wei flicked upward twice on the Order screen looking for
content that wasn't there.

**POLISH — `viewport-fit=cover` with no `env(safe-area-inset-*)` padding.**
Grepped the stylesheet: no `env(` anywhere. The declaration opts the page into
the display cutout area without compensating for it; the 16px column inset is
the only thing between content and a rounded corner in landscape.

### Look and feel

On the phone it finally looks like something rather than a settings pane — the
big action line at 360px is genuinely commanding, and the ledger sitting just
below the fold does what the design intends. Then you try to use it one-handed
and it's obvious no one has. Every control lives in the top half of a screen
that is held from the bottom. It's designed for a mouse and rendered on a
phone.

### Feature requests

1. **Bottom-anchor the choice pair on the Order screen and give it real
   separation.** *Problem:* 17 consecutive stretches to the top of the phone,
   with 8px between two irreversible targets, on the one screen with no undo —
   this is where a phone-first user abandons, and where a mis-tap silently
   corrupts the ordering he can never inspect or fix.
2. **Size `Done` and `Not today` equally, with `Done` on the thumb side.**
   *Problem:* the app currently makes deferring the easiest physical act on the
   screen, which is the exact opposite of what a committer should do with its
   button geometry.

---

## Cross-cutting: what the cohort says about the question

**The mechanics are learnable; the thesis is invisible.** All six personas
completed the flow. None of them could state, at the end, why the app has no
back button or why the ledger keeps struck items forever. Nothing in the product
ever argues for itself. The refusals — no edit, no back, no add — are the
argument, and they are all delivered as silence, which reads as breakage rather
than conviction. Three separate buttons (`Save key` empty, `Extract items`
empty, `Save` with no reason) do nothing at all when clicked.

**Where the personas reached for the deliberately-absent** — recorded as data
about pull, not as bugs:
- *Back / undo on the pairwise screen*: reached for by Priya (browser Back) and
  Dana (Escape, Backspace, arrows, reload). The pull here is strong and is
  aggravated by a genuine defect — reload loses all comparisons — which makes
  the absence look like a bug rather than a rule.
- *Editing an item*: Dana (double-click on the action), and Ana was explicitly
  *instructed* to edit by the extraction-failure copy.
- *A list view before ranking*: Dana, Tom. Tom's version is the more legitimate
  one — he wants reconciliation of 40 lines to 8 items, not reordering.
- *A route back to Dump*: Dana, to add a forgotten item.
- *A settings page*: Sam, to change a key he can only change by getting it
  rejected.
- *Multiple cycles / a day boundary*: Dana, by accident, discovering there isn't
  one.

**The one thing that is genuinely well made:** the 401 recovery path. It
explains itself, returns the user to the right screen, preserves the dump, and
says so in the banner. It is the only error state in the app that behaves like
the product has an opinion about the user's time. Every other failure is a
button that does nothing.
