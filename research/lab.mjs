// Shared rig for the persona sessions. Serves spine.html over http (it cannot
// run from file://) and stubs the Anthropic call so no key is needed.
//
//   import { openSpine, REAL_DUMP } from "./lab.mjs";
//   const { page, close } = await openSpine();          // happy path
//   const { page, close } = await openSpine({ mode: "http500" });
//
// modes: ok | http500 | unauthorized | garbage | hang | slow
// Set `items` to control how many obligations extraction returns.

import { chromium } from "playwright";
import http from "http";
import fs from "fs";

export const REAL_DUMP = `board deck for thursday, still no funding slides
ada's offer letter — she said she'd wait til friday but that was last friday
contoso renewal auto-renews on the 30th, need to actually cancel it
offsite venue, everyone keeps asking, i keep not booking
marcus perf review is overdue and HR keeps pinging
the data migration thing nobody owns
promised jess i'd look at her deck
expenses from march`;

const EXTRACTION = [
  { title: "Board deck", action: "Draft the three funding slides", blockedOn: "",
    consequence: "Thursday's board meeting has no funding ask." },
  { title: "Ada's offer", action: "Send Ada the signed offer letter", blockedOn: "Ada",
    consequence: "Ada accepts the competing offer and the role reopens." },
  { title: "Contoso renewal", action: "Email Contoso to cancel the auto-renew", blockedOn: "",
    consequence: "You are billed for another year on the 30th." },
  { title: "Offsite venue", action: "Book the venue for the offsite", blockedOn: "",
    consequence: "Nothing breaks." },
  { title: "Marcus review", action: "Write Marcus's performance review", blockedOn: "",
    consequence: "The HR cycle closes without his review in it." },
  { title: "Data migration", action: "Name an owner for the data migration", blockedOn: "",
    consequence: "Nothing moves and nobody notices for another month." },
  { title: "Jess's deck", action: "Read Jess's deck and send her three notes", blockedOn: "",
    consequence: "Jess presents it unreviewed." },
  { title: "March expenses", action: "File the March expenses", blockedOn: "",
    consequence: "They fall outside the claim window." }
];

const VERDICT = { verdict: "You have deferred this three times and named nobody who is holding it up. That makes it a wish, not a commitment.", recommend: "strike" };

export async function openSpine(opts = {}) {
  const mode = opts.mode || "ok";
  const items = opts.items === undefined ? 8 : opts.items;
  const viewport = opts.viewport || { width: 1280, height: 900 };

  const html = fs.readFileSync(new URL("../spine.html", import.meta.url), "utf8");
  const server = http.createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise(r => server.listen(0, r));
  const url = "http://127.0.0.1:" + server.address().port + "/";

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, ...(opts.context || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.route("**/api.anthropic.com/**", async route => {
    const body = JSON.parse(route.request().postData());
    const isVerdict = body.max_tokens === 1000;
    if (mode === "hang") return new Promise(() => {});
    if (mode === "slow") await new Promise(r => setTimeout(r, 2500));
    if (mode === "http500") return route.fulfill({ status: 500, body: "err" });
    if (mode === "unauthorized") return route.fulfill({ status: 401,
      contentType: "application/json", body: JSON.stringify({ error: { type: "authentication_error" } }) });
    if (mode === "garbage") return route.fulfill({ status: 200,
      contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: "Sorry, no." }] }) });
    const text = isVerdict ? JSON.stringify(VERDICT) : JSON.stringify(EXTRACTION.slice(0, items));
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text }] }) });
  });

  if (opts.withKey !== false) {
    await page.addInitScript(() => localStorage.setItem("spine.v1.settings",
      JSON.stringify({ apiKey: "sk-ant-lab", createdAt: new Date().toISOString() })));
  }
  await page.goto(url);

  return {
    page, browser, url, errors,
    shot: async name => {
      await page.screenshot({ path: new URL("./findings/" + name + ".png", import.meta.url).pathname, fullPage: true });
    },
    // Answer the pairwise screen until it ends. pick: "a" | "b" | "alt"
    order: async (pick = "a") => {
      let n = 0;
      while (await page.locator("#s-order").evaluate(x => x.classList.contains("on"))) {
        if (++n > 80) throw new Error("ordering did not terminate");
        await page.locator(pick === "alt" ? (n % 2 ? "#pick-a" : "#pick-b") : "#pick-" + pick).click();
        await page.waitForTimeout(20);
      }
      return n;
    },
    dump: async (text = REAL_DUMP) => {
      await page.locator("#dump-text").fill(text);
      await page.locator("#dump-go").click();
    },
    close: async () => { await browser.close(); server.close(); }
  };
}
