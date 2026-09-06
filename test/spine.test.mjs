import { chromium } from "playwright";
import http from "http";
import fs from "fs";

const HTML = fs.readFileSync(new URL("../spine.html", import.meta.url), "utf8");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(HTML);
});
await new Promise(r => server.listen(0, r));
const URLBASE = "http://127.0.0.1:" + server.address().port + "/";

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS  " : "FAIL  ") + name + (detail ? "  — " + detail : ""));
}

const browser = await chromium.launch();

// ---- API stub -------------------------------------------------------------
let mode = "ok";
let itemCount = 5;
let calls = [];
const ITEMS = [
  { title: "Board deck", action: "Draft the three funding slides", blockedOn: "", consequence: "The March board meeting has no funding ask." },
  { title: "Hiring loop", action: "Send the offer letter to Ada", blockedOn: "Ada", consequence: "Ada takes the other offer." },
  { title: "Vendor renewal", action: "Email Contoso to cancel auto-renew", blockedOn: "", consequence: "You are billed for another year." },
  { title: "Team offsite", action: "Book the venue for the offsite", blockedOn: "", consequence: "Nothing breaks." },
  { title: "Perf reviews", action: "Write Marcus's review", blockedOn: "", consequence: "The HR cycle closes without it." }
];

async function newPage(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", e => check("no uncaught page error", false, e.message));
  await page.route("**/api.anthropic.com/**", async route => {
    const body = JSON.parse(route.request().postData());
    calls.push({ headers: route.request().headers(), body });
    if (mode === "http500") return route.fulfill({ status: 500, body: "nope" });
    if (mode === "unauthorized") return route.fulfill({ status: 401,
      contentType: "application/json", body: JSON.stringify({ error: { type: "authentication_error" } }) });
    if (mode === "hang") return new Promise(() => {});   // never resolves
    if (mode === "garbage")
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: "I'm afraid I can't do that." }] }) });
    const text = body.max_tokens === 1000
      ? '```json\n{"verdict":"You have deferred this three times and named no one.","recommend":"strike"}\n```'
      : "```json\n" + JSON.stringify(ITEMS.slice(0, itemCount)) + "\n```";
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text }] }) });
  });
  return page;
}

/* v3 allows one deferral per item per calendar day. To reach the third
   deferral a test must cross day boundaries: backdate what is stored, then
   reload so the app re-reads it. This also exercises rehydration. */
async function passDays(page, days = 1) {
  await page.evaluate(d => {
    const c = JSON.parse(localStorage.getItem("spine.v1.cycle"));
    c.items.forEach(i => i.deferrals.forEach(x => {
      x.date = new Date(new Date(x.date).getTime() - d * 864e5).toISOString();
    }));
    localStorage.setItem("spine.v1.cycle", JSON.stringify(c));
  }, days);
  await page.reload();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
}

async function deferOnce(page, reason) {
  await page.locator("#today-body button", { hasText: "Not today" }).click();
  await page.locator("#today-body button", { hasText: reason }).click();
  await page.waitForTimeout(40);
}

const visible = (page, id) => page.locator("#" + id).evaluate(n => n.classList.contains("on"));

async function answerOrdering(page, pick = "#pick-a") {
  let guard = 0;
  while (await visible(page, "s-order")) {
    if (++guard > 60) throw new Error("ordering never terminated");
    await page.locator(pick).click();
    await page.waitForTimeout(15);
  }
  return guard;
}

// ===========================================================================
// 1. key screen + persistence
// ===========================================================================
{
  const ctx = await browser.newContext();
  let page = await newPage(ctx);
  await page.goto(URLBASE);
  check("opens on key screen with no key", await visible(page, "s-key"));
  check("key screen copy is exact",
    (await page.locator("#s-key h1").textContent()).trim() ===
    "Paste your Anthropic API key. It stays on this device.");

  await page.locator("#key-input").fill("sk-ant-test");
  await page.locator("#key-save").click();
  check("saving the key advances to dump", await visible(page, "s-dump"));

  await page.reload();
  check("app survives reload (key persisted)", await visible(page, "s-dump"));
  await ctx.close();
}

// ===========================================================================
// 2. dump -> extraction -> all four fields -> ordering -> screen 3
// ===========================================================================
{
  mode = "ok"; calls = [];
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "sk-ant-test", createdAt: "x" })));
  await page.goto(URLBASE);

  await page.locator("#dump-text").fill("board deck, ada's offer, contoso renewal, offsite venue, marcus review");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on", { timeout: 5000 });

  const h = calls[0].headers;
  check("sends anthropic-version header", h["anthropic-version"] === "2023-06-01");
  check("sends direct-browser-access header", h["anthropic-dangerous-direct-browser-access"] === "true");
  check("sends x-api-key from localStorage", h["x-api-key"] === "sk-ant-test");
  check("extraction model is claude-sonnet-5", calls[0].body.model === "claude-sonnet-5",
    calls[0].body.model);
  check("extraction max_tokens has headroom", calls[0].body.max_tokens >= 4000,
    String(calls[0].body.max_tokens));

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")));
  const keysOk = stored.items.every(i =>
    ["id","title","action","blockedOn","consequence","deferrals","state","struckReason"]
      .every(k => k in i) && i.state === "live" && Array.isArray(i.deferrals));
  check("items render with all four fields + full schema", keysOk && stored.items.length === 5);

  // progress label + comparison count
  const label = await page.locator("#order-progress").textContent();
  const bound = Number(label.match(/up to (\d+)/)[1]);
  check("progress states a ceiling, not a false total",
    /^Choice \d+ of up to \d+$/.test(label.trim()), label);
  const consequenceShown = await page.locator("#pick-a .c").textContent();
  check("order screen shows consequence under title", consequenceShown.length > 0);

  const used = await answerOrdering(page);
  // n=5 -> ceiling 5*3 - 8 + 1 = 8; n*log2(n) = 11.6, n^2 = 25
  check("ordering completes within its stated bound", used <= bound, used + " <= " + bound);
  check("ordering is ~n·log n, not n²", used <= 5 * Math.ceil(Math.log2(5)), "used " + used);

  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")));
  check("writes orderedIds and cursor 0",
    after.orderedIds.length === 5 && after.cursor === 0);

  check("lands on Today", await visible(page, "s-today"));
  const bigLines = await page.locator("#today-body .action-line").count();
  check("Screen 3 shows exactly one action at a time", bigLines === 1);
  const shown = await page.locator(".action-line").textContent();
  check("shows the action, not the title",
    ITEMS.some(i => i.action === shown) && !ITEMS.some(i => i.title === shown), shown);

  // Done rules it through and it stays in the ledger
  const first = shown;
  await page.locator("#today-body button", { hasText: "Done" }).click();
  const ruled = await page.locator(".entry.ruled").count();
  check("Done rules the entry through", ruled === 1);
  const ledgerCount = await page.locator(".entry").count();
  check("ledger keeps every item visible", ledgerCount === 5);
  const second = await page.locator(".action-line").textContent();
  check("cursor advances after Done", second !== first);

  await ctx.close();
}

// ===========================================================================
// 3. extraction failure -> newline fallback + banner
// ===========================================================================
for (const failMode of ["http500", "garbage"]) {
  mode = failMode;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("- first thing\n- second thing\n\n- third thing");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on", { timeout: 5000 });
  const items = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).items);
  check("[" + failMode + "] falls back to newline split",
    items.length === 3 && items[0].action === "first thing", JSON.stringify(items.map(i => i.action)));
  check("[" + failMode + "] fallback leaves action/consequence raw",
    items.every(i => i.consequence === "" && i.blockedOn === ""));
  await answerOrdering(page);
  const banner = await page.locator("#today-banner .banner").textContent();
  check("[" + failMode + "] shows the failure banner",
    banner.trim() === "Extraction failed. Items are raw — fill in the next action yourself.", banner);
  await ctx.close();
}

// ===========================================================================
// 4. the day boundary, the wrap, the confrontation, the strike
// ===========================================================================
{
  mode = "ok"; calls = []; itemCount = 2;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("one\ntwo");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  await answerOrdering(page);

  const first = await page.locator(".action-line").textContent();
  await deferOnce(page, "No time");
  const second = await page.locator(".action-line").textContent();
  check("deferring moves to the next open item", second !== first);

  // v3: an item deferred today does not come back today.
  await deferOnce(page, "No time");
  check("the day runs out once everything has been deferred",
    (await page.locator(".action-line").textContent()) === "Nothing left today.");
  check("it says how many threads are still open",
    (await page.locator(".because").textContent()).includes("2 threads are still open"));
  const cyc = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")));
  check("nothing was settled by running out of day",
    cyc.items.every(i => i.state === "live"));

  await passDays(page, 1);
  const backAgain = await page.locator(".action-line").textContent();
  check("tomorrow the deferred item comes back", backAgain === first, backAgain);
  const carriedDeferrals = await page.evaluate(t =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items
      .find(i => i.action === t).deferrals.length, first);
  check("deferral history survives the day boundary", carriedDeferrals === 1);

  await deferOnce(page, "No time");            // day 2, item one -> 2nd
  await deferOnce(page, "No time");            // day 2, item two
  await passDays(page, 1);

  const cursorBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).cursor);
  await deferOnce(page, "Blocked");            // day 3 -> third deferral
  await page.waitForSelector(".verdict", { timeout: 8000 });

  const verdictCall = calls[calls.length - 1];
  check("third deferral fires the verdict call", verdictCall.body.max_tokens === 1000);
  const sent = JSON.parse(verdictCall.body.messages[0].content);
  check("the verdict sees three deferrals on three separate days",
    sent.deferrals.length === 3 &&
    new Set(sent.deferrals.map(d => d.date.slice(0, 10))).size === 3,
    JSON.stringify(sent.deferrals.map(d => d.date.slice(0, 10))));

  const cursorAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).cursor);
  check("third deferral does NOT advance the cursor", cursorAfter === cursorBefore);

  const btns = await page.locator("#today-body .row button").allTextContents();
  check("exactly two options, no third", btns.length === 2, JSON.stringify(btns));
  check("options are Strike it / Keep",
    btns.includes("Strike it") && btns.includes("Keep, it's blocked on someone"));
  check("verdict text is displayed",
    (await page.locator(".verdict p:not(.rec)").textContent()).includes("deferred this three times"));

  // v3 BLOCKER fix: reload must resume the confrontation, not escape it.
  await page.reload();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
  await page.waitForSelector(".verdict", { timeout: 8000 });
  check("reloading resumes the confrontation instead of escaping it",
    await page.locator(".verdict").count() === 1);
  const afterReload = await page.locator("#today-body .row button").allTextContents();
  check("reload still offers only Strike / Keep", afterReload.length === 2, JSON.stringify(afterReload));
  const ledgerWord = await page.locator(".entry .state").first().textContent();
  check("an unresolved confrontation is NOT recorded as kept",
    ledgerWord.trim() !== "kept", ledgerWord);

  await page.locator("button", { hasText: "Strike it" }).click();
  const struck = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items.find(i => i.state === "struck"));
  check("Strike it records state + reason", !!struck && struck.struckReason.length > 0);
  check("confrontingId is cleared after resolving",
    await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).confrontingId) === null);
  check("struck item is ruled through", await page.locator(".entry.is-struck").count() === 1);
  const strikeStyle = await page.locator(".entry.is-struck .l").evaluate(n => getComputedStyle(n));
  check("strike is a real line-through, not a positioned bar",
    strikeStyle.textDecorationLine === "line-through", strikeStyle.textDecorationLine);
  check("strike is drawn at an angle",
    strikeStyle.transform !== "none" && strikeStyle.transform !== "", strikeStyle.transform);

  await ctx.close();
}

// ===========================================================================
// 5. garbage verdict -> defaults to strike
// ===========================================================================
{
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  mode = "ok"; itemCount = 1;
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("only one thing");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on");
  mode = "garbage";
  for (let n = 0; n < 3; n++) {
    await deferOnce(page, "Not real");
    if (n < 2) await passDays(page, 1);
  }
  await page.waitForSelector(".verdict", { timeout: 8000 });
  check("unparseable verdict falls back to the strike-biased default",
    (await page.locator(".verdict p:not(.rec)").textContent()).includes("no external blocker named"));
  await ctx.close();
}

// ===========================================================================
// 6. cycle close -> archive + carried pre-fill
// ===========================================================================
{
  mode = "ok"; itemCount = 3;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("alpha\nbravo\ncharlie");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  await answerOrdering(page);

  await page.locator("#today-body button", { hasText: "Done" }).click();       // 1 done
  await page.locator("#today-body button", { hasText: "Done" }).click();       // 2 done

  // Last one standing: defer it to the confrontation, then keep it as blocked.
  const carriedAction = await page.locator(".action-line").textContent();
  for (let n = 0; n < 3; n++) {
    await deferOnce(page, "Blocked");
    if (n < 2) await passDays(page, 1);
  }
  await page.waitForSelector(".verdict", { timeout: 8000 });
  await page.locator("button", { hasText: "Keep, it's blocked on someone" }).click();
  check("Keep asks who is holding it up",
    await page.locator("input[aria-label='Who is holding this up']").count() === 1);
  await page.locator("input[aria-label='Who is holding this up']").fill("");
  await page.locator("button", { hasText: "Keep it" }).click();
  check("Keep refuses to proceed without a name",
    await page.locator(".closed").count() === 0);
  await page.locator("input[aria-label='Who is holding this up']").fill("Dana");
  await page.locator("button", { hasText: "Keep it" }).click();

  const closed = await page.locator(".closed h1").textContent();
  check("keeping a named blocker parks it and closes the cycle",
    closed === "Cycle closed. 2 done, 0 struck, 1 carried.", closed);
  check("the ledger names who is holding it",
    (await page.locator("#ledger-body").textContent()).includes("Blocked on Dana"));
  check("kept has its own mark, distinct from done and struck",
    await page.locator(".entry.is-kept").count() === 1 &&
    await page.locator(".entry.is-struck").count() === 0);
  check("ledger still visible at close", await page.locator(".entry").count() === 3);

  await page.locator("button", { hasText: "Start a new cycle" }).click();
  check("new cycle opens on the dump screen", await visible(page, "s-dump"));
  const prefill = await page.locator("#dump-text").inputValue();
  check("carried items pre-filled as text", prefill.trim() === carriedAction, JSON.stringify(prefill));
  const arch = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.archive")));
  check("closed cycle is archived newest-first", arch.length === 1 && arch[0].items.length === 3);
  const live = await page.evaluate(() => localStorage.getItem("spine.v1.cycle"));
  check("only one live cycle exists at a time", live === null);
  await ctx.close();
}

// ===========================================================================
// 7. 360px, focus, layout shift, ledger error containment
// ===========================================================================
{
  mode = "ok"; itemCount = 5;
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);

  const shift = await page.evaluate(() => new Promise(res => {
    let total = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => res(total), 700);
  }));
  check("no layout shift on load", shift < 0.01, "CLS " + shift.toFixed(4));

  await page.locator("#dump-text").fill("a long obligation that should wrap rather than overflow the viewport\nsecond");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  const overflowOrder = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check("renders at 360px — order screen does not scroll sideways", !overflowOrder);
  await answerOrdering(page);

  const overflowToday = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check("renders at 360px — Today does not scroll sideways", !overflowToday);

  const tapTargets = await page.locator("#today-body button").evaluateAll(ns =>
    ns.map(n => n.getBoundingClientRect().height));
  check("buttons are at least 44px", tapTargets.every(h => h >= 44), JSON.stringify(tapTargets));

  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { tag: document.activeElement.tagName, w: s.outlineWidth, style: s.outlineStyle };
  });
  check("visible keyboard focus", outline.w !== "0px" && outline.style !== "none",
    JSON.stringify(outline));

  // A thrown error in the ledger must not white out Screen 3.
  await page.evaluate(() => { window.renderLedger = () => { throw new Error("boom"); }; });
  await page.evaluate(() => window.renderToday());
  const stillThere = await page.locator("#today-body .action-line").count();
  check("a thrown error in the ledger does not white out Screen 3", stillThere === 1);
  check("ledger degrades to a message", (await page.locator("#ledger-body").textContent()).length > 0);

  await ctx.close();
}

// ===========================================================================
// 8. §7 — things that must NOT exist
// ===========================================================================
{
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  mode = "ok";
  await page.goto(URLBASE);
  const screens = await page.locator("section.screen").count();
  check("exactly three screens plus the key screen", screens === 4, String(screens));
  await page.locator("#dump-text").fill("alpha\nbravo");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  const backish = await page.locator("#s-order button").allTextContents();
  check("no back button on the ordering screen", backish.length === 2, JSON.stringify(backish.length));
  const src = HTML.toLowerCase();
  for (const [what, needle] of [["no tabs", "tab-bar"], ["no search", "<input type=\"search\""],
                                ["no streaks", "streak"]]) {
    check(what, !src.includes(needle));
  }
  await ctx.close();
}

// ===========================================================================
// 9. v2 — a rejected key is not a failed extraction
// ===========================================================================
{
  mode = "unauthorized"; itemCount = 5;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "sk-bad", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("something real I owe someone");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-key.on", { timeout: 5000 });

  check("401 returns to the key screen, not the fallback",
    await visible(page, "s-key"));
  check("401 says the key was rejected",
    (await page.locator("#key-banner .banner").textContent()).includes("rejected"));
  const cleared = await page.evaluate(() => localStorage.getItem("spine.v1.settings"));
  check("401 clears the bad key", cleared === null);

  // The dump must survive the detour.
  mode = "ok";
  await page.locator("#key-input").fill("sk-good");
  await page.locator("#key-save").click();
  check("a good key returns to the dump", await visible(page, "s-dump"));
  check("the dump survived the rejection",
    (await page.locator("#dump-text").inputValue()) === "something real I owe someone");
  check("the rejection banner clears", await page.locator("#key-banner .banner").count() === 0);
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on", { timeout: 5000 });
  check("extraction proceeds on the replacement key", await visible(page, "s-order"));
  await ctx.close();
}

// ===========================================================================
// 10. v2 — a hung request must not strand the flow
// ===========================================================================
{
  mode = "hang"; itemCount = 5;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => {
    localStorage.setItem("spine.v1.settings", JSON.stringify({ apiKey: "k", createdAt: "x" }));
  });
  await page.goto(URLBASE);
  // Shorten the clock so the test does not wait 90s for the real one.
  await page.evaluate(() => {
    const real = window.ask;
    window.ask = (sys, user, max) => real(sys, user, max, 400);
  });
  await page.locator("#dump-text").fill("alpha\nbravo");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on", { timeout: 8000 });
  check("a hung request times out and falls back", await visible(page, "s-order"));
  const btn = await page.locator("#dump-go").textContent();
  check("the extract button is released after a timeout", btn === "Extract items");
  await answerOrdering(page);
  check("timeout shows the extraction-failed banner",
    (await page.locator("#today-banner .banner").textContent()).includes("Extraction failed"));
  await ctx.close();
}

// ===========================================================================
// 11. v2 — cycle is never destroyed when the archive write fails
// ===========================================================================
{
  mode = "ok"; itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("the only thing");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on");
  await page.locator("#today-body button", { hasText: "Done" }).click();
  await page.waitForSelector(".closed");

  // Simulate a full quota on the archive key only.
  await page.evaluate(() => {
    window.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      const real = window.__realSetItem;
      if (k === "spine.v1.archive") { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; }
      return real.call(this, k, v);
    };
  });
  await page.locator("button", { hasText: "Start a new cycle" }).click();

  const survived = await page.evaluate(() => localStorage.getItem("spine.v1.cycle"));
  check("a failed archive write does NOT delete the cycle", survived !== null);
  check("the storage failure is reported",
    (await page.locator("#today-banner .banner").textContent()).includes("not archived"));
  check("still on Today, cycle left open", await visible(page, "s-today"));

  // And it recovers once storage works again.
  await page.evaluate(() => { Storage.prototype.setItem = window.__realSetItem; });
  await page.locator("button", { hasText: "Start a new cycle" }).click();
  check("closing succeeds once storage recovers", await visible(page, "s-dump"));
  const arch = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.archive")));
  check("archive holds exactly one copy of the cycle", arch.length === 1, "len " + arch.length);
  await ctx.close();
}

// ===========================================================================
// 12. v2 — confrontation buttons hold position; double-tap counts once
// ===========================================================================
for (const rec of ["strike", "keep"]) {
  mode = "ok"; itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.route("**/api.anthropic.com/**", async route => {
    const body = JSON.parse(route.request().postData());
    if (body.max_tokens === 1000)
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        content: [{ type: "text", text: JSON.stringify({ verdict: "Two sentences.", recommend: rec }) }] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(ITEMS.slice(0, 1)) }] }) });
  });
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("one obligation");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on");
  for (let n = 0; n < 3; n++) {
    await deferOnce(page, "No time");
    if (n < 2) await passDays(page, 1);
  }
  await page.waitForSelector(".verdict", { timeout: 8000 });
  const order = await page.locator("#today-body .row button").allTextContents();
  check("[recommend=" + rec + "] Strike it is always first",
    order[0] === "Strike it" && order[1] === "Keep, it's blocked on someone", JSON.stringify(order));
  check("[recommend=" + rec + "] recommendation shown as text, not by position",
    (await page.locator(".verdict .rec").textContent()).length > 0);
  const count = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items[0].deferrals.length);
  check("[recommend=" + rec + "] exactly three deferrals recorded", count === 3, "got " + count);
  await ctx.close();
}

// ===========================================================================
// 13. v2 — unfence keeps backticks that belong to the content
// ===========================================================================
{
  itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.route("**/api.anthropic.com/**", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text",
      text: "```json\n" + JSON.stringify([{ title: "Ship it", action: "Run ```npm test``` and ship",
        blockedOn: "", consequence: "The release slips." }]) + "\n```" }] }) }));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("ship");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on", { timeout: 5000 });
  const action = await page.locator(".action-line").textContent();
  check("fenced payload parses and inner backticks survive",
    action === "Run ```npm test``` and ship", action);
  await ctx.close();
}

// ===========================================================================
// 14. v3 — every interaction is checked against storage
// ===========================================================================
{
  mode = "ok"; itemCount = 2;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("a\nb");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  await answerOrdering(page);

  await page.evaluate(() => {
    window.__real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "spine.v1.cycle") { const e = new Error("Quota"); e.name = "QuotaExceededError"; throw e; }
      return window.__real.call(this, k, v);
    };
  });
  const before = await page.evaluate(() => localStorage.getItem("spine.v1.cycle"));
  await page.locator("#today-body button", { hasText: "Done" }).click();
  const after = await page.evaluate(() => localStorage.getItem("spine.v1.cycle"));
  check("a rejected per-action write is reported, not swallowed",
    (await page.locator("#today-banner .banner").textContent()).includes("NOT saved"));
  check("nothing is silently lost when the write fails", before === after);
  await page.evaluate(() => { Storage.prototype.setItem = window.__real; });
  await ctx.close();
}

// ===========================================================================
// 15. v3 — done, struck and kept are three different marks
// ===========================================================================
{
  mode = "ok"; itemCount = 2;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("a\nb");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  await answerOrdering(page);
  await page.locator("#today-body button", { hasText: "Done" }).click();

  check("a done item is NOT ruled through in correction red",
    await page.locator(".entry.is-done").count() === 1 &&
    await page.locator(".entry.is-struck").count() === 0);
  const doneDecoration = await page.locator(".entry.is-done .l")
    .evaluate(n => getComputedStyle(n).textDecorationLine);
  check("done carries no strike", doneDecoration === "none", doneDecoration);
  const words = await page.locator(".entry .state").allTextContents();
  check("every ledger row states its condition in words",
    words.length === 2 && words.includes("done"), JSON.stringify(words));
  check("the ledger is a list", await page.locator("ul.entries li.entry").count() === 2);
  check("the ledger heading carries a live count",
    (await page.locator("#ledger-count").textContent()).includes("1 done"));

  // The fold has to be real, or the ordering ritual buys nothing.
  const fold = await page.evaluate(() => {
    const l = document.querySelector(".ledger").getBoundingClientRect();
    return { top: Math.round(l.top), vh: window.innerHeight,
             scrolls: document.documentElement.scrollHeight > window.innerHeight };
  });
  check("the ledger sits below the fold", fold.top >= fold.vh,
    "ledger at " + fold.top + " of " + fold.vh);
  check("the page actually scrolls", fold.scrolls);
  await ctx.close();
}

// ===========================================================================
// 16. v3 — the consequence is shown, and [] is not a failure
// ===========================================================================
{
  mode = "ok"; itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("board deck");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
  check("the consequence is shown under the action",
    (await page.locator(".because").textContent()).includes("board meeting"));
  await ctx.close();
}
{
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.route("**/api.anthropic.com/**", route => route.fulfill({ status: 200,
    contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: "[]" }] }) }));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("just some musing, nothing owed");
  await page.locator("#dump-go").click();
  await page.waitForTimeout(400);
  check("an empty extraction is an answer, not a failure",
    await visible(page, "s-dump"));
  check("it says nothing was found, and blames nobody",
    (await page.locator("#dump-banner .banner").textContent()).includes("No obligations found"));
  check("no commitments are invented from the text",
    await page.evaluate(() => localStorage.getItem("spine.v1.cycle")) === null);
  check("the dump is preserved",
    (await page.locator("#dump-text").inputValue()).length > 0);
  await ctx.close();
}

// ===========================================================================
// 17. v3 — deferral history rides across the cycle boundary
// ===========================================================================
{
  mode = "ok"; itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("the thing");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
  for (let n = 0; n < 3; n++) {
    await deferOnce(page, "Blocked");
    if (n < 2) await passDays(page, 1);
  }
  await page.waitForSelector(".verdict", { timeout: 8000 });
  await page.locator("button", { hasText: "Keep, it's blocked on someone" }).click();
  await page.locator("input[aria-label='Who is holding this up']").fill("Ada");
  await page.locator("button", { hasText: "Keep it" }).click();
  await page.waitForSelector(".closed", { timeout: 8000 });
  await page.locator("button", { hasText: "Start a new cycle" }).click();
  check("the carry is announced, not silent",
    (await page.locator("#dump-banner .banner").textContent()).includes("deferral history"));
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
  const inherited = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items[0]);
  check("a carried item keeps the deferrals it earned",
    inherited.deferrals.length === 3, "got " + inherited.deferrals.length);
  check("a carried item keeps who was blocking it", inherited.blockedOn === "Ada");
  await ctx.close();
}

// ===========================================================================
// 18. v3 — a fabricated verdict is labelled as one
// ===========================================================================
{
  itemCount = 1;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  let n = 0;
  await page.route("**/api.anthropic.com/**", route => {
    const body = JSON.parse(route.request().postData());
    if (body.max_tokens === 1000) return route.fulfill({ status: 500, body: "down" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      content: [{ type: "text", text: JSON.stringify([{ title: "T", action: "Do the thing",
        blockedOn: "", consequence: "It breaks." }]) }] }) });
  });
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("the thing");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-today.on", { timeout: 8000 });
  for (let i = 0; i < 3; i++) {
    await deferOnce(page, "No time");
    if (i < 2) await passDays(page, 1);
  }
  await page.waitForSelector(".verdict", { timeout: 8000 });
  check("an unreachable model is admitted, not impersonated",
    (await page.locator("#today-banner .banner").textContent()).includes("not a judgement"));
  check("the default is labelled a default",
    (await page.locator(".verdict .rec").textContent()).includes("Default"));
  await page.locator("button", { hasText: "Strike it" }).click();
  const reason = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items[0].struckReason);
  check("the permanent record does not claim the model judged it",
    reason.includes("not reached"), reason);
  await ctx.close();
}

// ===========================================================================
// 19. v3 — arrival, focus, and a reason row you can back out of
// ===========================================================================
{
  mode = "ok"; itemCount = 2;
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
    JSON.stringify({ apiKey: "k", createdAt: "x" })));
  await page.goto(URLBASE);
  await page.locator("#dump-text").fill("a\nb");
  await page.locator("#dump-go").click();
  await page.waitForSelector("#s-order.on");
  await answerOrdering(page);
  const focused = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    text: (document.activeElement.textContent || "").trim()
  }));
  check("arriving on Today moves focus to its heading",
    focused.tag === "H1" && focused.text === "Today", JSON.stringify(focused));
  check("Today has a real heading", await page.locator("#today-body h1").count() === 1);
  check("the action line is a live region",
    await page.locator("#today-body[aria-live='polite']").count() === 1);

  await page.locator("#today-body button", { hasText: "Not today" }).click();
  check("the reason row offers a way out", await page.locator(".btn-link").count() === 1);
  await page.locator(".btn-link").click();
  check("backing out writes no reason",
    (await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle"))
      .items.every(i => i.deferrals.length === 0))));
  check("backing out returns to Done / Not today",
    (await page.locator("#today-body .row button").allTextContents()).join() === "Done,Not today");
  await ctx.close();
}

// ===========================================================================
// 20. v3 — it works in the dark
// ===========================================================================
{
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await newPage(ctx);
  await page.goto(URLBASE);
  const dark = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const lum = c => {
      const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = lum(cs.backgroundColor), fg = lum(cs.color);
    const hi = Math.max(bg, fg), lo = Math.min(bg, fg);
    return { bg: cs.backgroundColor, ratio: (hi + 0.05) / (lo + 0.05) };
  });
  check("dark mode actually inverts the ledger stock", dark.bg !== "rgb(220, 226, 219)", dark.bg);
  check("body text still passes AA in the dark", dark.ratio >= 4.5, dark.ratio.toFixed(2) + ":1");
  await ctx.close();
}

await browser.close();
server.close();

const failed = results.filter(r => !r.ok);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " passed");
if (failed.length) { console.log("FAILURES:\n" + failed.map(f => " - " + f.name + " :: " + (f.detail || "")).join("\n")); process.exit(1); }
