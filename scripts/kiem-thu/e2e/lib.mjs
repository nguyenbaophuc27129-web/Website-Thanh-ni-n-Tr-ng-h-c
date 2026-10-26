import { chromium } from "playwright";
import { readFileSync } from "node:fs";
export const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
export const PW = readFileSync("/staging/test-password.txt", "utf8").trim();
const results = [];
export const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
export const summary = () => { const f = results.filter((r) => !r.ok).length; console.log(`\n${results.length - f}/${results.length} PASS`); process.exitCode = f ? 1 : 0; };
export async function browserAs(username) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.text().includes("[TNTH]")) console.log("   [console]", m.text().slice(0, 200)); });
  if (username) {
    const r = await ctx.request.post("/api/auth/login", { data: { username, password: PW } });
    if (!r.ok()) throw new Error(`login ${username} ${r.status()}`);
  }
  return { browser, ctx, page };
}
