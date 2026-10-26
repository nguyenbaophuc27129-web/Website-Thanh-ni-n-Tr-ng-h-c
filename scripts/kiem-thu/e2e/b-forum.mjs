// Nhóm B — luồng trình duyệt: đoàn viên đăng bài Diễn đàn có ảnh qua API riêng
import { deflateSync, crc32 } from "node:zlib";
import { browserAs, check, summary } from "./lib.mjs";

const RUN = Date.now().toString(36);
function png(seed) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    const row = [0];
    for (let x = 0; x < 16; x++) row.push((seed + x * 13) % 256, (y * 17) % 256, (seed * 7 + x * y) % 256);
    rows.push(Buffer.from(row));
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])) >>> 0);
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

const title = `Chia sẻ góc học tập ${RUN}`;
const badTitle = `Bài cần duyệt ${RUN}`;

// ---- dv1 đăng bài có ảnh ----
const a = await browserAs("t.dv1");
const storePosts = [];
a.page.on("request", (r) => {
  if (r.url().endsWith("/api/store") && r.method() === "POST") storePosts.push(r.postData() ?? "");
});
await a.page.goto("/dien-dan");
await a.page.getByPlaceholder(/Tiêu đề \(tối thiểu 5 ký tự\)/).fill(title);
await a.page.getByPlaceholder(/Nội dung tâm tư/).fill("Mình chia sẻ góc học tập gọn gàng giúp tập trung ôn thi hơn, mời các bạn góp ý.");
await a.page.locator('input[type="file"]').setInputFiles({ name: `goc-hoc-tap-${RUN}.png`, mimeType: "image/png", buffer: png(RUN.length * 31) });
await a.page.getByText(`goc-hoc-tap-${RUN}.png`).waitFor({ timeout: 15000 });
check("ảnh đính kèm đã tải lên (hiện chip tên tệp)", true);
const [resp] = await Promise.all([
  a.page.waitForResponse((r) => r.url().endsWith("/api/dien-dan/bai-viet")),
  a.page.getByRole("button", { name: /Đăng ẩn danh/ }).click(),
]);
const body = await resp.json();
check("POST /api/dien-dan/bai-viet thành công", resp.ok() && body.ok, resp.status());
check("bài sạch → PUBLISHED, có ảnh /uploads/dien-dan/", body.row?.status === "PUBLISHED" && /^\/uploads\/dien-dan\//.test(body.row?.media?.[0]?.dataUrl ?? ""));
const reqBody = JSON.parse(resp.request().postData() ?? "{}");
check("trình duyệt KHÔNG gửi verdict kiểm duyệt", !("verdict" in reqBody) && !("aiVerdict" in reqBody) && !("mod" in reqBody), Object.keys(reqBody).join(","));
await a.page.getByText("Đã gửi bài chia sẻ").first().waitFor({ timeout: 5000 }).then(() => check("toast thành công", true), () => check("toast thành công", false));
await a.page.getByRole("heading", { name: title }).waitFor({ timeout: 5000 });
check("bài hiện ngay trong bảng tin", true);
await a.page.waitForTimeout(5500); // qua 1 vòng debounce + nạp lại 4s
check("không đồng bộ forumThreads qua /api/store", !storePosts.some((p) => p.includes('"forumThreads"')), `${storePosts.length} lượt POST /api/store`);
check("bài vẫn còn sau vòng nạp lại", await a.page.getByRole("heading", { name: title }).isVisible());

// mở chi tiết — ảnh hiển thị từ /uploads/dien-dan/
await a.page.getByRole("heading", { name: title }).click();
await a.page.waitForURL(/\/dien-dan\/\d+/);
const img = a.page.locator('img[alt="goc-hoc-tap-' + RUN + '.png"], article img').first();
await img.waitFor({ timeout: 8000 });
const src = await img.getAttribute("src");
const loaded = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
check("trang chi tiết hiện ảnh đính kèm", /^\/uploads\/dien-dan\//.test(src ?? "") && loaded, src);
const threadUrl = a.page.url();

// bài vi phạm → chờ duyệt, chỉ tác giả thấy
await a.page.goto("/dien-dan");
await a.page.getByPlaceholder(/Tiêu đề \(tối thiểu 5 ký tự\)/).fill(badTitle);
await a.page.getByPlaceholder(/Nội dung tâm tư/).fill("Rủ cả lớp đi cá độ bóng đá cuối tuần này nhé mọi người");
await a.page.getByRole("button", { name: /Đăng ẩn danh/ }).click();
await a.page.getByText(/Bài của bạn đang chờ kiểm duyệt/).first().waitFor({ timeout: 8000 }).then(() => check("bài vi phạm → toast chờ kiểm duyệt", true), () => check("bài vi phạm → toast chờ kiểm duyệt", false));
await a.page.getByText(/Bài của bạn đang chờ duyệt/).waitFor({ timeout: 5000 }).then(() => check("tác giả thấy khối 'Bài của bạn đang chờ duyệt'", true), () => check("tác giả thấy khối 'Bài của bạn đang chờ duyệt'", false));
check("bài vi phạm không hiện trong bảng tin công khai", !(await a.page.getByRole("heading", { name: badTitle }).isVisible()));

// ---- người xem khác: dv2 nếu snapshot đoàn viên nạp được, ngược lại khách + cán bộ ----
// (GET /api/store phạm vi đoàn viên đang lỗi 500 "citizen_feedbacks" ở nhánh gốc — ngoài phạm vi nhóm B)
const probe = await browserAs("t.dv2");
const memberSnap = (await probe.ctx.request.get("/api/store")).status();
await probe.browser.close();
check("(thông tin) snapshot đoàn viên GET /api/store", true, `HTTP ${memberSnap}`);
const viewerName = memberSnap === 200 ? "t.dv2" : "t.btv";
const g = await browserAs(null);
await g.page.goto("/dien-dan");
await g.page.locator("article", { has: g.page.getByRole("heading", { name: title }) }).waitFor({ timeout: 10000 })
  .then(() => check("khách thấy bài công khai của dv1", true), () => check("khách thấy bài công khai của dv1", false));
check("khách không thấy bài đang chờ duyệt của dv1", (await g.page.getByText(badTitle).count()) === 0);
await g.browser.close();

const b = await browserAs(viewerName);
await b.page.goto("/dien-dan");
const card = b.page.locator("article", { has: b.page.getByRole("heading", { name: title }) });
await card.waitFor({ timeout: 10000 });
check(`${viewerName} thấy bài của dv1`, true);
check(`${viewerName} không thấy bài chờ duyệt trong bảng tin`, (await b.page.getByRole("heading", { name: badTitle }).count()) === 0);
const likeBtn = card.locator("button").first();
const [likeResp] = await Promise.all([
  b.page.waitForResponse((r) => r.url().endsWith("/api/dien-dan/thich")),
  likeBtn.click(),
]);
const lj = await likeResp.json();
check(`${viewerName} thích qua /api/dien-dan/thich`, lj.ok && lj.liked === true && lj.likeCount === 1, JSON.stringify({ liked: lj.liked, likeCount: lj.likeCount }));
await b.page.waitForTimeout(300);
check("nút thích hiện 1 và tô đỏ", (await likeBtn.innerText()).trim() === "1" && (await likeBtn.getAttribute("class"))?.includes("rose-600"), await likeBtn.innerText());
await b.page.reload();
await card.waitFor({ timeout: 10000 });
await b.page.waitForTimeout(1500);
check("F5 vẫn đếm 1 lượt thích", (await card.locator("button").first().innerText()).trim() === "1", await card.locator("button").first().innerText());

// người xem bình luận ở trang chi tiết
await b.page.goto(threadUrl.replace(/^https?:\/\/[^/]+/, ""));
await b.page.getByPlaceholder("Chia sẻ suy nghĩ của bạn…").fill(`Góc học tập đẹp quá ${RUN}`);
const [cResp] = await Promise.all([
  b.page.waitForResponse((r) => r.url().endsWith("/api/dien-dan/binh-luan")),
  b.page.getByRole("button", { name: /Gửi bình luận/ }).click(),
]);
check(`${viewerName} bình luận qua /api/dien-dan/binh-luan`, cResp.ok() && (await cResp.json()).row?.status === "PUBLISHED");
await b.page.getByText(`Góc học tập đẹp quá ${RUN}`).waitFor({ timeout: 5000 }).then(() => check("bình luận hiện ngay", true), () => check("bình luận hiện ngay", false));

await a.browser.close();
await b.browser.close();
summary();
