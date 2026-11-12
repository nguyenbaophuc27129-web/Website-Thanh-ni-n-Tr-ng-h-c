import { browserAs, check, summary } from "./lib.mjs";
const title = `Bài thử đồng bộ ${Date.now()}`;
const { browser, ctx, page } = await browserAs("t.btv");
await page.goto("/quan-tri/xuat-ban/dang-bai");
await page.getByPlaceholder(/Nhập tiêu đề chính/).fill(title);
await page.locator(".tnth-editor").click();
await page.keyboard.insertText("Nội dung thử nghiệm đồng bộ dữ liệu sau khi sửa giai đoạn 0. ".repeat(3));
await page.getByRole("button", { name: /Lưu nháp/ }).first().click();
await page.waitForTimeout(6000); // debounce 1.2s + vòng nạp lại 4s
let snap = await (await ctx.request.get("/api/store")).json();
let post = snap.data.publishedPosts.find((p) => p.title === title);
check("bài nháp mới lưu vào DB", !!post);
check("bài vẫn còn trên màn hình sau 6s", await page.getByPlaceholder(/Nhập tiêu đề chính/).inputValue() === title);
await page.reload();
await page.goto("/quan-tri/xuat-ban");
await page.waitForTimeout(2500);
check("F5 vẫn thấy bài", (await page.content()).includes(title));

// sửa tiêu đề → chỉ dòng đổi được gửi
const reqs = [];
page.on("request", (r) => { if (r.url().endsWith("/api/store") && r.method() === "POST") reqs.push(r.postData() ?? ""); });
await page.goto(`/quan-tri/xuat-ban/dang-bai?id=${post?.id}`);
await page.waitForTimeout(2000);
await page.getByPlaceholder(/Nhập tiêu đề chính/).fill(title + " (sửa)");
await page.getByRole("button", { name: /Lưu nháp/ }).first().click();
await page.waitForTimeout(3000);
snap = await (await ctx.request.get("/api/store")).json();
check("sửa tiêu đề lưu được", snap.data.publishedPosts.some((p) => p.title === title + " (sửa)"));
const body = reqs.length ? JSON.parse(reqs[reqs.length - 1]) : null;
check("chỉ gửi đúng 1 dòng thay đổi", body?.entities?.publishedPosts?.length === 1, reqs.map((r) => r.length + "B").join(","));
// thay đổi rồi đóng tab ngay (pagehide) vẫn lưu
await page.getByPlaceholder(/Nhập tiêu đề chính/).fill(title + " (đóng tab)");
await page.getByRole("button", { name: /Lưu nháp/ }).first().click();
await page.waitForTimeout(150);
await page.close({ runBeforeUnload: true });
await new Promise((r) => setTimeout(r, 2500));
snap = await (await ctx.request.get("/api/store")).json();
check("đóng tab ngay sau khi lưu vẫn ghi DB", snap.data.publishedPosts.some((p) => p.title === title + " (đóng tab)"));
await browser.close();
summary();
