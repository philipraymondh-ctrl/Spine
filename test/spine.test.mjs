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
  const bound = Number(label.match(/of (\d+) choices/)[1]);
  check("progress reads 'N of M choices'", /^\d+ of \d+ choices$/.test(label.trim()), label);
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
// 4. third deferral blocks advance; strike is permanent
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

  const defer = async reason => {
    await page.locator("#today-body button", { hasText: "Not today" }).click();
    await page.locator("#today-body button", { hasText: reason }).click();
    await page.waitForTimeout(20);
  };

  // The cursor must wrap: a single forward pass caps every item at one
  // deferral, which would make the third-deferral rule unreachable.
  const first = await page.locator(".action-line").textContent();
  await defer("No time");
  const second = await page.locator(".action-line").textContent();
  check("deferring moves to the next open item", second !== first);
  await defer("No time");
  const wrapped = await page.locator(".action-line").textContent();
  check("cursor wraps back to the still-open item", wrapped === first, wrapped);
  const carriedDeferrals = await page.evaluate(t =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items
      .find(i => i.action === t).deferrals.length, first);
  check("deferral history survives the wrap", carriedDeferrals === 1, String(carriedDeferrals));

  await defer("No time");   // first item: 2nd deferral
  await defer("No time");   // second item: 2nd deferral, wraps back
  check("back on the first item for its third",
    await page.locator(".action-line").textContent() === first);

  const cursorBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).cursor);
  await defer("Blocked");
  await page.waitForSelector(".verdict", { timeout: 5000 });

  const verdictCall = calls[calls.length - 1];
  check("third deferral fires the verdict call", verdictCall.body.max_tokens === 1000);
  const sent = JSON.parse(verdictCall.body.messages[0].content);
  check("verdict call sends all three deferral reasons", sent.deferrals.length === 3,
    JSON.stringify(sent.deferrals.map(d => d.reason)));

  const cursorAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("spine.v1.cycle")).cursor);
  check("third deferral does NOT advance the cursor", cursorAfter === cursorBefore,
    cursorBefore + " -> " + cursorAfter);

  const btns = await page.locator("#today-body .row button").allTextContents();
  check("exactly two options, no third", btns.length === 2, JSON.stringify(btns));
  check("options are Strike it / Keep",
    btns.includes("Strike it") && btns.includes("Keep, it's blocked on someone"));
  check("verdict text is displayed",
    (await page.locator(".verdict p").textContent()).includes("deferred this three times"));

  await page.locator("button", { hasText: "Strike it" }).click();
  const struck = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("spine.v1.cycle")).items.find(i => i.state === "struck"));
  check("Strike it records state + reason", !!struck && struck.struckReason.length > 0);
  check("struck item stays ruled through in the ledger",
    await page.locator(".entry.ruled").count() === 1);
  const strikeStyle = await page.locator(".entry.ruled .l").evaluate(n =>
    getComputedStyle(n, "::after").transform);
  check("strike is drawn at a slight angle", strikeStyle !== "none" && strikeStyle !== "", strikeStyle);

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
    await page.locator("#today-body button", { hasText: "Not today" }).click();
    await page.locator("#today-body button", { hasText: "Not real" }).click();
    await page.waitForTimeout(30);
  }
  await page.waitForSelector(".verdict", { timeout: 5000 });
  check("unparseable verdict falls back to the strike-biased default",
    (await page.locator(".verdict p").textContent()).includes("no external blocker named"));
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
    await page.locator("#today-body button", { hasText: "Not today" }).click();
    await page.locator("#today-body button", { hasText: "Blocked" }).click();
    await page.waitForTimeout(20);
  }
  await page.waitForSelector(".verdict", { timeout: 5000 });
  await page.locator("button", { hasText: "Keep, it's blocked on someone" }).click();

  const closed = await page.locator(".closed p").textContent();
  check("keeping a blocked item parks it and closes the cycle",
    closed === "Cycle closed. 2 done, 0 struck, 1 carried.", closed);
  check("a kept item is marked blocked in the ledger",
    (await page.locator("#ledger-body").textContent()).includes("Kept — blocked"));
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

await browser.close();
server.close();

const failed = results.filter(r => !r.ok);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " passed");
if (failed.length) { console.log("FAILURES:\n" + failed.map(f => " - " + f.name + " :: " + (f.detail || "")).join("\n")); process.exit(1); }
