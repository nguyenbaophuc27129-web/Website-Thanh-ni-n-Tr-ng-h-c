// Nhóm D — mở trang công khai + quản trị theo từng vai trò, bắt lỗi console / trang trắng / ghi lạ
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { check, summary } from "./lib.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3104";
const PW = readFileSync("/staging/test-password.txt", "utf8").trim();

const PUBLIC = ["/", "/tin-tuc", "/tin-tuc/d-bai-cong-khai", "/dien-dan", "/dien-dan/973001", "/tai-nguyen", "/van-ban",
  "/bang-xep-hang", "/thi-kien-thuc", "/thi-kien-thuc/D-OPEN", "/hoc-sinh-3-tot", "/tai-khoan", "/du-an-tinh-nguyen",
  "/diem-danh/973001", "/phan-anh", "/an-toan-hoc-duong", "/nhan-tai"];
const ADMIN = ["/quan-tri", "/quan-tri/hoat-dong", "/quan-tri/hoat-dong/973001", "/quan-tri/nhiem-vu", "/quan-tri/nhiem-vu/xac-nhan",
  "/quan-tri/nhiem-vu/cham-diem", "/quan-tri/nhiem-vu/phan-cong/973003", "/quan-tri/bao-cao", "/quan-tri/thong-ke",
  "/quan-tri/bang-xep-hang", "/quan-tri/truc-tiep", "/quan-tri/van-ban", "/quan-tri/thong-bao", "/quan-tri/phan-anh",
  "/quan-tri/tai-nguyen", "/quan-tri/hs3t", "/quan-tri/thi", "/quan-tri/du-an", "/quan-tri/danh-ba", "/quan-tri/xuat-ban",
  "/quan-tri/dong-gop", "/quan-tri/dien-dan", "/quan-tri/chuong-trinh"];

const PLAN = [
  [null, PUBLIC],
  ["t.dv1", PUBLIC],
  ["t.tw", [...ADMIN, "/", "/dien-dan/973001", "/tai-khoan"]],
  ["t.tinh", [...ADMIN, "/"]],
  ["t.cap3", ADMIN],
  ["t.donvi", [...ADMIN, "/tai-khoan"]],
  ["t.btv", [...ADMIN, "/"]],
];

const IGNORE = [/Failed to load resource/, /favicon/, /Download the React DevTools/,
  /net::ERR_/, /picsum|unsplash|images\./i];

const browser = await chromium.launch();
for (const [user, paths] of PLAN) {
  const who = user ?? "khách";
  const ctx = await browser.newContext({ baseURL: BASE });
  if (user) {
    const r = await ctx.request.post("/api/auth/login", { data: { username: user, password: PW } });
    if (!r.ok()) throw new Error(`login ${user} ${r.status()}`);
  }
  const page = await ctx.newPage();
  let errors = [];
  const writes = [];
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.some((re) => re.test(m.text()))) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e.message).slice(0, 200)));
  // Lỗi HTTP của API: /api/store, /api/thong-ke là lỗi thật; API khác chỉ ghi nhận (không thuộc nhóm D)
  const httpFails = new Map();
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().includes("/api/")) {
      const k = `${r.status()} ${new URL(r.url()).pathname}`;
      httpFails.set(k, (httpFails.get(k) ?? 0) + 1);
      if (/\/api\/(store|thong-ke)/.test(r.url())) errors.push(`HTTP ${k}`);
    }
  });
  page.on("request", (r) => {
    if (r.url().endsWith("/api/store") && r.method() === "POST") {
      try {
        const b = JSON.parse(r.postData() ?? "{}");
        writes.push(Object.entries(b.entities ?? {}).map(([k, v]) => `${k}:${v.length}`).concat(Object.entries(b.deletes ?? {}).map(([k, v]) => `DEL ${k}:${v.length}`)).join(","));
      } catch { writes.push("?"); }
    }
  });
  for (const p of paths) {
    errors = [];
    const before = writes.length;
    try {
      const resp = await page.goto(p, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2500);
      const text = (await page.locator("body").innerText()).trim();
      const crashed = /Application error|Unhandled Runtime Error|This page couldn.t load/i.test(text);
      const ok = (resp?.status() ?? 0) < 500 && text.length > 80 && !crashed && errors.length === 0;
      const newWrites = writes.slice(before);
      check(`${who} ${p}`, ok, [`HTTP ${resp?.status()}`, `${text.length} ký tự`, ...errors, ...(newWrites.length ? ["GHI " + newWrites.join(" | ")] : [])].join(" · "));
      if (p === "/" ) {
        const st = await page.evaluate(async () => (await (await fetch("/api/thong-ke")).json()));
        check(`${who} /api/thong-ke trả số liệu`, st?.ok === true && typeof st.stats?.hs3tAwarded === "number" && st.stats.activitiesConfirmed >= 1, JSON.stringify(st.stats));
      }
    } catch (e) {
      check(`${who} ${p}`, false, String(e).slice(0, 200));
    }
  }
  if (writes.length) console.log(`   [ghi /api/store của ${who}] ${writes.join(" | ")}`);
  if (httpFails.size) console.log(`   [API khác lỗi của ${who}] ${[...httpFails].map(([k, n]) => `${k} ×${n}`).join(", ")}`);
  await ctx.close();
}
await browser.close();
summary();
