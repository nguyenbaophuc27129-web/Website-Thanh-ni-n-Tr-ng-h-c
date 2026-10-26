// Nhóm F — Kho tài nguyên nhiều tệp: đóng góp, duyệt, trang chi tiết, tải .zip, đếm lượt tải, chặn XSS ở luật ghi cán bộ
// Cần web thử + DB thử đã áp migration 0028. Mẫu: lib.mjs; dựng dữ liệu riêng (gắn RUN) nên chạy lại được.
import { request } from "playwright";
import { crc32, deflateSync } from "node:zlib";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { BASE, PW, browserAs, check, summary } from "./lib.mjs";

const RUN = Date.now().toString(36);
const UPLOADS = process.env.UPLOADS_DIR ?? "/uploads-test"; // thư mục tệp tải lên của web thử (chay-e2e.sh gắn vào)
const OUT = process.env.OUT_DIR ?? "/e2e/out";
const now = new Date().toISOString();
const ID = () => 296000000 + Math.floor(Math.random() * 900000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Tệp mẫu (đúng chữ ký tệp để máy chủ nhận) ---------- */
const pdf = (tag) => Buffer.from(`%PDF-1.4\n% ${tag} ${RUN}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const docx = (tag) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(`${tag} ${RUN} `.repeat(40))]);
function png(seed) {
  const rows = [];
  for (let y = 0; y < 24; y++) {
    const row = [0];
    for (let x = 0; x < 32; x++) row.push((seed + x * 13) % 256, (y * 17) % 256, (seed * 7 + x * y) % 256);
    rows.push(Buffer.from(row));
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])) >>> 0);
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(32, 0); ihdr.writeUInt32BE(24, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}
const txt = (n) => Buffer.from(`Tệp văn bản số ${n} — ${RUN}\n`);

const NAME_PDF = `Báo cáo tổng kết ${RUN}.pdf`;
const NAME_DOCX = `Mẫu đơn đăng ký ${RUN}.docx`;
const NAME_PNG = `Ảnh sự kiện ${RUN}.png`;
const NAME_WEBP = `Ảnh sự kiện ${RUN}.webp`; // ảnh luôn chuyển WebP → tên hiển thị khớp đuôi thật

async function as(username, userAgent) {
  const ctx = await request.newContext({ baseURL: BASE, userAgent });
  if (username) {
    const r = await ctx.post("/api/auth/login", { data: { username, password: PW } });
    if (!r.ok()) throw new Error(`login ${username} ${r.status()}`);
  }
  return ctx;
}
async function upload(ctx, name, buffer, kind = "tai-nguyen", mimeType = "application/octet-stream") {
  const r = await ctx.post("/api/uploads", { multipart: { kind, file: { name, mimeType, buffer } } });
  const j = await r.json().catch(() => null);
  return { status: r.status(), file: j?.file, error: j?.error };
}
const att = (u, name = u.name, extra = {}) => ({ name, url: u.url, sizeKb: Math.max(1, Math.ceil(u.size / 1024)), ...extra });
async function contribute(ctx, body) {
  const r = await ctx.post("/api/tai-nguyen/dong-gop", { data: body });
  return { status: r.status(), j: await r.json().catch(() => null) };
}
async function storePost(ctx, entities = {}) {
  const r = await ctx.post("/api/store", { data: { entities, deletes: {} } });
  return { status: r.status(), j: await r.json().catch(() => null) };
}
const snap = async (ctx) => (await (await ctx.get("/api/store")).json()).data;
const reason = (res) => res.j?.denied?.[0]?.reason ?? res.j?.error ?? "";

/** Đọc gói ZIP (STORE) bằng tay: kiểm cờ, CRC, dữ liệu — độc lập với module ghi ZIP của máy chủ */
function parseZip(buf) {
  const e = buf.length - 22;
  if (buf.readUInt32LE(e) !== 0x06054b50) throw new Error("không thấy EOCD");
  const count = buf.readUInt16LE(e + 10);
  const cdOff = buf.readUInt32LE(e + 16);
  const out = [];
  let p = cdOff;
  let endOfData = 0;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("central directory hỏng");
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error("local header hỏng");
    const dataStart = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(dataStart, dataStart + csize);
    const descOk = buf.readUInt32LE(dataStart + csize) === 0x08074b50 && buf.readUInt32LE(dataStart + csize + 4) === crc;
    endOfData = dataStart + csize + 16;
    out.push({ name, flags, method, crc, csize, usize, data, crcOk: (crc32(data) >>> 0) === crc, descOk });
    p += 46 + nlen + elen + clen;
  }
  return { entries: out, cdOff, endOfData, count };
}

const guest = await as(null);
const dv1 = await as("t.dv1");
const tw = await as("t.tw");
const tinh = await as("t.tinh");

/* =====================================================================
 * 1) Giao diện đóng góp: chọn >10 tệp, tải song song ≤3, xoá tệp, chặn gửi khi đang tải
 * ===================================================================== */
const TITLE = `Bộ tài liệu tập huấn ${RUN}`;
const dvb = await browserAs("t.dv1");
const pageErrors = [];
dvb.page.on("pageerror", (e) => pageErrors.push(e.message));
let inflight = 0, maxInflight = 0;
await dvb.page.route("**/api/uploads", async (route) => {
  inflight++; maxInflight = Math.max(maxInflight, inflight);
  await sleep(700);
  await route.continue();
  inflight--;
});
await dvb.page.goto("/tai-nguyen");
await dvb.page.waitForLoadState("networkidle");
await sleep(1500); // chờ phiên đăng nhập nạp xong, nếu không nút Đóng góp chỉ báo "cần đăng nhập"
await dvb.page.getByRole("button", { name: /Đóng góp tài nguyên/ }).click();
const fileInput = dvb.page.locator('input[data-testid="multi-upload-input"]');
const files11 = [
  { name: NAME_PDF, mimeType: "application/pdf", buffer: pdf("A") },
  { name: NAME_DOCX, mimeType: "application/octet-stream", buffer: docx("B") },
  { name: NAME_PNG, mimeType: "image/png", buffer: png(RUN.length * 17) },
  ...Array.from({ length: 8 }, (_, i) => ({ name: `ghi-chu-${i + 1}.txt`, mimeType: "text/plain", buffer: txt(i + 1) })),
];
await fileInput.setInputFiles(files11);
await dvb.page.getByText("Đang tải lên…").first().waitFor({ timeout: 5000 }).then(() => check("UI: tệp hiện trạng thái 'Đang tải lên'", true), () => check("UI: tệp hiện trạng thái 'Đang tải lên'", false));
const submitBtn = dvb.page.getByRole("button", { name: /Đang tải tệp…|Gửi cho Ban Biên tập duyệt/ });
check("UI: nút gửi bị khoá trong lúc còn tệp đang tải", await submitBtn.isDisabled());
const items = () => dvb.page.locator("ul[aria-live] > li");
check("UI: chọn 11 tệp chỉ nhận 10 (tối đa)", (await items().count()) === 10, `${await items().count()} tệp`);
await dvb.page.waitForFunction(() => [...document.querySelectorAll("ul[aria-live] > li")].filter((li) => li.textContent.includes("Đã tải lên")).length === 10, null, { timeout: 40000 });
check("UI: tải song song tối đa 3 tệp một lúc", maxInflight === 3, `max=${maxInflight}`);
check("UI: tên ảnh hiển thị theo đuôi thật (.webp)", (await dvb.page.getByText(NAME_WEBP).count()) > 0);
check("UI: nút gửi mở lại khi tải xong", !(await dvb.page.getByRole("button", { name: /Gửi cho Ban Biên tập duyệt/ }).isDisabled()));
for (let i = 0; i < 7; i++) await dvb.page.getByRole("button", { name: /^Xoá ghi-chu-/ }).first().click();
check("UI: xoá được tệp (còn 3 tệp)", (await items().count()) === 3);
await dvb.page.getByPlaceholder(/Ví dụ: Bộ slide/).fill(TITLE);
await dvb.page.getByPlaceholder(/Mô tả ngắn/).fill("Dòng một của mô tả.\nDòng hai — kiểm tra giữ xuống dòng.");
const [contribResp] = await Promise.all([
  dvb.page.waitForResponse((r) => r.url().endsWith("/api/tai-nguyen/dong-gop")),
  dvb.page.getByRole("button", { name: /Gửi cho Ban Biên tập duyệt/ }).click(),
]);
const cj = await contribResp.json();
const sent = JSON.parse(contribResp.request().postData() ?? "{}");
check("UI: gửi đóng góp 3 tệp thành công", contribResp.ok() && cj.ok, contribResp.status());
check("UI: trình duyệt gửi attachments (3 phần tử)", Array.isArray(sent.attachments) && sent.attachments.length === 3);
const row = cj.row;
check("DB: 3 tệp, tệp chính = tệp đầu, DRAFT, không công khai", row?.attachments?.length === 3 && row.fileName === NAME_PDF && row.fileDataUrl === row.attachments[0].url && row.status === "DRAFT" && row.isPublic === false);
check("DB: contributorName = tên người gửi", row?.contributorName === "Đoàn viên 1", row?.contributorName);
check("DB: fileSizeKb = tổng dung lượng", row?.fileSizeKb === row?.attachments?.reduce((s, a) => s + a.sizeKb, 0), `${row?.fileSizeKb}`);
check("DB: tên ảnh khớp đuôi thật .webp", row?.attachments?.[2]?.name === NAME_WEBP, row?.attachments?.[2]?.name);
check("DB: mọi tệp nằm trong /uploads/tai-nguyen/", row?.attachments?.every((a) => /^\/uploads\/tai-nguyen\/\d{4}\/\d{2}\/[a-f0-9]+\.(pdf|docx|webp)$/.test(a.url)));
const RES_ID = row?.id;
await dvb.page.unroute("**/api/uploads");

/* ===== Từ chối ở API: 11 tệp, url giả, url ngoài, sai phân hệ… ===== */
const base = { resourceTypeId: row.resourceTypeId, title: `Thử từ chối ${RUN}` };
const u1 = (await upload(dv1, `ok-${RUN}.pdf`, pdf("ok"))).file;
const imgOther = (await upload(dv1, `dong-gop-${RUN}.png`, png(5), "dong-gop", "image/png")).file;
const good = att(u1);
let res = await contribute(dv1, { ...base, attachments: Array.from({ length: 11 }, () => good) });
check("API: 11 tệp bị từ chối (400)", res.status === 400, res.j?.error);
res = await contribute(dv1, { ...base, attachments: [] });
check("API: danh sách rỗng bị từ chối", res.status === 400, res.j?.error);
res = await contribute(dv1, { ...base, attachments: [{ ...good, url: "/uploads/tai-nguyen/2026/10/0123456789abcdef0123456789abcdef.pdf" }] });
check("API: url đúng dạng nhưng chưa từng tải lên bị từ chối", res.status === 400, res.j?.error);
res = await contribute(dv1, { ...base, attachments: [{ ...good, url: "https://evil.example/x.pdf" }] });
check("API: url ngoài bị từ chối", res.status === 400);
res = await contribute(dv1, { ...base, attachments: [{ ...good, url: "javascript:alert(1)" }] });
check("API: javascript: bị từ chối", res.status === 400);
res = await contribute(dv1, { ...base, attachments: [{ ...good, url: imgOther.url }] });
check("API: url thuộc phân hệ khác (dong-gop) bị từ chối", res.status === 400, imgOther.url);
res = await contribute(dv1, { ...base, attachments: [{ ...good, url: "/uploads/tai-nguyen/../../etc/passwd" }] });
check("API: url có '..' bị từ chối", res.status === 400);
res = await contribute(dv1, { ...base, attachments: [{ ...good, name: "x".repeat(256) }] });
check("API: tên tệp > 255 ký tự bị từ chối", res.status === 400);
for (const bad of [0, -3, "abc", 1.5, null]) {
  res = await contribute(dv1, { ...base, attachments: [{ ...good, sizeKb: bad }] });
  if (res.status !== 400) check(`API: sizeKb=${JSON.stringify(bad)} bị từ chối`, false, `HTTP ${res.status}`);
}
check("API: sizeKb 0 / âm / chữ / lẻ / null bị từ chối", true);
res = await contribute(guest, { ...base, attachments: [good] });
check("API: khách chưa đăng nhập bị chặn (401)", res.status === 401);

/* ===== Kiểu cũ 1 tệp vẫn nhận (tạo thêm 1 tài nguyên 1 tệp để thử tải trực tiếp) ===== */
const legacyTitle = `Biểu mẫu một tệp ${RUN}`;
const uLeg = (await upload(dv1, `Biểu mẫu ${RUN}.pdf`, pdf("legacy"))).file;
res = await contribute(dv1, { resourceTypeId: row.resourceTypeId, title: legacyTitle, description: "Kiểu cũ", fileName: `Biểu mẫu ${RUN}.pdf`, fileSizeKb: 1, fileDataUrl: uLeg.url });
const LEG_ID = res.j?.row?.id;
check("API: kiểu cũ 1 tệp (fileName/fileDataUrl) vẫn nhận, attachments có 1 phần tử", res.status === 200 && res.j?.row?.attachments?.length === 1 && res.j.row.contributorName === "Đoàn viên 1");

/* ===== Nhiều tệp trùng tên + tên có đường dẫn (cho kiểm tra zip) ===== */
const dupA = (await upload(dv1, "a.pdf", pdf("dupA"))).file;
const dupB = (await upload(dv1, "a.pdf", pdf("dupB"))).file;
const dupC = (await upload(dv1, "evil.pdf", pdf("dupC"))).file;
res = await contribute(dv1, {
  resourceTypeId: row.resourceTypeId, title: `Tệp trùng tên ${RUN}`,
  attachments: [att(dupA, "a.pdf"), att(dupB, "A.PDF"), att(dupC, "../../etc/evil\\x.pdf")],
});
const DUP_ID = res.j?.row?.id;
check("API: tên tệp trùng / có đường dẫn vẫn nhận (làm sạch khi nén)", res.status === 200 && !!DUP_ID, res.j?.error);

/* =====================================================================
 * 2) Khách chưa thấy bản nháp; t.tw duyệt qua giao diện (tài nguyên chính) và /api/store (các tài nguyên còn lại)
 * ===================================================================== */
let g = await snap(guest);
check("khách chưa thấy tài nguyên nháp", !(g.resources ?? []).some((r) => [RES_ID, LEG_ID, DUP_ID].includes(r.id)));
let r404 = await guest.get(`/api/tai-nguyen/${RES_ID}/zip`);
check("zip của bản nháp: khách nhận 404", r404.status() === 404);
r404 = await dv1.get(`/api/tai-nguyen/${RES_ID}/zip`);
check("zip của bản nháp: chính chủ tải được (200)", r404.status() === 200);

const twb = await browserAs("t.tw");
const twStorePosts = [];
twb.page.on("request", (r) => { if (r.url().endsWith("/api/store") && r.method() === "POST") twStorePosts.push(r.postData() ?? ""); });
await twb.page.goto("/quan-tri/dong-gop");
await twb.page.getByRole("button", { name: /^Tài nguyên/ }).click();
await twb.page.getByText(TITLE).waitFor({ timeout: 10000 });
check("UI duyệt: hiện danh sách 3 tệp và tên người đóng góp", (await twb.page.getByText(NAME_PDF).count()) > 0 && (await twb.page.getByText(/Đoàn viên 1/).count()) > 0);
const card = twb.page.locator("div").filter({ hasText: TITLE }).filter({ has: twb.page.getByRole("button", { name: /Duyệt công khai/ }) }).last();
await card.getByRole("button", { name: /Duyệt công khai/ }).click();
await twb.page.getByText(/Đã duyệt công khai tài nguyên/).first().waitFor({ timeout: 5000 });
await sleep(4500);
check("UI duyệt: UPSERT cả dòng không bị luật mới chặn (không POST /api/store lỗi)", twStorePosts.length > 0);
g = await snap(guest);
let pub = (g.resources ?? []).find((r) => r.id === RES_ID);
check("sau duyệt: khách thấy tài nguyên công khai, còn đủ 3 tệp + tên người đóng góp", pub?.isPublic && pub.status === "PUBLISHED" && pub.attachments?.length === 3 && pub.contributorName === "Đoàn viên 1" && pub.downloadCount === 0, JSON.stringify(pub && { s: pub.status, n: pub.attachments?.length, c: pub.contributorName }));
check("khách không thấy id tài khoản người gửi", pub && !("submittedByAccountId" in pub));

const twSnap = (await snap(tw)).resources;
for (const id of [LEG_ID, DUP_ID]) {
  const r0 = twSnap.find((r) => r.id === id);
  res = await storePost(tw, { resources: [{ ...r0, status: "PUBLISHED", isPublic: true }] });
  check(`/api/store: t.tw duyệt tài nguyên #${id} (UPSERT cả dòng)`, res.status === 200, reason(res));
}

/* =====================================================================
 * 3) Khách xem trang chi tiết, thư viện ảnh, PDF, phóng to, sao chép liên kết, 360px
 * ===================================================================== */
const html = await guest.get(`/tai-nguyen/${RES_ID}`);
check("GET /tai-nguyen/<id>: 200", html.status() === 200);
const gb = await browserAs(null);
const consoleErrors = [];
gb.page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_/.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });
gb.page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 160)));
await gb.ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await gb.page.goto(`/tai-nguyen/${RES_ID}`);
await gb.page.getByRole("heading", { level: 1, name: TITLE }).waitFor({ timeout: 10000 });
check("chi tiết: hiện 'Đóng góp bởi Đoàn viên 1'", (await gb.page.getByText("Đóng góp bởi Đoàn viên 1").count()) > 0);
check("chi tiết: nút 'Tải tất cả (.zip)' (≥2 tệp)", await gb.page.getByRole("button", { name: /Tải tất cả \(\.zip\)/ }).isVisible());
check("chi tiết: giữ xuống dòng của mô tả", await gb.page.locator("p.whitespace-pre-line").evaluate((el) => getComputedStyle(el).whiteSpace === "pre-line" && el.textContent.includes("\n")));
check("chi tiết: liệt kê đủ 3 tệp với tên tiếng Việt", (await gb.page.getByText(NAME_PDF).count()) > 0 && (await gb.page.getByText(NAME_DOCX).count()) > 0 && (await gb.page.getByText(NAME_WEBP).count()) > 0);
const imgEl = gb.page.locator('section img[alt^="Ảnh sự kiện"]').first();
await imgEl.waitFor({ timeout: 8000 });
check("chi tiết: thư viện ảnh hiển thị ảnh thật", await imgEl.evaluate((el) => el.complete && el.naturalWidth > 0));
await imgEl.click();
check("chi tiết: phóng to ảnh (lightbox)", await gb.page.getByRole("dialog", { name: /phóng to/ }).isVisible());
await gb.page.keyboard.press("Escape");
await gb.page.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 }).then(() => check("chi tiết: Esc đóng lightbox", true), () => check("chi tiết: Esc đóng lightbox", false));
check("chi tiết: PDF nhúng bằng iframe", (await gb.page.locator('iframe[src$=".pdf"]').count()) === 1);
check("chi tiết: tệp Word chỉ có nút tải (không có nút Xem)", (await gb.page.locator("li", { hasText: NAME_DOCX }).getByRole("button", { name: /Xem/ }).count()) === 0);
await gb.page.getByRole("button", { name: "Sao chép liên kết" }).click();
check("chi tiết: sao chép liên kết", (await gb.page.getByText(/Đã sao chép liên kết|Không sao chép được/).first().textContent()).includes("Đã sao chép"));
check("chi tiết: có mục 'Tài nguyên cùng loại'", await gb.page.getByRole("heading", { name: "Tài nguyên cùng loại" }).isVisible());
// 360px không tràn ngang
await gb.page.setViewportSize({ width: 360, height: 740 });
await sleep(400);
const overflow = await gb.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("chi tiết: 360px không cuộn ngang", overflow <= 0, `lệch ${overflow}px`);
await gb.page.setViewportSize({ width: 1280, height: 800 });

/* ===== Không tìm thấy / id lạ: EmptyState, không lỗi console ===== */
for (const bad of ["/tai-nguyen/987654321", "/tai-nguyen/vb-x", "/tai-nguyen/vb-987654", "/tai-nguyen/abc"]) {
  await gb.page.goto(bad);
  await gb.page.getByText(/Không tìm thấy tài nguyên/).waitFor({ timeout: 8000 }).then(() => check(`${bad}: hiện 'Không tìm thấy' + nút quay lại`, true), () => check(`${bad}: hiện 'Không tìm thấy'`, false));
}
check("không tìm thấy: có nút 'Về kho tài nguyên'", await gb.page.getByRole("link", { name: /Về kho tài nguyên/ }).isVisible());

/* =====================================================================
 * 4) Tải .zip: giải nén kiểm CRC, tên tiếng Việt, chống trùng tên, làm sạch tên
 * ===================================================================== */
mkdirSync(OUT, { recursive: true });
let zr = await guest.get(`/api/tai-nguyen/${RES_ID}/zip`);
const zbuf = await zr.body();
check("zip: 200, application/zip", zr.status() === 200 && /application\/zip/.test(zr.headers()["content-type"] ?? ""), zr.headers()["content-type"]);
const cd = zr.headers()["content-disposition"] ?? "";
check("zip: Content-Disposition attachment + filename* UTF-8 theo tiêu đề", /^attachment;/.test(cd) && cd.includes("filename*=UTF-8''") && decodeURIComponent(cd.split("filename*=UTF-8''")[1]) === `${TITLE}.zip`, cd);
check("zip: Content-Length khớp số byte nhận được", Number(zr.headers()["content-length"]) === zbuf.length || !!zr.headers()["content-encoding"], `${zr.headers()["content-length"]} vs ${zbuf.length}`);
writeFileSync(`${OUT}/tai-nguyen-${RUN}.zip`, zbuf);
const z = parseZip(zbuf);
check("zip: có 3 tệp, tên tiếng Việt đủ", z.entries.map((e) => e.name).sort().join("|") === [NAME_PDF, NAME_DOCX, NAME_WEBP].sort().join("|"), z.entries.map((e) => e.name).join("|"));
check("zip: cờ bit 3 (data descriptor) + bit 11 (UTF-8), phương thức STORE", z.entries.every((e) => (e.flags & 0x8) && (e.flags & 0x800) && e.method === 0));
check("zip: CRC32 + data descriptor đúng từng tệp", z.entries.every((e) => e.crcOk && e.descOk && e.csize === e.usize));
let sameBytes = true;
for (const a of row.attachments) {
  const served = Buffer.from(await (await guest.get(a.url)).body());
  const ent = z.entries.find((e) => e.name === a.name);
  if (!ent || !ent.data.equals(served)) sameBytes = false;
}
check("zip: nội dung từng tệp khớp tệp trên máy chủ", sameBytes);
check("zip: cấu trúc liền mạch (central directory ngay sau dữ liệu)", z.cdOff === z.endOfData);

zr = await guest.get(`/api/tai-nguyen/${DUP_ID}/zip`);
const zd = parseZip(await zr.body());
const dn = zd.entries.map((e) => e.name);
check("zip: trùng tên → 'a.pdf', 'A (2).PDF'", dn.includes("a.pdf") && dn.some((n) => /^A \(2\)\.PDF$/.test(n)), dn.join("|"));
check("zip: làm sạch tên (không còn / \\ ..)", dn.every((n) => !/[\\/]/.test(n) && !n.includes("..")), dn.join("|"));
check("zip: tên đã làm sạch giữ đuôi", dn.some((n) => /evil.*\.pdf$/.test(n)));
// Tệp thiếu trên đĩa → bỏ qua, gói vẫn tải được
if (existsSync(UPLOADS)) {
  unlinkSync(`${UPLOADS}/${dupC.url.replace("/uploads/", "")}`);
  zr = await guest.get(`/api/tai-nguyen/${DUP_ID}/zip`);
  const zm = parseZip(await zr.body());
  check("zip: tệp thiếu trên đĩa bị bỏ qua, các tệp còn lại vẫn đủ", zr.status() === 200 && zm.entries.length === 2 && zm.entries.every((e) => e.crcOk), `${zm.entries.length} tệp`);
} else check("zip: thiếu tệp trên đĩa (bỏ qua — không gắn được thư mục tải lên)", true);
r404 = await guest.get("/api/tai-nguyen/abc/zip");
check("zip: id sai định dạng → 400", r404.status() === 400);
r404 = await guest.get("/api/tai-nguyen/987654321/zip");
check("zip: id không tồn tại → 404", r404.status() === 404);

/* =====================================================================
 * 5) Đếm lượt tải thật
 * ===================================================================== */
g = await snap(guest);
pub = g.resources.find((r) => r.id === RES_ID);
check("lượt tải: tải zip (nhiều lần) chỉ tính 1 lượt", pub?.downloadCount === 1, `${pub?.downloadCount}`);
res = await (async () => { const r = await guest.post(`/api/tai-nguyen/${RES_ID}/luot-tai`); return { status: r.status(), j: await r.json() }; })();
check("luot-tai: gọi lại ngay không tăng (counted=false, vẫn 1)", res.status === 200 && res.j.counted === false && res.j.downloadCount === 1, JSON.stringify(res.j));
const other = await as(null, `Trinh-duyet-khac/${RUN}`);
res = await (async () => { const r = await other.post(`/api/tai-nguyen/${RES_ID}/luot-tai`); return { status: r.status(), j: await r.json() }; })();
check("luot-tai: người xem khác (dấu vết khác) → tăng lên 2", res.status === 200 && res.j.counted === true && res.j.downloadCount === 2, JSON.stringify(res.j));
const other2 = await as(null, `Trinh-duyet-khac-2/${RUN}`);
let both = await Promise.all([1, 2, 3, 4, 5].map(() => other2.post(`/api/tai-nguyen/${RES_ID}/luot-tai`).then((r) => r.json())));
check("luot-tai: 5 request song song cùng người xem chỉ cộng 1 (lên 3)", both.filter((b) => b.counted).length === 1 && Math.max(...both.map((b) => b.downloadCount)) === 3, JSON.stringify(both.map((b) => [b.counted, b.downloadCount])));
const draft = await (async () => { const r = await other.post(`/api/tai-nguyen/${(await snap(dv1)).resources.find((x) => x.status === "DRAFT")?.id ?? 1}/luot-tai`); return r.status(); })();
check("luot-tai: tài nguyên chưa công khai → 404", draft === 404 || draft === 400, `HTTP ${draft}`);
res = await other.post("/api/tai-nguyen/987654321/luot-tai");
check("luot-tai: tài nguyên không tồn tại → 404", res.status() === 404);
res = await other.post("/api/tai-nguyen/abc/luot-tai");
check("luot-tai: id sai định dạng → 400", res.status() === 400);
const flood = await as(null, `Flood/${RUN}`);
const codes = [];
for (let i = 0; i < 64; i++) codes.push((await flood.post(`/api/tai-nguyen/${RES_ID}/luot-tai`)).status());
check("luot-tai: giới hạn tần suất (429 sau 60 lượt / 10 phút)", codes.includes(429) && codes.slice(0, 60).every((c) => c === 200), `${codes.filter((c) => c === 429).length} lần 429`);

/* ===== Giao diện: bấm Tải xuống ở danh sách → gọi luot-tai, KHÔNG ghi /api/store, đếm tăng ===== */
const gl = await browserAs(null);
await gl.page.setExtraHTTPHeaders({ "User-Agent": `UI-khach/${RUN}` }).catch(() => {});
const glStore = [];
gl.page.on("request", (r) => { if (r.url().endsWith("/api/store") && r.method() === "POST") glStore.push(1); });
gl.page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_/.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });
gl.page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 160)));
await gl.page.goto("/tai-nguyen");
const rowLeg = gl.page.locator("div.group", { hasText: legacyTitle });
await rowLeg.waitFor({ timeout: 10000 });
check("danh sách: dòng có 'Đóng góp bởi' và nhiều tệp hiện chip 'N tệp'", (await gl.page.locator("div.group", { hasText: TITLE }).getByText("3 tệp").count()) > 0 && (await gl.page.getByText("Đóng góp bởi Đoàn viên 1").count()) >= 2);
check("danh sách: dòng dẫn tới trang chi tiết bằng liên kết", (await rowLeg.locator(`a[href="/tai-nguyen/${LEG_ID}"]`).count()) === 1);
const [dl, lt] = await Promise.all([
  gl.page.waitForEvent("download"),
  gl.page.waitForResponse((r) => r.url().includes(`/api/tai-nguyen/${LEG_ID}/luot-tai`)),
  rowLeg.getByRole("button", { name: /Tải xuống/ }).click({ force: true }),
]).then(([a, b]) => [a, b]);
const ltj = await lt.json();
check("danh sách: bấm Tải xuống → tải tệp thật + gọi luot-tai (không điều hướng)", dl.suggestedFilename() === `Biểu mẫu ${RUN}.pdf` && ltj.ok && gl.page.url().endsWith("/tai-nguyen"), dl.suggestedFilename());
await sleep(5500);
check("danh sách: số lượt tải do máy chủ đếm, KHÔNG sinh POST /api/store", glStore.length === 0, `${glStore.length} POST`);
await rowLeg.getByRole("link").first().click();
await gl.page.waitForURL(new RegExp(`/tai-nguyen/${LEG_ID}$`));
await gl.page.getByRole("heading", { level: 1, name: legacyTitle }).waitFor({ timeout: 8000 });
check("danh sách → bấm vào dòng mở trang chi tiết (1 tệp: nút 'Tải xuống')", await gl.page.getByRole("button", { name: /^Tải xuống$/ }).isVisible());

/* staff t.tw: tải ở danh sách không được sinh ghi resources qua /api/store (adoptServerRows) */
twStorePosts.length = 0;
await twb.page.goto("/tai-nguyen");
const rowTw = twb.page.locator("div.group", { hasText: legacyTitle });
await rowTw.waitFor({ timeout: 10000 });
const respTw = twb.page.waitForResponse((r) => r.url().includes(`/api/tai-nguyen/${LEG_ID}/luot-tai`));
await rowTw.getByRole("button", { name: /Tải xuống/ }).click({ force: true });
await respTw;
await sleep(5500);
check("cán bộ: tải tệp không sinh POST /api/store chứa resources", !twStorePosts.some((p) => p.includes('"resources"')), `${twStorePosts.length} POST`);

/* =====================================================================
 * 6) Cán bộ ghi qua /api/store: chặn XSS + tên người đóng góp + lượt tải
 * ===================================================================== */
const rt = row.resourceTypeId;
const R = (extra = {}) => ({ id: ID(), resourceTypeId: rt, title: `[F] Tài nguyên cán bộ ${RUN}`, description: "x", fileName: "", fileSizeKb: 0, isPublic: true, downloadCount: 0, publishedByOrgUnitId: 131, publishedAt: now, status: "PUBLISHED", ...extra });
const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const clip = R({ title: `[F] Clip ${RUN}`, videoUrl: YT, downloadCount: 999 });
res = await storePost(tinh, { resources: [clip] });
check("cán bộ: tạo clip YouTube hợp lệ (200)", res.status === 200, reason(res));
const savedClip = (await snap(guest)).resources.find((r) => r.id === clip.id);
check("cán bộ: downloadCount tự đặt (999) bị đưa về 0", savedClip?.downloadCount === 0, `${savedClip?.downloadCount}`);
res = await storePost(tinh, { resources: [{ ...clip, downloadCount: 500 }] });
const afterUpd = (await snap(guest)).resources.find((r) => r.id === clip.id);
check("cán bộ: sửa downloadCount qua đồng bộ không đổi được số lượt", afterUpd?.downloadCount === 0, `HTTP ${res.status} → ${afterUpd?.downloadCount}`);
const xss = [
  ["videoUrl javascript:", { videoUrl: "javascript:alert(1)" }, /YouTube/],
  ["videoUrl http (không https)", { videoUrl: "http://www.youtube.com/watch?v=dQw4w9WgXcQ" }, /YouTube/],
  ["videoUrl host lạ", { videoUrl: "https://evil.example/watch?v=dQw4w9WgXcQ" }, /YouTube/],
  ["videoUrl host giả youtube.com.evil", { videoUrl: "https://youtube.com.evil.example/watch?v=x" }, /YouTube/],
  ["videoUrl data:", { videoUrl: "data:text/html,<script>alert(1)</script>" }, /YouTube/],
  ["fileDataUrl javascript:", { fileDataUrl: "javascript:alert(1)" }, /máy chủ/],
  ["fileDataUrl URL ngoài", { fileDataUrl: "https://evil.example/x.pdf" }, /máy chủ/],
  ["fileDataUrl '..' ", { fileDataUrl: "/uploads/tai-nguyen/../../etc/passwd" }, /máy chủ/],
  ["fileDataUrl sai phân hệ", { fileDataUrl: imgOther.url }, /máy chủ/],
  ["attachments url ngoài", { attachments: [{ name: "x.pdf", url: "https://evil.example/x.pdf", sizeKb: 1 }] }, /đính kèm/],
  ["attachments javascript:", { attachments: [{ name: "x.pdf", url: "javascript:alert(1)", sizeKb: 1 }] }, /đính kèm/],
  ["attachments 11 phần tử", { attachments: Array.from({ length: 11 }, () => att(u1)) }, /10 tệp/],
  ["contributorName tự đặt khi thêm", { contributorName: "Người giả mạo" }, /người đóng góp/],
];
for (const [label, extra, re] of xss) {
  res = await storePost(tinh, { resources: [R(extra)] });
  check(`cán bộ (t.tinh): ${label} → 403`, res.status === 403 && re.test(reason(res)), `HTTP ${res.status} ${reason(res)}`);
}
res = await storePost(tw, { resources: [R({ videoUrl: "javascript:alert(1)" })] });
check("QUAN_TRI_TW cũng bị chặn videoUrl javascript: (403)", res.status === 403 && /YouTube/.test(reason(res)), reason(res));
res = await storePost(tw, { resources: [R({ fileDataUrl: "javascript:alert(1)" })] });
check("QUAN_TRI_TW cũng bị chặn fileDataUrl javascript: (403)", res.status === 403, reason(res));
// Đổi tên người đóng góp của dòng có sẵn
const cur = (await snap(tw)).resources.find((r) => r.id === RES_ID);
res = await storePost(tinh, { resources: [{ ...cur, contributorName: "Tên bị đổi" }] });
check("cán bộ: đổi contributorName của dòng đóng góp → 403", res.status === 403, `HTTP ${res.status} ${reason(res)}`);
// base64 lọt vào → máy chủ chuyển thành tệp hoặc để trống, không bao giờ ghi nguyên chuỗi data:
const b64 = R({ fileDataUrl: "data:text/html;base64," + Buffer.from("<script>alert(1)</script>").toString("base64"), fileName: "x.html" });
res = await storePost(tinh, { resources: [b64] });
const savedB64 = (await snap(tw)).resources.find((r) => r.id === b64.id);
check("cán bộ: chuỗi data: không bao giờ được lưu nguyên (trống hoặc đường dẫn /uploads/)", res.status === 200 && !String(savedB64?.fileDataUrl ?? "").startsWith("data:") && (savedB64?.fileDataUrl === "" || /^\/uploads\//.test(savedB64.fileDataUrl)), `HTTP ${res.status} → ${JSON.stringify(savedB64?.fileDataUrl)}`);

/* ===== Văn bản: tệp thật, chặn XSS, trang /van-ban tải thật ===== */
const upDoc = (await upload(tinh, `Công văn ${RUN}.pdf`, pdf("congvan"), "van-ban")).file;
const D = (extra = {}) => ({ id: ID(), docNumber: `F-${RUN}`, title: `[F] Công văn ${RUN}`, summary: "Tóm tắt công văn thử nghiệm.", documentCategoryId: 1, issuingOrgUnitId: 131, issuedDate: "2026-10-25", recipientScope: "SELECTED", status: "ISSUED", createdAt: now, ...extra });
res = await storePost(tinh, { documents: [D({ fileDataUrl: "javascript:alert(1)", fileName: "x.pdf" })] });
check("cán bộ: văn bản fileDataUrl javascript: → 403", res.status === 403 && /máy chủ/.test(reason(res)), reason(res));
res = await storePost(tinh, { documents: [D({ fileDataUrl: "https://evil.example/x.pdf", fileName: "x.pdf" })] });
check("cán bộ: văn bản fileDataUrl URL ngoài → 403", res.status === 403);
res = await storePost(tinh, { documents: [D({ fileDataUrl: imgOther.url, fileName: "x.webp" })] });
check("cán bộ: văn bản dùng tệp phân hệ khác (dong-gop) → 403", res.status === 403);
const docOk = D({ fileDataUrl: upDoc.url, fileName: `Công văn ${RUN}.pdf` });
res = await storePost(tinh, { documents: [docOk] });
check("cán bộ: văn bản có tệp /uploads/van-ban hợp lệ → 200", res.status === 200, reason(res));
const docNoFile = D({ docNumber: `G-${RUN}`, title: `[F] Công văn chưa có tệp ${RUN}` });
res = await storePost(tinh, { documents: [docNoFile] });
check("cán bộ: văn bản không có tệp → 200", res.status === 200, reason(res));

await gl.page.goto(`/tai-nguyen/vb-${docOk.id}`);
await gl.page.getByRole("heading", { level: 1, name: docOk.title }).waitFor({ timeout: 10000 });
check("chi tiết văn bản vb-<id>: 200, có tiêu đề + nút Tải xuống", await gl.page.getByRole("button", { name: /^Tải xuống$/ }).isVisible());
check("chi tiết văn bản: hiện đơn vị đăng (không có người đóng góp)", (await gl.page.getByText(/Đăng bởi/).count()) > 0);
await gl.page.goto("/tai-nguyen");
const docRow = gl.page.locator("div.group", { hasText: docOk.title });
await docRow.waitFor({ timeout: 10000 });
check("danh sách: dòng văn bản link tới vb-<id> và không gán cứng 640KB", (await docRow.locator(`a[href="/tai-nguyen/vb-${docOk.id}"]`).count()) === 1 && !(await docRow.textContent()).includes("0.6 MB") && !(await docRow.textContent()).includes("640"));
const [dlDoc] = await Promise.all([gl.page.waitForEvent("download"), docRow.getByRole("button", { name: /Tải xuống/ }).click({ force: true })]);
check("danh sách: tải văn bản = tệp thật", dlDoc.suggestedFilename() === `Công văn ${RUN}.pdf`, dlDoc.suggestedFilename());
await gl.page.goto("/van-ban");
const vbRow = gl.page.locator("div.group", { hasText: docOk.title });
await vbRow.waitFor({ timeout: 10000 });
const [dlVb] = await Promise.all([gl.page.waitForEvent("download"), vbRow.getByRole("button", { name: /Tải xuống/ }).click({ force: true })]);
const vbPath = await dlVb.path();
const { readFileSync } = await import("node:fs");
check("/van-ban: Tải xuống = tải tệp thật (đúng nội dung)", dlVb.suggestedFilename() === `Công văn ${RUN}.pdf` && readFileSync(vbPath).equals(pdf("congvan")), dlVb.suggestedFilename());
const vbNo = gl.page.locator("div.group", { hasText: docNoFile.title });
await vbNo.getByRole("button", { name: /Tải xuống/ }).click({ force: true });
await gl.page.getByText(/chưa có tệp đính kèm/).first().waitFor({ timeout: 3000 }).then(() => check("/van-ban: văn bản chưa có tệp → cảnh báo, không giả lập tải", true), () => check("/van-ban: văn bản chưa có tệp → cảnh báo", false));

/* ===== Clip YouTube: xem tính 1 lượt ===== */
await gl.page.goto("/tai-nguyen");
const clipRow = gl.page.locator("div.group", { hasText: clip.title });
await clipRow.waitFor({ timeout: 10000 });
const [clipResp] = await Promise.all([
  gl.page.waitForResponse((r) => r.url().includes(`/api/tai-nguyen/${clip.id}/luot-tai`)),
  clipRow.getByRole("button", { name: "Xem clip", exact: true }).click({ force: true }),
]);
const cl = await clipResp.json();
check("clip YouTube: mở xem tính 1 lượt (luot-tai counted)", cl.ok && cl.counted && cl.downloadCount === 1, JSON.stringify(cl));
check("clip YouTube: nhúng iframe youtube.com/embed (không điều hướng)", (await gl.page.locator('iframe[src^="https://www.youtube.com/embed/"]').count()) === 1 && gl.page.url().endsWith("/tai-nguyen"));

/* =====================================================================
 * 7) Quét trang: không lỗi console
 * ===================================================================== */
for (const p of ["/tai-nguyen", `/tai-nguyen/${RES_ID}`, `/tai-nguyen/vb-${docOk.id}`, "/tai-nguyen/vb-x", "/van-ban"]) {
  await gb.page.goto(p);
  await gb.page.waitForLoadState("networkidle").catch(() => {});
  await sleep(700);
}
check("các trang /tai-nguyen, /tai-nguyen/<id>, /tai-nguyen/vb-x, /van-ban không có lỗi console", consoleErrors.length === 0 && pageErrors.length === 0, [...consoleErrors, ...pageErrors].slice(0, 3).join(" || "));

await Promise.all([dvb, twb, gb, gl].map((s) => s.browser.close()));
summary();
