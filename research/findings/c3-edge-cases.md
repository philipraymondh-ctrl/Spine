# C3 — Edge cases and failure

Six simulated personas driven against the real app (`spine.html`, served over
http, Playwright/Chromium, 1280×900 unless noted). Every failure below was
*induced and observed*, not reasoned about from source. Scripts live beside this
file: `c3-ivan.mjs`, `c3-nadia.mjs`, `c3-ben.mjs`, `c3-ben2.mjs`, `c3-zoe.mjs`,
`c3-ola.mjs`, `c3-ryu.mjs`, `c3-ryu2.mjs`, `c3-probes.mjs`, `c3-probes3.mjs`,
`c3-gaps.mjs`, `c3-gaps2.mjs`.

The cohort question: **when this breaks, does the user understand what happened
and what to do?**

The short answer: the app has *two* good failure paths (the rejected key on the
dump screen; the archive write at cycle close) and they are genuinely excellent —
truthful, specific, non-destructive, recoverable. Everything else fails silently.
The pattern is consistent enough to name: **`write()` returns a boolean that
almost nobody checks, and `ask()` has a fallback that almost never announces
itself.** Both were clearly designed with care in one place and then not carried
to the other call sites.

---

## Ivan — the network dies mid-extraction

### What I did

`mode: "hang"` (the route returns a promise that never settles). The app's real
clock is 90 s, so I shortened it in-page by wrapping the global `ask` — it is a
top-level function declaration in a classic script, so it is reachable as
`window.ask` and reassigning it works:

```js
await s.page.evaluate(() => {
  const orig = window.ask;
  window.__timeouts = [];
  window.ask = (sys, user, maxTokens, timeoutMs) => {
    window.__timeouts.push(timeoutMs);   // records what the app actually asked for
    return orig(sys, user, maxTokens, 4000);
  };
});
```

`window.__timeouts` came back `[90000]`, confirming the real wait is 90 seconds.
I sampled the DOM at 150 ms / 1 s / 2.5 s, tried to escape, then let the clock run.

### What he sees

At every sample point, the entire page is:

```
DUMP

Extracting…
```

The button is disabled and greyed; the dump is still on screen. No spinner, no
progress, no elapsed time, no "this can take up to a minute", no Cancel. See
`c3-ivan-01-waiting.png`. This is what a person stares at for **90 seconds** on a
dead network. It is indistinguishable from a hung tab.

Afterwards the abort fires, `fallbackSplit` runs, and he lands on the **ordering**
screen with 8 raw lines and empty consequence lines. He then answers **12 forced
binary choices** — "Which one hurts more if it slips?" with a blank second line
under each option — before the app ever tells him anything went wrong. The
"Extraction failed. Items are raw" banner lives on `#today-banner` and is
therefore invisible until ordering completes.

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **MAJOR** | A 90-second wait tells me it is 90 seconds, or lets me cancel | A static disabled button reading "Extracting…" for 90 s. No cancel, no timer, no motion. The only escape is a browser reload |
| **MAJOR** | The "extraction failed" warning appears *when* it fails | It is written to the Today banner and shown only after 12 pairwise comparisons. He ranks raw fragments against blank consequences without knowing why they look wrong |
| **MAJOR** | Editing the dump during the wait either works or is prevented | The textarea stays fully editable. I typed "I changed my mind" during the wait; the extraction used the *original* text, then `dumpText.value = ""` wiped my edit. Silent discard |
| **MINOR** | The ordering screen degrades honestly when there are no consequences | The `.c` span renders empty, so each choice is a title with a mysterious gap under it. Nothing says "we could not work out the consequence" |
| **POLISH** | 90 s is a defensible timeout for a 4000-token call | It is defensible for the *request*, not for the *UI*. A user has decided the app is broken by second 15 |

**Was data lost?** No. The dump text survives inside `cycle.items` (I verified the
raw string is present in localStorage). The only loss is the mid-wait edit.
**Did the app say something true?** Eventually, yes — "Extraction failed. Items
are raw — fill in the next action yourself." is accurate and actionable. But it
says it 12 decisions too late, and it says nothing at all during the 90 s.
**Could he recover without a reload?** No. During the wait there is no control
he can operate. After the wait, yes.

### Feature requests

1. **A cancel affordance with an honest clock on the extracting state.**
   *Problem it solves:* a 90-second dead wait with no motion and no exit reads as
   a crash, and the user's only recovery is a reload — which (see Ola/G5) can
   silently convert their good dump into raw fragments. "Extracting… (up to a
   minute) · Cancel" costs one line and removes the whole class.
2. **Show the extraction-failure banner on the *ordering* screen, not just Today.**
   *Problem it solves:* the user currently spends the most expensive part of the
   ritual — the forced choices — without the one fact that explains what they are
   looking at. Ranking raw fragments is a different (worse) task and they deserve
   to know they are doing it.

---

## Nadia — the key is revoked mid-cycle

### What I did

Started on `mode: "ok"`, dumped, ordered, reached Today with a live key. Then
revoked it by re-routing (a later `page.route` takes precedence):

```js
await s.page.route("**/api.anthropic.com/**", route => route.fulfill({
  status: 401, contentType: "application/json",
  body: JSON.stringify({ error: { type: "authentication_error", message: "invalid x-api-key" } })
}));
```

Then drove one item to its third deferral to trigger the verdict call.

### What she sees

`c3-nadia-01-401-verdict.png`:

```
That API key was rejected. The verdict below is the default.

THIRD DEFERRAL
Draft the three funding slides
Deferred three times with no external blocker named.
READS AS NOT A COMMITMENT.
[Strike it]  [Keep, it's blocked on someone]
```

The banner is **true, specific, and unusually honest** — it names the failure and
warns her the verdict is machine default. Credit where due; this is the best
failure message in the app.

But everything after it is wrong.

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **BLOCKER** | A rejected key mid-cycle gives me some way to paste a new one | There is none. `settings` is *not* cleared on this path (verified: `spine.v1.settings` still holds the dead key), the key screen is unreachable from Today, and a reload boots straight back to Today. The only repair is `localStorage.removeItem('spine.v1.settings')` in devtools. She is locked into a cycle whose model calls will fail forever |
| **MAJOR** | A default verdict is not written into the permanent record as if it were a judgement | I clicked "Strike it". `item.struckReason` was set to the *fallback string*, and the ledger now reads `01 Board deck — Deferred three times with no external blocker named.` forever. A machine default is inscribed as the reason a real commitment was killed |
| **MAJOR** | The default verdict does not lean toward destruction | The fallback always sets `recommend: "strike"` and renders "READS AS NOT A COMMITMENT." in the same type as a real verdict. On a dead key the app's advice is always *kill it* — the destructive option, delivered with the same confidence as a considered one |
| **MAJOR** | The banner clears when it stops being true | It does not. After striking, the Today screen still shows "That API key was rejected. The verdict below is the default." above an ordinary Today action. There is no verdict below. The sentence is now simply false, and it persists for the rest of the session |
| **MINOR** | The key-rejected copy is consistent across screens | The dump path says "That key was rejected. Paste a working one — your dump is still here." and *does* clear settings and route to the key screen. The Today path says something different and does neither. Two different behaviours for the same error |

**Was data lost?** No. Item count 8 before and after; the cycle is intact across
the 401 and across a reload.
**Did the app say something true?** Once, yes — and better than most apps manage.
Then it kept saying it after it stopped being true, and it wrote a fabricated
verdict into a permanent ledger as fact.
**Could she recover without a reload?** No — and not *with* one either. This is
the only failure in the cohort with no in-app recovery at all.

### Feature requests

1. **Make the "key rejected" banner carry a control, not just a sentence.**
   *Problem it solves:* the app already knows the key is dead and already has a
   key screen. Right now a revoked key is a dead end that survives reloads, so a
   user whose key rotates mid-week loses the model for the rest of the cycle with
   no path back. A "Paste a new key" button in that banner (returning to Today
   afterwards) closes it. This is a fix, not a fourth screen.
2. **Mark a default verdict as a default, in the ledger as well as on screen.**
   *Problem it solves:* the ledger is the artefact the product exists to
   accumulate, and it is currently capable of recording "the model judged this
   not a commitment" when the model was never reached. Either refuse to write
   `struckReason` from a fallback, or write it with its provenance ("struck
   without a verdict — the model was unreachable").

---

## Ben — 40 items

### What I did

The rig caps at 8, so I routed my own stub returning 40 well-formed objects:

```js
const FORTY = Array.from({ length: 40 }, (_, i) => ({
  title: `Item ${String(i+1).padStart(2,"0")} …`,
  action: `Do the concrete next physical action for item number ${i + 1}`,
  blockedOn: i % 7 === 0 ? "Ada" : "",
  consequence: i % 5 === 0 ? "Nothing breaks." : `Consequence ${i+1}: …`
}));
await s.page.route("**/api.anthropic.com/**", route => {
  const isVerdict = JSON.parse(route.request().postData()).max_tokens === 1000;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    content: [{ type: "text", text: isVerdict ? JSON.stringify(VERDICT) : JSON.stringify(FORTY) }] }) });
});
```

Then clicked through every comparison, counting, timing, and sampling the
progress label every 20 answers.

### Numbers

| | |
|---|---|
| Stated on the first screen | **"1 of 177 choices"** |
| `comparisonBound(40)` | 177 |
| **Comparisons actually required** | **138** |
| Overstatement | **+28%** |
| Last label the user sees | "121 of 177 choices" — then it ends |
| Wall clock at 1.5 s/decision (fast) | **3.5 min** |
| Wall clock at 4 s/decision (realistic for a forced value judgement) | **9.2 min** |
| Ledger at 40 items, 1280×900 | 2.3 screens of scroll, no pagination |
| Ledger at 40 items, 360×640 | **3.2 screens of scroll** |

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **MAJOR** | The number I am shown up front is the number of decisions I will make | "1 of 177" on a screen with no back button and no exit. 177 forced value judgements is an abandonment number. The real cost is 138 — still large, but the app anchors on the worse figure and then never corrects it |
| **MAJOR** | The end of ordering is signposted | It stops dead at 138 while the counter reads 121/177 and drops the user on Today. No "done", no transition. Combined with the overstatement, the one clear moment of relief in the flow is delivered as a surprise |
| **MAJOR** | 3–9 uninterrupted minutes of forced choice is pausable | It is not. There is no back, no save, no exit, and (see Ola) a reload discards every answer. The single longest, most attention-expensive stretch in the product is also its most fragile |
| **MINOR** | After progressing, the ledger keeps my place visible | After 25 Done, the current-item marker (`.entry.at`) sits at y=1459 in a 900px viewport — off screen, `atIsOnScreen: false`, and the page does not scroll to it. The ledger's "where am I" signal is only useful while the cycle is short |
| **MINOR** | 40 items in a ledger stays scannable | 40 undifferentiated rows, 3.2 phone-screens, no grouping between done / struck / open. The ruled-through line does the work of separation but you must scroll past everything to audit it |
| **POLISH** | Repetitive comparisons feel varied | At n=40 the merge stays inside adjacent index bands for long runs ("Item 17 vs Item 18", "Item 19 vs Item 20") — see `c3-ben-01-mid-order.png`. It reads as if the app is asking the same question repeatedly |

**Was data lost?** No.
**Did the app say something true?** Half. "177 choices" is a true *upper bound*
and a false *forecast*; the user has no way to know which they were handed.
**Could the user recover without a reload?** There is nothing to recover from —
but there is also no way to pause, which at 9 minutes is the same problem
wearing a different coat.

### Feature requests

1. **State the bound as a bound, and stop the counter lying at the end.**
   *Problem it solves:* "1 of 177" is a commitment the app does not keep, and it
   is shown at exactly the moment a user decides whether to start. "About 140
   choices — usually fewer" is honest and 28% less frightening. The abrupt end at
   121/177 also currently reads as a bug.
2. **A resumable ordering session (persist answers, not just the final order).**
   *Problem it solves:* at 40 items the sort is a 9-minute uninterruptible task
   that a phone call, a tab discard, or an accidental reload destroys completely.
   Persisting the comparison log would fix Ola's finding and Ben's in one change,
   without adding a back button or letting anyone revise a decision.

---

## Zoe — exactly one item

### What I did

`openSpine({ mode: "ok", items: 1 })`, dumped a single line, then ran the whole
cycle. Afterwards I re-routed extraction to return a literal `[]` to test the
"no obligations" case.

### What she sees

Ordering is **correctly skipped** — `startOrdering()` short-circuits at
`items.length <= 1` and she lands straight on Today. Good. The whole product is:

```
TODAY
Draft the three funding slides
[Done] [Not today]
LEDGER
01 Board deck
```

One click of Done →`Cycle closed. 1 done, 0 struck, 0 carried.` → Start a new
cycle → empty dump screen. Elapsed: about four seconds.

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **MAJOR** | If extraction succeeds and correctly returns "no obligations", the app says so | `[]` is indistinguishable from failure: `if (items.length === 0) { items = fallbackSplit(raw); failed = true; }`. I dumped "nothing much really, just vibing" and got the banner **"Extraction failed. Items are raw"** over a manufactured commitment titled *"nothing much really, just vibing"*, which now sits in the ledger until she strikes it. The app's own system prompt explicitly instructs the model to return `[]` here — the app then treats obedience as failure, lies about it, and fabricates an obligation |
| **MINOR** | The consequence I paid an API call to generate is visible somewhere | In a one-item cycle it never renders. `consequence` appears only on the ordering screen, which is skipped. The extraction's headline output is invisible to exactly the user with the least context |
| **MINOR** | A one-item cycle feels like a commitment | It feels like a to-do checkbox. Dump → one line → Done → "Cycle closed" in four seconds. Nothing about the sequence conveys weight, and the ledger of one struck-through row is not yet an artefact |
| **POLISH** | Closing a cycle is acknowledged on the next screen | With nothing carried, "Start a new cycle" lands on a blank dump screen with an empty banner. There is no trace that a cycle just closed and was archived — same pixels as a cold first run |

**Was data lost?** No; `archive` length 1, all 8/1 items preserved.
**Did the app say something true?** On the `[]` path, no — flatly no. "Extraction
failed" when extraction succeeded is the app's only outright false statement.
**Could she recover without a reload?** From the fabricated item, yes — she can
strike it (three deferrals) or mark it Done. But the false banner cannot be
dismissed.

### Feature requests

1. **Distinguish "the model found nothing" from "the model could not be reached".**
   *Problem it solves:* an empty dump-with-no-obligations currently produces a
   false error *and* a fake commitment, which is the exact opposite of what a
   committer should do. "Nothing in there reads as an obligation. Try again, or
   add detail." is one branch and it removes the app's only lie.
2. **Show the consequence on Today, not only during ordering.**
   *Problem it solves:* the consequence is the product's whole argument for why
   this item and not that one, and it is discarded the moment ordering ends —
   entirely, for one-item cycles. A single dim line under the action makes the
   ranking legible on the screen where the user actually acts.

---

## Ola — reload mid-ordering

### What I did

`mode: "ok"`, 8 items (bound 17, real 12). Answered 7 comparisons, recorded each
pair, checked what was persisted, listened for a `beforeunload` dialog, then
reloaded.

```js
let dialogSeen = null;
s.page.on("dialog", d => { dialogSeen = d.message(); d.accept(); });
await s.page.reload();
```

### What she sees

```
dialog shown on reload?  NONE — no confirmation, no warning
localStorage mid-ordering: { orderedIds: [], cursor: 0, items: 8 }
after reload: screen s-order, "1 of 17 choices",
              A = "Board deck", B = "Ada's offer"
```

The post-reload first pair is **byte-identical to the pre-reload first pair**.
No banner. No acknowledgement. Nothing.

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **MAJOR** | Losing 7 decisions is acknowledged | Silence. No `beforeunload`, no post-reload banner, no "we had to start the ordering again". Seven forced value judgements evaporate and the app behaves as though they never happened |
| **MAJOR** | If progress is lost, it is at least *legibly* lost | It is worse than illegible: it is *deniable*. The counter resets to "1 of 17" and re-asks the identical first question. A user who reloaded for an unrelated reason will read this as déjà vu or a bug, not as data loss. Several will answer differently the second time and end with a ranking they never intended |
| **MAJOR** | Severity scales with the cost of the loss | It does — badly. At 8 items this costs 12 decisions. At Ben's 40 it costs up to 138, i.e. 3–9 minutes. Same silence either way |
| **MINOR** | A tab discard is treated like a reload | It is — which is the real problem. iOS Safari and Chrome background-tab discards are indistinguishable from this, and the ordering screen is exactly where a user with 177 questions ahead of them will switch away |
| — (works) | Today survives a reload | It does, cleanly. `done` count preserved, correct item on screen. The reload hazard is confined to the ordering screen |

**Was data lost?** Yes — every comparison answered. The *items* are safe (all 8
present, `orderedIds: []` is the tell), so nothing irreplaceable is destroyed;
what is destroyed is the user's attention and their willingness to do it again.
**Did the app say something true?** It said nothing, which given that the screen
re-presents the same first question is arguably worse than a false statement.
**Could she recover without a reload?** The reload *is* the event; recovery means
re-answering. She can, and it took 12 more clicks.

### Feature requests

1. **Persist the comparison log and resume the sort where it stopped.**
   *Problem it solves:* the ordering screen is the only place in the app where
   the user's work is held purely in a JS promise chain. Everything else survives
   a reload. Writing each answered pair to the cycle and replaying it on boot
   makes the sort as durable as the rest of the product, and it does not add a
   back button or let any decision be revised.
2. **If resuming is rejected, say the sort restarted.**
   *Problem it solves:* the current silent reset is indistinguishable from a bug,
   and it re-asks the identical first pair. A one-line banner — "The ordering
   started over. Your items are safe." — makes the loss honest, which is the
   minimum bar even if the answers genuinely cannot be kept.

---

## Ryu — localStorage is full

### What I did

Installed a `setItem` override via `addInitScript` so it survives reloads, with
the blocked key held in `sessionStorage` so it can be changed at runtime:

```js
const installer = () => {
  const orig = Storage.prototype.setItem;
  window.__rejected = [];
  Storage.prototype.setItem = function (k, v) {
    let blocked = null;
    try { blocked = sessionStorage.getItem("__blockKey"); } catch (e) {}
    if (blocked === "*" || (blocked && k === blocked)) {
      window.__rejected.push(k);
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    return orig.call(this, k, v);
  };
};
await s.page.addInitScript(installer);
await s.page.evaluate(installer);          // and for the already-loaded page
const block = k => s.page.evaluate(k => k ? sessionStorage.setItem("__blockKey", k)
                                          : sessionStorage.removeItem("__blockKey"), k);
```

Four scenarios: (a) `spine.v1.cycle` blocked mid-cycle, (b) `spine.v1.archive`
blocked at cycle close, (c) `spine.v1.settings` blocked on the key screen,
(d) everything blocked (`"*"`) from the dump onward.

### (a) Mid-cycle saves — **BLOCKER**

Verified the override was live (`QuotaExceededError thrown as expected`), then
marked two items Done and deferred a third.

```
after Done with cycle writes failing:
  banner: ""                       ← nothing
  saysAnythingAboutStorage: false  ← nothing
  ledgerRuled: 1                   ← the UI cheerfully shows the work as done
  rejectedWrites: 2

in-memory vs on-disk after 2 Done + 1 defer:
  uiRuled: 2,  uiDeferralLabels: ["1 deferral"]
  storedDone: 0,  storedDeferrals: 0,  rejectedWrites: 5
stored cycle vs pre-Done snapshot:
  "IDENTICAL — every save since was silently dropped"

AFTER RELOAD:
  currentAction: "Draft the three funding slides"   ← back to item 1
  storedDone: 0,  ruledRows: 0,  banner: ""
```

`saveCycle()` calls `write()` — which *does* return `false` on quota — and throws
the return value away. The user completes real work, watches the ledger rule it
through in red, and loses all of it at the next reload without a single word from
the app. The comment in `write()` says "Callers that are about to delete the
thing they just wrote MUST check it"; the caller that runs on *every single
interaction* does not.

### (b) The archive write at cycle close — **works, and works well**

```
banner: "Out of storage — this cycle was not archived, so it has been left open.
         Free some space and try again."
cycleStillInStorage: true
archiveInStorage: null
cycle preserved byte-for-byte?  "YES — identical"
second attempt while still full:  same banner, inMemoryArchiveLen: 0  (no duplicate)
retry after freeing space:  archiveLen 1, archivedItemCount 8, cycleGone true → dump screen
```

Truthful, specific, names the remedy, rolls the in-memory `archive.unshift` back
so retrying does not duplicate, and destroys nothing. This is the model the rest
of the app should copy.

### (c) The key screen — **works**

```
banner: "Could not save the key — this browser is out of storage."
screen: s-key,  inputStillHasKey: "sk-ant-ryu"
```

True, and it leaves the typed key in the field so nothing is retyped.

### (d) Everything blocked — **BLOCKER**

Dumped, ordered 12 comparisons, reached Today. `storedCycle: null`, `banner: ""`.
Reload → **empty dump screen**. The dump text, the extraction and the entire
ordering session are gone with no message at any point.

### Findings

| Sev | Expected | Actual |
|---|---|---|
| **BLOCKER** | A save that fails says so | `saveCycle()` discards `write()`'s boolean. Every Done, every deferral, every strike is silently dropped. The UI shows the work as saved. It is destroyed at the next reload |
| **BLOCKER** | If the cycle cannot be persisted at all, I am told before I invest in it | With all keys blocked I answered 12 forced choices and reached Today with `localStorage.cycle === null` and a blank banner. Reload → empty dump screen, everything gone |
| **MINOR** | The good archive message is reachable | It is, and it is the best copy in the product — but a user whose storage is full will hit (a) hundreds of times before they ever reach (b), so in practice they never see it |
| — (works) | Archive write failure preserves the cycle | Byte-for-byte identical, retry succeeds, no duplicates |
| — (works) | Key save failure preserves the typed key | It does |

**Was data lost?** (a) Yes — all in-session progress, destroyed at reload.
(d) Yes — the dump, the extraction and the whole sort. (b) and (c) No, nothing.
**Did the app say something true?** (b) and (c) yes, precisely. (a) and (d) it
said nothing at all, while the interface actively asserted the opposite by ruling
completed items through in red.
**Could the user recover without a reload?** In (a) and (d) the reload is what
reveals the loss, and by then it is unrecoverable. In (b) yes — free space, click
again, it works.

### Feature requests

1. **Make `saveCycle()` check `write()` and raise a persistent banner when it fails.**
   *Problem it solves:* the app already has the return value, the banner
   component, and proven copy for this exact case at cycle close. One
   `if (!write(...))` closes the largest silent-data-loss hole in the product —
   the one where the user sees their commitments ruled through and then loses
   them.
2. **Refuse to leave the dump screen when the cycle cannot be written.**
   *Problem it solves:* scenario (d) spends 12 forced choices and a 90-second
   model call on a cycle that provably cannot be stored. Checking the first
   `saveCycle()` before `startOrdering()` and keeping the user (and their dump
   text) on the dump screen turns a total loss into a recoverable message.

---

## Extra probes

### P1 — empty and whitespace-only dump · **MINOR**

`dumpGo` with an empty textarea, then with `"   \n\n\t   \n  "`. Both times:
screen unchanged, `banner: ""`, body text still just `DUMP / Extract items`, and
the only response is `dumpText.focus()`. **The button is a silent no-op.** If the
textarea already has focus — which it does after closing a cycle, because the
"Start a new cycle" handler calls `dumpText.focus()` — there is *zero* feedback. Expected:
one line saying there is nothing to extract. Actual: nothing, twice.

### P2 — one enormous single line, extraction failed · **MAJOR**

353 characters, zero newlines, `mode: "http500"`. `fallbackSplit` splits on `\n`,
finds one line, and produces **a single item whose action is the entire dump**:

```
itemCount: 1
title:  "i need to finish the board deck and also ada is …"
action: "i need to finish the board deck and also ada is waiting on her offer letter
         which i said friday and contoso auto renews on the thirtieth and the offsite
         venue is unbooked and marcus perf review is late and the data migration has
         no owner and jess wants notes on her deck and my march expenses are unfiled
         and honestly i have not slept properly in a week"
```

Ordering is skipped (n=1). Today renders that paragraph as the `.action-line` in
display type at 497px tall, and the page already scrolls (933 > 900) on desktop.
The user is now asked "Done or Not today?" about their entire week as one
indivisible object — and the only honest answer is Not today, three times, into a
verdict about a paragraph. The banner is true but the fallback's newline
assumption is wrong for exactly the user the app describes ("prose, fragments,
half-sentences"). Splitting on sentence boundaries as well as newlines would cost
one regex.

### P3 — duplicate identical lines · **MINOR**

`"call the bank"` ×4 with extraction failing. The ordering screen asks:

> **Which one hurts more if it slips?**
> call the bank
> call the bank

`identical: true`. Four comparisons of a thing against itself, then a ledger of
four identical rows. Nothing dedupes, and the forced choice — the app's central
mechanic — is rendered absurd. See `c3-probe-03-duplicates.png`.

### P4 — emoji and RTL · **MINOR / POLISH**

Five lines: emoji, Arabic, mixed Hebrew-in-English, a ZWJ family sequence, and a
U+202E bidi override.

- Emoji and the ZWJ family sequence render correctly and are not broken by the
  48-char truncation.
- **No `dir="auto"` anywhere.** Every container computes `direction: ltr`, so the
  Arabic row renders with its ellipsis at the visually-left end and detached from
  its `01`-style row number (`c3-probe-05-rtl-today.png`, row 02). Readable, but
  visibly wrong to anyone who reads it.
- **The U+202E override is stored and rendered raw**, so ledger row 05 displays
  as `ereh txet edirrevo desrever`. In a record whose stated purpose is to be
  permanent and truthful, text that can reverse its own display is worth
  stripping. **POLISH**, but cheap.
- Truncation is by JS `.slice(48)` on code units, not graphemes. It did not split
  a surrogate pair in my samples, but it can.

### P5 — very long single action string · **MINOR**

A 1575-character action with a 240-character consequence.

- Ordering screen: both choices fit, no clipping, `bBelowFold: false`. Fine.
- Today: `actionLen: 1575`, `scrollH: 2553` vs `innerH: 900`, and
  **`buttonsBelowFold: true`** — Done and Not today are pushed off screen with no
  indication they exist. `.action-line` has `overflow-wrap: break-word` but no
  clamp. The ledger row swells to a 121-character line.

The realistic route here is P2's fallback, not the model — but it means a failed
extraction on a wordy dump can hide the only two controls on the screen.

### P6 — rapid double-click on Done · **MAJOR (one real skip bug)**

Three input patterns, three different outcomes:

| Input | Result |
|---|---|
| `dblclick()` (real mouse, two clicks + dblclick) | Safe. One item done, cursor 0 → 1 |
| Two fast `Enter` presses on the focused button | Safe. One item done, cursor 0 → 1 |
| Two synchronous `.click()` calls on the same node | **Skips an item** |

The third case models a touch double-fire or a double activation from assistive
tech. `advance()` re-renders synchronously, so the second click hits the
*detached* button whose closure still holds the old item — it re-marks the
already-done item done (harmless) and then calls `advance()` a second time,
moving the cursor one extra place:

```
ranked order: [Board deck, Ada's offer, Contoso renewal, …]
after a double-fire on Done (rank 1):
  done: ["Board deck"]
  onScreen: "Email Contoso to cancel the auto-renew"   ← rank 3
  cursor: 2
  liveSkipped: ["Ada's offer"]                          ← rank 2, never shown
```

`Ada's offer` — the #2 commitment, the one with a named human waiting — is jumped
over silently. It is not lost (the cursor wraps, so it resurfaces at the end of
the pass), but it is **demoted from second to last in a product whose entire
thesis is that the order is the point.** Contrast this with `defer()`, which is
explicitly guarded by a `deferring` flag and a comment about exactly this hazard;
`done` has no such guard.

### P7 — double-click the reason chips and "Not today" · **no defect found**

- Chip `dblclick`: one deferral recorded (`Board deck:1`), not two. The
  `deferring` guard plus the re-render holds.
- "Not today" `dblclick`: one reason row, one text input, four buttons. Clean.
- "Strike it" and "Start a new cycle" `dblclick`: single effect, `archiveLen: 1`,
  no duplicate archive entry.

### G1/G2 — the verdict call fails on something that is not a 401 · **BLOCKER**

Two cases: a 200 with an unparseable body (`mode: "garbage"`), and a hung
connection (verdict clock is 45 s; shortened in-page the same way as Ivan's).

**During the hang**, the third-deferral screen is:

```
THIRD DEFERRAL
Draft the three funding slides
Reading the reasons…
```

`buttons: []` — **not a single operable control for 45 seconds**, mid-confrontation
(`c3-gap-02-verdict-waiting.png`). The only exit is a reload, which is itself
destructive (see G4).

**Afterwards**, on both the garbage and the hang path:

```
banner: ""
THIRD DEFERRAL
Draft the three funding slides
Deferred three times with no external blocker named.
READS AS NOT A COMMITMENT.
[Strike it]  [Keep, it's blocked on someone]
```

The banner is **empty**. `rejectedKey(e)` is only true for 401/403, so on a
timeout, a 500, or an unparseable body the app renders its canned fallback
verdict **with no indication that it is a fallback** — in the same typography, at
the same authority, at the highest-stakes decision point in the product, always
recommending strike. Nadia at least got a warning. A user on a flaky connection
gets a fabricated judgement presented as the model's.

Additionally, on the garbage run the stale `"Extraction failed. Items are raw…"`
banner from the dump was still displayed above the confrontation many
interactions later. Banners are never cleared on the Today screen.

### G3 — the failure banner does not survive a reload · **MAJOR**

After a failed extraction, reload the Today screen: `banner: ""`, and the raw
items remain raw forever. The *state* is permanent; the *explanation* lasts one
session. A user returning the next morning sees eight fragments with no
consequences and no reason why.

### G4 — reload during the verdict call · **BLOCKER**

`defer()` pushes the third deferral and calls `saveCycle()` *before* `confront()`
awaits the model. Reload during that await:

```
itemState: "live",  itemDeferrals: 3,  struckReason: ""
ledgerLabelForIt: "01 Board deck — Kept — blocked on someone"
confrontationOffered: false
```

Because `settled()` treats "live with ≥3 deferrals" as parked, the item is now
recorded in the permanent ledger as **"Kept — blocked on someone"** — with nobody
named, and with the user never having been shown the choice. The confrontation,
which is the single mechanism the product exists for, is skipped, and the ledger
asserts something false.

Recovery exists but is invisible: the item is still `currentItem()`, so Today
shows it with Done / Not today, and a *fourth* "Not today" re-triggers
`confront()`. Nothing communicates this, and the screen simultaneously offers her
an ordinary Today action while the ledger below says it is already parked.

### G5 — reload during extraction · **MAJOR**

Reloading while the extraction is in flight aborts the fetch; the rejection
handler runs before teardown, so `fallbackSplit` writes a **raw cycle** and then
the page reloads:

```
screen: s-order
dumpValue: ""            ← the dump text is cleared and not persisted
cycle: { items: [3 raw items with consequence: ""], orderedIds: [] }
```

She reloads to escape a wait that looked frozen and lands on the ordering screen
with raw fragments, `orderedIds: []`, and — because the banner is in-memory only
(G3) — **no explanation whatsoever**. A user who reloads a hung extraction is
punished with a silently degraded cycle. Ivan's missing Cancel button and this
finding are the same wound from two directions.

---

## Summary of the pattern

Two failure paths in this app are exemplary — the rejected key on the dump screen
and the archive write at cycle close. Both check their return value, say
something true and specific, name the remedy, and preserve everything. The
copy in both ("your dump is still here", "it has been left open") is better than
most shipped software.

Every other failure path in the product does the opposite, and the defect is
structural rather than scattered:

- `write()` returns a boolean. `saveCycle()` — the function that runs on every
  Done, every deferral, every strike — throws it away.
- `ask()` has a fallback for everything. Only the 401 branch announces itself.
- Banners are written to a screen the user may not be on yet (Ivan), are never
  cleared when they stop being true (Nadia, G1), and evaporate on reload while
  the state they describe is permanent (G3).
- The two long waits (90 s extraction, 45 s verdict) offer no cancel and no
  clock, so the natural user response is a reload — and a reload during either
  one is destructive (G4, G5).

A tool that fails silently on the one week it mattered is worse than no tool.
This one has already proven it knows how to fail loudly; it just does not do it
in the places where a real week will break it.
