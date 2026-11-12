// Nhóm J — Trang quản trị Tài nguyên (hộp thoại Thêm/Sửa): nhiều tệp = MỘT tài nguyên, không còn ô dung lượng/tên tệp gõ tay,
// khoá nút Lưu khi đang tải, sửa không đổi ngày đăng/đơn vị đăng, mở sửa hiện đủ tệp cũ, link YouTube cho clip,
// hỏi xác nhận khi đóng mà chưa lưu, vừa màn hình 360px, nút Tải gói .zip. Cần web thử + DB thử (migration 0028).
import { BASE, PW, browserAs, check, summary } from "./lib.mjs";
import { request } from "playwright";

const RUN = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pdf = (tag) => Buffer.from(`%PDF-1.4\n% ${tag} ${RUN}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const docx = (tag) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(`${tag} ${RUN} `.repeat(40))]);

const tw = await request.newContext({ baseURL: BASE });
if (!(await tw.post("/api/auth/login", { data: { username: "t.tw", password: PW } })).ok()) throw new Error("login t.tw");
const snap = async () => (await (await tw.get("/api/store")).json()).data?.resources ?? [];
async function waitRes(pred, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = (await snap()).find(pred);
    if (r) return r;
    await sleep(700);
  }
  return null;
}

// Tài nguyên cũ có sẵn 1 tệp, ngày đăng cũ, đơn vị đăng = 131 (không phải đơn vị của t.tw) — để thử "sửa không đổi"
const up = await tw.post("/api/uploads", { multipart: { kind: "tai-nguyen", file: { name: `cu-${RUN}.pdf`, mimeType: "application/pdf", buffer: pdf("cu") } } });
const OLD_URL = (await up.json()).file?.url;
check("tải tệp mẫu lên máy chủ", typeof OLD_URL === "string" && OLD_URL.startsWith("/uploads/tai-nguyen/"), String(OLD_URL));
const OLD_ID = 295000000 + Math.floor(Math.random() * 900000);
const OLD_TITLE = `Tài nguyên cũ ${RUN}`;
const OLD_DATE = "2024-03-05";
let res = await tw.post("/api/store", { data: { entities: { resources: [{
  id: OLD_ID, resourceTypeId: 2, title: OLD_TITLE, description: "mô tả cũ", fileName: `cu-${RUN}.pdf`, fileSizeKb: 1,
  isPublic: true, downloadCount: 0, publishedByOrgUnitId: 131, publishedAt: OLD_DATE, fileDataUrl: OLD_URL,
  attachments: [{ name: `cu-${RUN}.pdf`, url: OLD_URL, sizeKb: 1 }], status: "PUBLISHED",
}] }, deletes: {} } });
check("API: tạo tài nguyên cũ để thử sửa", res.status() === 200, String(res.status()));

const b = await browserAs("t.tw");
const errors = [];
b.page.on("pageerror", (e) => errors.push(e.message));
let dialogs = [];
let acceptNext = true;
b.page.on("dialog", async (d) => { dialogs.push(d.message()); await (acceptNext === false ? d.dismiss() : d.accept()); });
const page = b.page;
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("/quan-tri/tai-nguyen");
await page.getByRole("button", { name: /Thêm tài nguyên/ }).waitFor({ timeout: 15000 });
const modal = page.locator(".animate-modal-in");

/* ---------- 1) Bố cục hộp thoại Thêm ---------- */
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
const box = await modal.boundingBox();
check("Thêm: hộp thoại rộng (≥ 700px ở màn hình 1280)", box.width >= 700, `${Math.round(box.width)}px`);
check("Thêm: không còn ô 'Dung lượng (KB)'", (await modal.getByText("Dung lượng (KB)").count()) === 0);
check("Thêm: không còn ô gõ tên tệp tự do", (await modal.getByPlaceholder("mau-nhat-ky.docx").count()) === 0);
check("Thêm: có ô kéo thả tải nhiều tệp (tối đa 10)", (await modal.getByText(/Tối đa 10 tệp/).count()) > 0);
check("Thêm: chưa chọn loại clip thì chưa có ô link YouTube", (await modal.getByText("Link YouTube").count()) === 0);

/* ---------- 2) Nhiều tệp = MỘT tài nguyên; khoá Lưu khi đang tải ---------- */
const NAME_A = `bieu-mau-${RUN}.pdf`, NAME_B = `huong-dan-${RUN}.docx`;
await page.route("**/api/uploads", async (route) => { await sleep(900); await route.continue(); });
await modal.locator('input[data-testid="multi-upload-input"]').setInputFiles([
  { name: NAME_A, mimeType: "application/pdf", buffer: pdf("A") },
  { name: NAME_B, mimeType: "application/octet-stream", buffer: docx("B") },
]);
check("Thêm: nút Lưu khoá trong lúc đang tải", await modal.getByRole("button", { name: /Đang tải tệp…/ }).isDisabled());
await modal.getByText("Đã tải lên").first().waitFor({ timeout: 15000 });
await modal.getByRole("button", { name: "Lưu", exact: true }).waitFor({ timeout: 15000 });
await page.unroute("**/api/uploads");
check("Thêm: chân hộp thoại ghi '2 tệp'", (await modal.getByText(/^2 tệp/).count()) > 0);
check("Thêm: ô tên gợi ý theo tên tệp đầu", (await modal.getByPlaceholder(`bieu-mau-${RUN}`).count()) === 1);
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
const created = await waitRes((r) => r.title === `bieu-mau-${RUN}`);
check("Lưu 2 tệp → MỘT tài nguyên, tên lấy theo tệp đầu", !!created && (await snap()).filter((r) => r.title.includes(RUN) && r.attachments?.some((a) => a.name.includes(`bieu-mau-${RUN}`))).length === 1,
  JSON.stringify(created && { t: created.title, n: created.attachments?.length }));
check("Tài nguyên mới: đủ 2 tệp, dung lượng = tổng, tệp chính = tệp đầu", created?.attachments?.length === 2 && created.fileSizeKb === created.attachments.reduce((s, a) => s + a.sizeKb, 0) && created.fileName === created.attachments[0].name && created.fileDataUrl === created.attachments[0].url,
  JSON.stringify(created && { k: created.fileSizeKb, f: created.fileName }));
check("mã tài nguyên tạo ở trình duyệt (16 chữ số): trang chi tiết mở được", String(created?.id).length >= 16 && (await tw.get(`/tai-nguyen/${created.id}`)).status() === 200, String(created?.id));
const row = page.locator("li", { hasText: `bieu-mau-${RUN}` });
check("Danh sách: dòng ghi '2 tệp'", (await row.getByText(/2 tệp/).count()) > 0);

/* ---------- 3) Nút Tải gói .zip với nhiều tệp ---------- */
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }).catch(() => null), row.getByRole("button", { name: /Tải/ }).click()]);
check("Danh sách: bấm Tải nhiều tệp → tải về gói .zip", !!dl && /\.zip$/i.test(dl.suggestedFilename()), dl?.suggestedFilename());

/* ---------- 4) Sửa: hiện đủ tệp cũ, không đổi ngày đăng/đơn vị đăng ---------- */
await page.locator("li", { hasText: OLD_TITLE }).getByRole("button", { name: /Sửa/ }).click();
await modal.waitFor();
check("Sửa: hiện sẵn tệp cũ đã tải lên", (await modal.getByText(`cu-${RUN}.pdf`).count()) > 0 && (await modal.getByText("Đã tải lên").count()) === 1);
const NAME_C = `them-${RUN}.pdf`;
await modal.locator('input[data-testid="multi-upload-input"]').setInputFiles([{ name: NAME_C, mimeType: "application/pdf", buffer: pdf("C") }]);
await modal.getByText("Đã tải lên").nth(1).waitFor({ timeout: 15000 });
await modal.getByPlaceholder("VD: Mẫu nhật ký hoạt động Đoàn trường").count();
await modal.locator("textarea").fill("mô tả mới");
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
const edited = await waitRes((r) => r.id === OLD_ID && r.attachments?.length === 2 && r.description === "mô tả mới");
check("Sửa: thêm tệp mới → tài nguyên có 2 tệp, mô tả mới", !!edited, JSON.stringify(edited?.attachments?.map((a) => a.name)));
check("Sửa: KHÔNG đổi ngày đăng", String(edited?.publishedAt ?? "").startsWith(OLD_DATE), String(edited?.publishedAt));
check("Sửa: KHÔNG đổi đơn vị đăng (vẫn 131)", edited?.publishedByOrgUnitId === 131, String(edited?.publishedByOrgUnitId));
check("Sửa: tên giữ nguyên, tệp chính vẫn là tệp cũ", edited?.title === OLD_TITLE && edited?.fileName === `cu-${RUN}.pdf`);

// Bỏ bớt tệp
await page.locator("li", { hasText: OLD_TITLE }).getByRole("button", { name: /Sửa/ }).click();
await modal.waitFor();
await modal.getByRole("button", { name: `Xoá ${NAME_C}` }).click();
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
const shrunk = await waitRes((r) => r.id === OLD_ID && r.attachments?.length === 1);
check("Sửa: xoá bớt tệp → còn 1 tệp", !!shrunk && shrunk.fileSizeKb === shrunk.attachments[0].sizeKb);

/* ---------- 5) Clip YouTube ---------- */
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
await modal.locator("select").first().selectOption("5");
await modal.getByText("Link YouTube").waitFor({ timeout: 3000 }).then(() => check("Clip: chọn loại clip → hiện ô Link YouTube", true), () => check("Clip: chọn loại clip → hiện ô Link YouTube", false));
const CLIP_TITLE = `Clip thử ${RUN}`;
await modal.getByPlaceholder("VD: Mẫu nhật ký hoạt động Đoàn trường").fill(CLIP_TITLE);
await modal.getByPlaceholder(/youtube\.com\/watch/).fill("https://evil.example.com/watch?v=abcdefghijk");
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
await page.getByText(/Link clip phải là địa chỉ https của YouTube/).first().waitFor({ timeout: 4000 }).then(() => check("Clip: link không phải YouTube bị từ chối ngay", true), () => check("Clip: link không phải YouTube bị từ chối ngay", false));
check("Clip: hộp thoại vẫn mở sau khi báo lỗi", await modal.isVisible());
await modal.getByPlaceholder(/youtube\.com\/watch/).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
const clip = await waitRes((r) => r.title === CLIP_TITLE);
check("Clip: lưu được chỉ với link YouTube (không tệp)", clip?.videoUrl === "https://www.youtube.com/watch?v=dQw4w9WgXcQ" && (clip.attachments ?? []).length === 0 && !clip.fileDataUrl, JSON.stringify(clip && { v: clip.videoUrl, a: clip.attachments }));
check("Clip: dòng danh sách có nút 'Xem clip'", (await page.locator("li", { hasText: CLIP_TITLE }).getByRole("link", { name: /Xem clip/ }).count()) === 1);

/* ---------- 6) Không có tệp cũng không có link → báo ---------- */
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
await modal.getByPlaceholder("VD: Mẫu nhật ký hoạt động Đoàn trường").fill(`Rỗng ${RUN}`);
await modal.getByRole("button", { name: "Lưu", exact: true }).click();
await page.getByText(/ít nhất một tệp đính kèm hoặc dán link YouTube/).first().waitFor({ timeout: 4000 }).then(() => check("Thiếu tệp và link → báo lỗi, không lưu", true), () => check("Thiếu tệp và link → báo lỗi, không lưu", false));
await sleep(1500);
check("Thiếu tệp và link → không sinh tài nguyên", !(await snap()).some((r) => r.title === `Rỗng ${RUN}`));

/* ---------- 7) Hỏi xác nhận khi đóng mà chưa lưu ---------- */
dialogs = [];
await page.keyboard.press("Escape"); // đã gõ tên → có thay đổi
await sleep(300);
check("Đóng khi có thay đổi: hỏi xác nhận", dialogs.length === 1 && /chưa lưu/.test(dialogs[0]), dialogs.join("|"));
check("Đóng khi có thay đổi: đồng ý → đóng hộp thoại", !(await modal.isVisible().catch(() => false)));
dialogs = [];
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
await modal.getByRole("button", { name: "Hủy" }).click();
await sleep(300);
check("Đóng khi chưa gõ gì: không hỏi, đóng luôn", dialogs.length === 0 && !(await modal.isVisible().catch(() => false)));
dialogs = [];
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
await modal.locator("textarea").fill("đang soạn");
acceptNext = false; // lần này bấm "Hủy" ở hộp xác nhận
await modal.getByRole("button", { name: "Hủy" }).click();
await sleep(300);
check("Đóng khi có thay đổi: bấm Hủy ở hộp xác nhận → ở lại, giữ nội dung", dialogs.length === 1 && (await modal.isVisible()) && (await modal.locator("textarea").inputValue()) === "đang soạn");
acceptNext = true;
await modal.getByRole("button", { name: "Hủy" }).click();
await sleep(300);

/* ---------- 8) Điện thoại 360px ---------- */
await page.setViewportSize({ width: 360, height: 740 });
await page.getByRole("button", { name: /Thêm tài nguyên/ }).click();
await modal.waitFor();
const m = await modal.boundingBox();
check("360px: hộp thoại vừa chiều ngang màn hình", m.x >= 0 && m.x + m.width <= 360 + 1, `${Math.round(m.x)}+${Math.round(m.width)}`);
check("360px: không tràn ngang trong hộp thoại", await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
const cols = await modal.locator("select").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
check("360px: Loại và Trạng thái xếp 1 cột", cols.length === 2 && cols[0] === cols[1], cols.join(","));
await modal.getByRole("button", { name: "Hủy" }).click();

check("không lỗi JavaScript", errors.length === 0, errors.join(" | ").slice(0, 200));
await b.browser.close();
summary();
