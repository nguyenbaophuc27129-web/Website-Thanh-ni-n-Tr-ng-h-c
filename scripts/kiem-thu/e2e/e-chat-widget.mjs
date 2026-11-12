// Nhóm E: widget Trợ lý ảo khi chưa đăng nhập — không vỡ giao diện, có trả lời;
// EXPECT_LIMIT=1 → hạn mức khách đã cạn: phải hiện thông báo tiếng Việt + gợi ý tự động.
import { browserAs, check, summary } from "./lib.mjs";
const expectLimit = process.env.EXPECT_LIMIT === "1";
const { browser, page } = await browserAs(null);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const apiStatus = [];
page.on("response", (r) => { if (r.url().endsWith("/api/ai/chat")) apiStatus.push(r.status()); });

await page.goto("/");
const fab = page.getByRole("button", { name: "Trợ lý ảo" });
check("nút Trợ lý ảo hiển thị", await fab.isVisible());
const input = page.getByPlaceholder("Nhập câu hỏi của bạn…");
// Chờ hydrate xong mới bấm (lần nạp đầu sau khởi động lại có thể chậm)
for (let i = 0; i < 10 && !(await input.isVisible()); i++) {
  await page.waitForTimeout(1500);
  if (!(await input.isVisible())) await fab.click();
  await page.waitForTimeout(500);
}
check("mở được khung chat", await input.isVisible());
check("ô nhập giới hạn 500 ký tự", (await input.getAttribute("maxlength")) === "500");
await input.fill("Học sinh 3 tốt là gì?");
await page.getByRole("button", { name: "Gửi" }).click();
await page.waitForTimeout(2500);
const bubbles = page.locator("div.max-w-\\[85\\%\\]");
const texts = await bubbles.allInnerTexts();
check("có câu trả lời của bot sau câu hỏi", texts.length >= 3, `${texts.length} bong bóng; API ${apiStatus.join(",")}`);
const joined = texts.join(" | ");
if (expectLimit) {
  check("API trả 429", apiStatus.includes(429));
  check("hiện thông báo quá hạn mức tiếng Việt", /quá nhiều yêu cầu/.test(joined) && /gợi ý tự động/.test(joined), joined.slice(-260));
} else {
  check("không hiện thông báo giới hạn khi chưa vượt", !/quá nhiều yêu cầu/.test(joined));
  check("API không bị chặn 401/403/429", apiStatus.every((s) => ![401, 403, 429].includes(s)), apiStatus.join(","));
}
check("không có lỗi JS trên trang", pageErrors.length === 0, pageErrors.join("; ").slice(0, 200));
await page.screenshot({ path: `/e2e/e-chat-widget${expectLimit ? "-429" : ""}.png` });
await browser.close();
summary();
