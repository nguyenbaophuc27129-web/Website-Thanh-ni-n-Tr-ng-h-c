// Nhóm I — Trình soạn thảo bài viết (Tiptap): soạn đủ định dạng, ảnh hiện ngay + tải lên, chỉnh độ rộng/vị trí/chú thích,
// gõ "/", dán từ Word / Google Docs, lưu → trang tin hiện đúng (ảnh không cắt, canh lề, bảng, 360px), bài Markdown cũ,
// chốt chặn content_doc ở /api/store. Cần web thử + DB thử đã áp migration 0029. Dữ liệu gắn RUN nên chạy lại được.
import { crc32, deflateSync } from "node:zlib";
import { request } from "playwright";
import { BASE, PW, browserAs, check, summary } from "./lib.mjs";

const RUN = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ảnh PNG thật, kích thước tuỳ chọn (ảnh dọc cao để thử "không bị cắt") */
function png(w, h, seed = 1) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = [0];
    for (let x = 0; x < w; x++) row.push((seed * 31 + x) % 256, (y * 3) % 256, (seed + x * y) % 256);
    rows.push(Buffer.from(row));
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])) >>> 0);
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

async function api(username) {
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.post("/api/auth/login", { data: { username, password: PW } });
  if (!r.ok()) throw new Error(`login ${username}`);
  return ctx;
}
const snapPosts = async (ctx) => (await (await ctx.get("/api/store")).json()).data?.publishedPosts ?? [];
async function storePost(ctx, post) {
  const r = await ctx.post("/api/store", { data: { entities: { publishedPosts: [post] }, deletes: {} } });
  return { status: r.status(), j: await r.json().catch(() => null) };
}
const reason = (res) => res.j?.denied?.[0]?.reason ?? res.j?.error ?? "";
async function waitPost(ctx, pred, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const p = (await snapPosts(ctx)).find(pred);
    if (p) return p;
    await sleep(800);
  }
  return null;
}
const basePost = (id, extra) => ({
  id, activityId: null, slug: `thu-${RUN}-${id}`, title: `Bài thử ${RUN} ${id}`, excerpt: "Sa-pô thử", content: "",
  coverSeed: 1, status: "PUBLISHED", isFeatured: false, publishedAt: new Date().toISOString(), viewCount: 0,
  authorOrgUnitName: "Thử", editorAccountId: 920, categoryNames: [], createdAt: new Date().toISOString(), ...extra,
});

const tw = await api("t.tw");
const donvi = await api("t.donvi");

/* ================= A. Chốt chặn content_doc ở /api/store ================= */
const up = await tw.post("/api/uploads", { multipart: { kind: "bai-viet", file: { name: `anh-${RUN}.png`, mimeType: "image/png", buffer: png(40, 30, 3) } } });
const IMG = (await up.json()).file?.url;
check("tải ảnh bài viết lên máy chủ", typeof IMG === "string" && IMG.startsWith("/uploads/bai-viet/"), String(IMG));

const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });
const doc = (...content) => ({ type: "doc", content });
const fig = (src, extra = {}) => ({ type: "figureImage", attrs: { src, alt: "", caption: "", width: "100", align: "center", ...extra } });
const okId = 297000000 + Math.floor(Math.random() * 900000);
const okDoc = doc(
  { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [t("Tiêu đề API")] },
  { type: "paragraph", attrs: { textAlign: "justify" }, content: [t("Chữ đậm", [{ type: "bold" }]), t(" thường")] },
  fig(IMG, { caption: "Chú thích API", width: "50", align: "right" }),
);
const okRes = await storePost(tw, basePost(okId, { content: "CHỮ GIẢ CLIENT GỬI", contentDoc: okDoc }));
check("API: tài liệu hợp lệ → lưu được", okRes.status === 200, `${okRes.status} ${reason(okRes)}`);
const saved = (await snapPosts(tw)).find((p) => p.id === okId);
const sortKeys = (o) => JSON.stringify(o, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
check("API: đọc lại đúng contentDoc", sortKeys(saved?.contentDoc) === sortKeys(okDoc), JSON.stringify(saved?.contentDoc).slice(0, 200));
check("API: cột content do máy chủ rút từ tài liệu (bỏ chữ client gửi)", saved?.content?.includes("Chữ đậm thường") && !saved?.content?.includes("CHỮ GIẢ"), saved?.content);

const badCases = [
  ["link javascript:", doc({ type: "paragraph", content: [t("x", [{ type: "link", attrs: { href: "javascript:alert(document.cookie)" } }])] })],
  ["ảnh link ngoài", doc(fig("https://evil.example/a.png"))],
  ["ảnh data:", doc(fig("data:image/svg+xml,<svg onload=alert(1)>"))],
  ["thuộc tính onerror", doc(fig(IMG, { onerror: "alert(1)" }))],
  ["khối iframe", doc({ type: "iframe", attrs: { src: "https://evil.example" } })],
  ["style tự chèn", doc({ type: "paragraph", attrs: { style: "x" }, content: [t("x")] })],
  ["YouTube giả", doc({ type: "youtube", attrs: { src: "https://evil.example/embed/abcdefghijk" } })],
];
for (const [name, d] of badCases) {
  const r = await storePost(tw, basePost(297000000 + Math.floor(Math.random() * 900000), { contentDoc: d }));
  check(`API chặn (kể cả TW): ${name}`, r.status === 403 && reason(r).includes("nội dung bài"), `${r.status} ${reason(r)}`);
}
const upd = await storePost(tw, { ...saved, contentDoc: badCases[0][1] });
check("API chặn: sửa bài đang có thành nội dung độc", upd.status === 403);
const dv = await storePost(donvi, basePost(297000000 + Math.floor(Math.random() * 900000), { contentDoc: okDoc }));
check("API: đơn vị không có quyền biên tập vẫn bị chặn", dv.status === 403);

// Bài Markdown cũ (không có contentDoc) vẫn lưu/hiển thị như trước
const legacyId = 297000000 + Math.floor(Math.random() * 900000);
const LEGACY_MD = `Đoạn cũ có *nghiêng* và <u>gạch chân</u> và **đậm**.\n\n## Mục cũ\n\n![Ảnh cũ](${IMG})\n*Chú thích cũ*\n\nDanh sách:\n- Mục A\n- Mục B`;
const lg = await storePost(tw, basePost(legacyId, { content: LEGACY_MD }));
check("API: bài Markdown cũ vẫn lưu được", lg.status === 200, reason(lg));

/* ================= B. Soạn bài trên giao diện ================= */
const { browser, ctx, page } = await browserAs("t.tw");
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/401|Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 200)));

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("/quan-tri/xuat-ban/dang-bai", { waitUntil: "networkidle" });
const editor = page.locator(".tnth-editor");
await editor.waitFor({ timeout: 20000 });
check("trình soạn thảo mở được", await editor.isVisible());

const TITLE = `Bài soạn thử ${RUN}`;
await page.getByPlaceholder(/Nhập tiêu đề chính/).fill(TITLE);

await editor.click();
await page.getByLabel("Kiểu đoạn").selectOption("h2");
await page.keyboard.type("Tiêu đề mục lớn");
await page.keyboard.press("Enter");
await page.keyboard.type("Đoàn viên trường THPT tham gia chiến dịch Mùa hè xanh ");
await page.keyboard.press("Control+b");
await page.keyboard.type("đậm nét");
await page.keyboard.press("Control+b");
await page.keyboard.type(" năm 2026.");
await page.getByRole("button", { name: "Canh đều hai bên" }).first().click();
check("gõ tiếng Việt có dấu giữ nguyên", (await editor.innerText()).includes("Đoàn viên trường THPT tham gia chiến dịch Mùa hè xanh"));
check("tiêu đề H2 + chữ đậm trong ô soạn thảo", (await editor.locator("h2").count()) === 1 && (await editor.locator("strong").innerText()) === "đậm nét");
check("canh đều hai bên", (await editor.locator("p", { hasText: "Mùa hè xanh" }).getAttribute("style"))?.includes("justify"));

// Gõ "/" để chèn bảng
await page.keyboard.press("Enter");
await page.keyboard.type("/bang");
const slash = page.getByRole("listbox", { name: "Chèn nhanh" });
await slash.waitFor({ timeout: 5000 }).catch(() => {});
check("gõ / hiện menu chèn nhanh", await slash.isVisible());
await page.keyboard.press("Enter");
check("chèn bảng bằng menu /", (await editor.locator("table").count()) === 1);
check("thanh công cụ bảng hiện khi con trỏ trong bảng", await page.getByRole("button", { name: "Thêm hàng bên dưới" }).isVisible());
await page.keyboard.type("Ô đầu");
// Ra khỏi bảng: bấm cuối tài liệu
await editor.press("Control+End");
await page.keyboard.press("Enter");
await page.keyboard.type("Đoạn sau bảng.");

// Ảnh: chọn tệp → hiện ngay, tải lên xong thì src là /uploads
const tall = png(300, 900, 7); // ảnh dọc cao (tỉ lệ 1:3) — trước đây bị cắt còn 540px
await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp,image/gif"]').setInputFiles({ name: `doc-${RUN}.png`, mimeType: "image/png", buffer: tall });
const edFig = editor.locator("figure").first();
await edFig.waitFor({ timeout: 5000 });
check("ảnh hiện ngay trong ô soạn thảo (không phải đường link)", (await edFig.locator("img").count()) === 1 && !(await editor.innerText()).includes("/uploads/"));
await page.waitForFunction(() => document.querySelector(".tnth-editor figure img")?.getAttribute("src")?.startsWith("/uploads/bai-viet/"), null, { timeout: 20000 }).catch(() => {});
check("ảnh tải lên xong → đường dẫn máy chủ", (await edFig.locator("img").getAttribute("src"))?.startsWith("/uploads/bai-viet/"));

await edFig.locator("img").click();
const w50 = page.getByRole("button", { name: "Rộng 50%" });
await w50.waitFor({ timeout: 5000 }).catch(() => {});
check("chọn ảnh hiện thanh chỉnh ảnh", await w50.isVisible());
await w50.click();
await page.getByRole("button", { name: "Ảnh sát trái" }).click();
check("đổi độ rộng 50% + sát trái", (await edFig.getAttribute("data-width")) === "50" && (await edFig.getAttribute("data-align")) === "left");
await edFig.locator('input[aria-label="Chú thích ảnh"]').fill("Chú thích ảnh thử");

// Ảnh dài hơn màn hình: cuộn để mép trên ảnh khuất, bấm ảnh → thanh chỉnh ảnh vẫn nằm trong màn hình,
// và thanh công cụ dính không bị thanh tiêu đề trang che
await page.setViewportSize({ width: 1280, height: 600 });
await edFig.locator("img").evaluate((img) => window.scrollBy(0, img.getBoundingClientRect().top + 250));
await sleep(300);
await edFig.locator("img").click({ position: { x: 60, y: 420 } });
await sleep(400);
const w50Box = await page.getByRole("button", { name: "Rộng 50%" }).boundingBox();
check("ảnh dài: thanh chỉnh ảnh vẫn hiện trong màn hình", !!w50Box && w50Box.y >= 0 && w50Box.y < 600, JSON.stringify(w50Box));
const cover = await page.evaluate(() => ({
  header: document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0,
  toolbar: document.querySelector('[aria-label="Kiểu đoạn"]')?.getBoundingClientRect().top ?? -1,
}));
check("thanh công cụ dính không bị thanh tiêu đề che", cover.toolbar >= cover.header - 1, JSON.stringify(cover));
await page.setViewportSize({ width: 1280, height: 900 });

// Dán từ Word: danh sách mso-list + canh giữa + ảnh file:// (không đọc được → bỏ, báo)
const WORD_HTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>
<p class=MsoNormal align=center style='text-align:center'><b>Đoạn Word canh giữa</b><o:p></o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span><![endif]>Bước một Word<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span><![endif]>Bước hai Word<o:p></o:p></p>
<p class=MsoNormal><img src="file:///C:/Users/a/AppData/Local/Temp/msohtmlclip1/01/clip_image001.png"><o:p></o:p></p>
</body></html>`;
const paste = (html) =>
  page.evaluate((h) => {
    const el = document.querySelector(".tnth-editor");
    const dt = new DataTransfer();
    dt.setData("text/html", h);
    dt.setData("text/plain", "x");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, html);
await editor.press("Control+End");
await page.keyboard.press("Enter");
await paste(WORD_HTML);
await sleep(300);
const olItems = await editor.locator("ol li").allInnerTexts();
check("dán Word: danh sách đánh số thành danh sách thật", olItems.length === 2 && olItems[0].includes("Bước một Word") && !olItems[0].includes("1."), JSON.stringify(olItems));
check("dán Word: giữ canh giữa + đậm", (await editor.locator("p", { hasText: "Đoạn Word canh giữa" }).getAttribute("style"))?.includes("center") && (await editor.locator("strong", { hasText: "Đoạn Word canh giữa" }).count()) === 1);
check("dán Word: ảnh file:// bị bỏ + có thông báo", (await editor.locator('img[src^="file:"]').count()) === 0 && (await page.getByText(/ảnh dán từ Word không đọc được/).count()) > 0);

// Dán từ Google Docs: thẻ bọc <b style="font-weight:normal"> không làm cả đoạn bị đậm; ảnh data: được tải lên máy chủ
const small = png(20, 20, 9).toString("base64");
const GDOCS_HTML = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-abc"><p dir="ltr" style="text-align:right"><span style="font-weight:400">Đoạn Google Docs </span><span style="font-weight:700">phần đậm</span></p><ul><li><p><span>Mục Docs</span></p></li></ul><p><img src="data:image/png;base64,${small}" width="20"></p></b>`;
await editor.press("Control+End");
await page.keyboard.press("Enter");
await paste(GDOCS_HTML);
await sleep(300);
check("dán Google Docs: không đậm cả đoạn, chỉ phần đậm", (await editor.locator("strong", { hasText: "Đoạn Google Docs" }).count()) === 0 && (await editor.locator("strong", { hasText: "phần đậm" }).count()) === 1);
check("dán Google Docs: canh phải + danh sách", (await editor.locator("p", { hasText: "Đoạn Google Docs" }).getAttribute("style"))?.includes("right") && (await editor.locator("ul li", { hasText: "Mục Docs" }).count()) === 1);
await page.waitForFunction(() => [...document.querySelectorAll(".tnth-editor figure img")].every((i) => i.getAttribute("src")?.startsWith("/uploads/")), null, { timeout: 20000 }).catch(() => {});
check("ảnh data: dán kèm được lấy về máy chủ", (await editor.locator("figure img").count()) === 2 && (await editor.locator('figure img[src^="data:"]').count()) === 0);

// Liên kết: nhập link độc bị từ chối, link thường được nhận
await editor.press("Control+End");
await page.keyboard.press("Enter");
page.once("dialog", (d) => d.accept("javascript:alert(1)"));
await page.getByRole("button", { name: "Chèn / sửa liên kết" }).click();
await sleep(200);
check("không cho chèn link javascript:", (await editor.locator('a[href^="javascript"]').count()) === 0);
let n = 0;
page.on("dialog", (d) => d.accept(n++ === 0 ? "https://doanthanhnien.vn" : "Trang Đoàn"));
await page.getByRole("button", { name: "Chèn / sửa liên kết" }).click();
await sleep(200);
page.removeAllListeners("dialog");
check("chèn link thường", (await editor.locator('a[href="https://doanthanhnien.vn"]').innerText().catch(() => "")) === "Trang Đoàn");

// Xuất bản
await page.getByRole("button", { name: /Xuất bản ngay/ }).first().click();
const post = await waitPost(tw, (p) => p.title === TITLE && p.contentDoc && p.status === "PUBLISHED");
check("xuất bản: máy chủ nhận bài + contentDoc", !!post);
const types = JSON.stringify(post?.contentDoc ?? {});
check("xuất bản: tài liệu có đủ định dạng", ["heading", "table", "figureImage", "orderedList", "bulletList", '"textAlign":"justify"', '"width":"50"', "Chú thích ảnh thử"].every((k) => types.includes(k)));
check("xuất bản: content là văn bản thuần", !!post?.content && !/[<>*#]|\]\(/.test(post.content) && post.content.includes("Mùa hè xanh"));

/* ================= C. Trang tin công khai ================= */
const guest = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
const gp = await guest.newPage();
gp.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 200)));
await gp.goto(`/tin-tuc/${post?.slug}`, { waitUntil: "networkidle" });
const body = gp.locator(".post-body").first();
await body.waitFor({ timeout: 15000 }).catch(() => {});
check("trang tin: hiện bài", (await body.innerText().catch(() => "")).includes("Mùa hè xanh"));
const pubFig = body.locator('figure[data-width="50"][data-align="left"]');
check("trang tin: ảnh đúng độ rộng 50% + sát trái", (await pubFig.count()) === 1);
const ratio = await pubFig.locator("img").evaluate(async (img) => {
  if (!img.complete) await new Promise((r) => (img.onload = r));
  const box = img.getBoundingClientRect();
  return { shown: box.height / box.width, real: img.naturalHeight / img.naturalWidth, w: box.width, natural: img.naturalWidth, parent: img.closest(".post-body").getBoundingClientRect().width };
});
check("trang tin: ảnh dọc KHÔNG bị cắt (tỉ lệ giữ nguyên)", Math.abs(ratio.shown - ratio.real) < 0.02, JSON.stringify(ratio));
check("trang tin: ảnh rộng tối đa 50% khung, không phóng to quá cỡ thật", Math.abs(ratio.w - Math.min(ratio.natural, ratio.parent * 0.5)) < 3, JSON.stringify(ratio));
const tiny = await body.locator("figure img").evaluateAll((imgs) => imgs.map((i) => ({ w: i.getBoundingClientRect().width, n: i.naturalWidth })));
check("trang tin: ảnh nhỏ không bị kéo giãn mờ", tiny.every((x) => x.w <= x.n + 1), JSON.stringify(tiny));
check("trang tin: chú thích ảnh", (await pubFig.locator("figcaption").innerText()) === "Chú thích ảnh thử");
check("trang tin: canh đều", (await body.locator("p", { hasText: "Mùa hè xanh" }).getAttribute("style"))?.includes("justify"));
check("trang tin: H2, đậm, bảng, danh sách số, link", (await body.locator("h2").count()) >= 1 && (await body.locator("strong", { hasText: "đậm nét" }).count()) === 1 && (await body.locator("table td, table th").count()) >= 1 && (await body.locator("ol li").count()) === 2 && (await body.locator('a[href="https://doanthanhnien.vn"][rel*="noopener"]').count()) === 1);
check("trang tin: không chèn HTML thô (không còn ký hiệu Markdown/thẻ)", !/<u>|\*\*|!\[/.test(await body.innerText()));
await pubFig.locator("button").click();
const lb = gp.getByRole("dialog", { name: "Xem ảnh phóng to" });
await lb.waitFor({ timeout: 3000 }).catch(() => {});
check("trang tin: bấm ảnh để phóng to", await lb.isVisible());
await gp.keyboard.press("Escape");

// Điện thoại 360px: ảnh rộng hết khung, không cuộn ngang
await gp.setViewportSize({ width: 360, height: 780 });
await gp.reload({ waitUntil: "networkidle" });
const mobile = await gp.evaluate(() => {
  const img = document.querySelector('.post-body figure[data-width="50"] img');
  const pb = document.querySelector(".post-body");
  return { img: img?.getBoundingClientRect().width ?? 0, natural: img?.naturalWidth ?? 0, body: pb?.getBoundingClientRect().width ?? 1, scroll: document.documentElement.scrollWidth };
});
check("360px: ảnh 50% được nới hết khung", Math.abs(mobile.img - Math.min(mobile.natural, mobile.body)) < 3, JSON.stringify(mobile));
check("360px: không cuộn ngang", mobile.scroll <= 361, JSON.stringify(mobile));

// Bài Markdown cũ hiển thị đúng định dạng (trước đây *nghiêng*, <u> hiện nguyên ký hiệu)
await gp.setViewportSize({ width: 1280, height: 900 });
await gp.goto(`/tin-tuc/thu-${RUN}-${legacyId}`, { waitUntil: "networkidle" });
const lbody = gp.locator(".post-body").first();
await lbody.waitFor({ timeout: 15000 }).catch(() => {});
check("bài cũ: nghiêng / gạch chân / đậm / danh sách hiển thị đúng", (await lbody.locator("em", { hasText: "nghiêng" }).count()) === 1 && (await lbody.locator("u", { hasText: "gạch chân" }).count()) === 1 && (await lbody.locator("ul li").count()) === 2);
check("bài cũ: không còn ký hiệu thô", !/<u>|\*nghiêng\*|^- Mục/m.test(await lbody.innerText()));
check("bài cũ: ảnh + chú thích", (await lbody.locator("figure figcaption", { hasText: "Chú thích cũ" }).count()) === 1);

// Mở bài cũ trong trình soạn thảo → chuyển sang tài liệu, lưu lại có contentDoc
await page.goto(`/quan-tri/xuat-ban/dang-bai?id=${legacyId}`, { waitUntil: "networkidle" });
await editor.waitFor({ timeout: 20000 });
await page.waitForFunction(() => document.querySelector(".tnth-editor em")?.textContent === "nghiêng", null, { timeout: 15000 }).catch(() => {});
check("mở bài cũ: trình soạn thảo hiện đúng định dạng + ảnh", (await editor.locator("em", { hasText: "nghiêng" }).count()) === 1 && (await editor.locator("figure img").count()) === 1);
await page.getByRole("button", { name: /Cập nhật bài/ }).first().click();
const migrated = await waitPost(tw, (p) => p.id === legacyId && p.contentDoc);
check("lưu bài cũ: có contentDoc, ảnh giữ nguyên", !!migrated && JSON.stringify(migrated.contentDoc).includes(IMG));

check("không có lỗi JavaScript trên trang", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
summary();
