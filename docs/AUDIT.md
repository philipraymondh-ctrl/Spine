# Audit of v1

Read of `spine.html` as shipped in `bffa02d`. Nine findings. Seven fixed in
v2; two are recorded as accepted limitations.

Severity is about what the user loses, not how hard it is to hit.

---

## F1 — Closing a cycle could destroy it · **high** · fixed

`write()` swallowed the exception from `localStorage.setItem`. The cycle-close
handler archived and then deleted:

```js
archive.unshift(cycle);
write(K_ARCHIVE, archive);          // may silently do nothing
localStorage.removeItem(K_CYCLE);   // deletes it anyway
```

On a quota error the cycle is removed from storage having never been written to
the archive. The whole cycle — the durable artefact the product exists to
accumulate — is gone, with no error and nothing on screen.

The archive is append-only and never pruned, so quota is reached eventually by
design, not by accident.

**Fix:** `write()` returns a boolean. The close handler rolls the archive back,
leaves the cycle open, and says so. Regression test simulates a full quota on
the archive key alone and asserts the cycle survives, then that closing works
once storage recovers and the archive ends up with exactly one copy.

## F2 — No request timeout · **high** · fixed

The spec requires falling back on "any non-200, **timeout**, or unparseable
body". There was no timeout. A hung connection left *Extracting…* on a disabled
button forever, with reload the only way out — and at the confrontation it
stranded the user mid-item with no way to strike or keep.

**Fix:** `AbortController` on both calls — 90s extraction, 45s verdict. Test
stubs a route that never resolves and asserts the flow reaches Screen 3 with
the button released.

## F3 — A rejected key looked like a bad extraction · **medium** · fixed

401 and 403 produced the same *"Extraction failed. Items are raw"* banner as a
malformed response. With one setting in the whole app, the one failure it must
name is the setting being wrong — otherwise the user blames the model and never
touches the key.

**Fix:** on 401/403 the stored key is cleared and the key screen returns with
*"That key was rejected. Paste a working one — your dump is still here."* The
dump is preserved across the detour. Not a settings page: it is the same
first-run screen, which is where the one setting already lives.

## F4 — Confrontation buttons moved under the cursor · **medium** · fixed

v1 ordered **Strike it** and **Keep** by the model's recommendation, so the two
buttons swapped position between renders. This is the highest-stakes click in
the app and users click by position; a mis-click strikes a real commitment or
keeps a fake one.

**Fix:** fixed order, Strike first always — the bias is toward striking. The
recommendation is carried by a line of text above the buttons. Tested under
both recommendations.

## F5 — A double-tap counted twice · **medium** · fixed

Reason chips had no guard. Two fast taps appended two deferrals, which could
carry an item from its first deferral past its third without ever showing the
confrontation, or fire two verdict calls.

**Fix:** a re-entrancy flag around `defer()`. Tested by asserting exactly three
deferrals are recorded across a full confrontation run.

## F6 — `unfence` ate backticks belonging to the content · **low** · fixed

`replace(/```(?:json)?/gi, "")` stripped every fence anywhere in the payload,
including inside an action or consequence.

**Fix:** strip only at the boundaries. Tested with an action containing an
inner fence.

## F7 — Screen 3 announced nothing · **low** · fixed

The single action line is replaced in place, so a screen-reader user got no
announcement when the item changed. Added `aria-live="polite"`.

---

## Accepted, not fixed

**A1 — Reloading mid-sort discards the answers already given.** `boot()`
restarts ordering from scratch. Persisting partial merge-sort state is a real
chunk of machinery, and the window is one screen long. It is off-thesis for a
tool about not re-deciding things, so it is written down rather than dismissed
— if it bites in practice, the fix is to persist the comparison results and
replay them as a memoised comparator.

**A2 — The archive grows without bound.** Correct by design: nothing is ever
deleted. F1's fix turns the eventual quota wall from silent data loss into a
visible, recoverable message, which is the right behaviour for now. A pruning
policy would need a decision about what is allowed to be forgotten, and that is
the user's call, not the code's.
