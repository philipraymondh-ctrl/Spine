# Spine

A committer, not a ranker. A spreadsheet ranks; this makes overturning a decision
cost something, and makes the record of what you decided *not* to do the durable
artefact.

Programme-shaped work with no direct reporting lines produces threads you can
advance but never close. The cost is not misranking — it is **re-ranking**:
re-deciding each morning what was already decided, because nothing forces
yesterday's call to hold.

First user: Philip. There is no second user yet.

## Running it

`spine.html` is the whole application. No build step, no npm, no bundler, one
webfont link.

Serve it over `http://` or `https://` — **not** `file://`. A `file://` page sends
a `null` origin and the API call fails CORS.

```sh
npx serve .          # then open http://localhost:3000/spine.html
```

On first run it asks for an Anthropic API key. The key is stored in
`localStorage` on that device and is sent to `api.anthropic.com` and nowhere
else. It is never written into the file — this repo is public and contains no
credential.

## The three screens

A linear flow that returns to screen 3. Not a tab bar.

1. **Dump** — one textarea. Everything you're carrying, unorganised.
2. **Order** — pairwise forced choice: *which one hurts more if it slips?*
   Merge-sorted, so the number of choices is ~n·log n rather than n².
   No back button. Reversing here is the behaviour the tool exists to prevent.
3. **Today** — one item, one action, two buttons. Below the fold, the ledger:
   every item in the cycle, done and struck ones ruled through and still
   visible. It only ever gets shorter between resets.

### The rule that makes it work

On the **third** deferral of the same item the walk does not advance. The model
is asked whether this is a real commitment or a genuine external block, and
there are two buttons: **Strike it** or **Keep, it's blocked on someone**. There
is no third option, and the bias is toward striking.

The cursor therefore **wraps** over whatever is still open. A single forward pass
would let every item be deferred at most once, which would make the rule above
unreachable — see `docs/DECISIONS.md`. A cycle ends when every item is done,
struck, or kept-because-blocked, which bounds it at three passes and makes
"carried" mean *blocked on a person* and nothing else.

## Where the model is load-bearing

Exactly one place: turning a week's ambient prose into discrete units that each
carry a **next physical action** and a **what breaks if this slips two weeks**
consequence. Regex cannot write the consequence field.

Ranking is not model work and is not done by the model here.

Both calls fail open. On any non-200, timeout, or unparseable body the dump is
split on newlines into raw items and a banner says so. The flow is never blocked
on the model.

## Storage

Three `localStorage` keys, version-prefixed. A schema change is a drop and reset.

```
spine.v1.settings  → { apiKey, createdAt }
spine.v1.cycle     → { id, startedAt, items[], orderedIds[], cursor }
spine.v1.archive   → [ Cycle, ... ]   // closed cycles, newest first
```

## Tests

The application has no dependencies. The test harness does — it drives the real
page in a real browser.

```sh
npm install
npm test
```

## Deliberately not built

Editing the order after it is set (this is the entire mechanism) · calendar or
reminder sync · more than one live cycle · tags, projects, areas, or any second
axis of organisation · search, or any view of the archive beyond the current
cycle · streaks, counts, or any number that rewards volume · a fourth screen ·
a settings page.
