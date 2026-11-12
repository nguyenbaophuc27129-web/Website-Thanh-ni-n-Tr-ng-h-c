// Nhóm A — kiểm thử giao diện trên trình duyệt: phản ánh, tra cứu, điểm danh, thi (thường + thích ứng)
import { browserAs, check, summary } from "./lib.mjs";

const RUN = Date.now().toString(36);
const toastHas = async (page, re, timeout = 8000) => {
  try {
    await page.getByText(re).first().waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
};

/* ===== Khách: gửi phản ánh → trang chi tiết → nhắn thêm ===== */
{
  const { browser, page } = await browserAs(null);
  await page.goto("/phan-anh");
  await page.getByPlaceholder("Nguyễn Văn A").fill("Khách Giao Diện");
  await page.getByPlaceholder("email@example.com").fill(`ui-${RUN}@example.com`);
  await page.getByPlaceholder("Tóm tắt nội dung phản ánh").fill(`[A] Phản ánh giao diện ${RUN}`);
  await page.getByPlaceholder("Nhập nội dung…").fill("Nội dung phản ánh gửi từ trình duyệt để kiểm thử nhóm A.");
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /Gửi phản ánh/ }).click();
  let ok = true;
  try {
    await page.waitForURL(/\/phan-anh\/PA-[A-Z0-9]{5}-[A-Z0-9]{5}$/, { timeout: 10000 });
  } catch {
    ok = false;
  }
  check("giao diện: gửi phản ánh → chuyển tới trang mã mới", ok, page.url());
  const code = page.url().split("/").pop();
  check("trang chi tiết hiện phản ánh (tải từ API)", await toastHas(page, `Phản ánh giao diện ${RUN}`));
  await page.getByPlaceholder("Nhập nội dung…").fill(`Tin nhắn bổ sung ${RUN}`);
  await page.getByRole("button", { name: /Gửi tin nhắn/ }).click();
  check("giao diện: nhắn thêm hiện trong lịch sử", await toastHas(page, `Tin nhắn bổ sung ${RUN}`));

  await page.goto("/phan-anh/tra-cuu");
  await page.getByPlaceholder("Nhập mã tra cứu của bạn").fill(code.toLowerCase());
  await page.getByRole("button", { name: /Tra cứu ngay/ }).click();
  ok = true;
  try {
    await page.waitForURL(new RegExp(`/phan-anh/${code}$`), { timeout: 8000 });
  } catch {
    ok = false;
  }
  check("giao diện: tra cứu mã đúng → mở trang chi tiết", ok, page.url());

  await page.goto("/phan-anh/tra-cuu");
  await page.getByPlaceholder("Nhập mã tra cứu của bạn").fill("PA-ZZZZZ-ZZZZZ");
  await page.getByRole("button", { name: /Tra cứu ngay/ }).click();
  check("giao diện: mã sai → báo không tìm thấy", await toastHas(page, /Không tìm thấy phản ánh với mã/));

  await page.goto("/phan-anh/PA-2026-27001");
  check("giao diện: mã kiểu cũ khi chưa đăng nhập → yêu cầu đăng nhập", await toastHas(page, /kiểu cũ chỉ xem được khi đăng nhập/));
  check("không lộ nội dung phản ánh mã cũ", !(await page.content()).includes("[A] Phản ánh mã cũ"));
  await browser.close();
}

/* ===== Đoàn viên: phản ánh của tôi + mã cũ ===== */
{
  const { browser, page } = await browserAs("t.dv1");
  await page.goto("/tai-khoan");
  check("tài khoản: phản ánh của tôi lấy từ API", await toastHas(page, "PA-2026-27001"));
  await page.goto("/phan-anh/PA-2026-27001");
  check("đúng người gửi xem được mã kiểu cũ", await toastHas(page, "[A] Phản ánh mã cũ"));
  check("không hiện ghi chú nội bộ", !(await page.content()).includes("GHI CHU NOI BO"));
  await browser.close();
}

/* ===== Khách: điểm danh ===== */
{
  const { browser, page } = await browserAs(null);
  await page.goto("/diem-danh/271001");
  check("điểm danh: trang hiện đang mở", await toastHas(page, /Đang mở điểm danh/));
  const nm = `Học Sinh UI ${RUN}`;
  await page.getByPlaceholder("VD: Nguyễn Văn A").fill(nm);
  await page.getByPlaceholder("VD: 11A2").fill("10A1");
  await page.getByRole("button", { name: /^Điểm danh$/ }).click();
  check("điểm danh thành công", await toastHas(page, /Đã điểm danh thành công/));
  await page.getByPlaceholder("VD: Nguyễn Văn A").fill(nm);
  await page.getByPlaceholder("VD: 11A2").fill("10a1");
  await page.getByRole("button", { name: /^Điểm danh$/ }).click();
  check("điểm danh trùng bị từ chối", await toastHas(page, /đã điểm danh hoạt động này rồi/));
  await page.goto("/diem-danh/271002");
  check("hoạt động đóng: báo chưa mở", await toastHas(page, /Điểm danh chưa được mở/));
  await browser.close();
}

/* ===== Khách: đề thích ứng ===== */
{
  const { browser, page } = await browserAs(null);
  await page.goto("/thi-kien-thuc/A-THICHUNG");
  await page.getByPlaceholder("VD: Nguyễn Văn A").fill(`Thích ứng UI ${RUN}`);
  await page.getByRole("button", { name: /Vào thi ngay/ }).click();
  check("thích ứng: câu đầu MEDIUM", await toastHas(page, "[A] Vừa 1 — chọn A"));
  await page.getByRole("button", { name: "A", exact: true }).click();
  await page.getByRole("button", { name: /Câu tiếp theo/ }).click();
  check("đúng → câu khó", await toastHas(page, "[A] Khó 1 — chọn B"));
  await page.getByRole("button", { name: "B", exact: true }).click();
  await page.getByRole("button", { name: /Câu tiếp theo/ }).click();
  check("đúng → câu khó tiếp", await toastHas(page, "[A] Khó 2 — chọn C"));
  await page.getByRole("button", { name: "A", exact: true }).click(); // cố tình sai
  await page.getByRole("button", { name: /Câu tiếp theo/ }).click();
  check("sai → câu vừa", await toastHas(page, "[A] Vừa 2 — chọn D"));
  await page.getByRole("button", { name: /^Nộp bài$/ }).first().click();
  check("thích ứng: nộp bài thành công", await toastHas(page, /Đã nộp bài thành công/));
  const html = await page.content();
  check("thích ứng: điểm server 5/8", /5<span[^>]*>\/8<\/span>/.test(html), html.match(/text-emerald-600">([^<]*)<span[^>]*>([^<]*)/)?.slice(1).join("") ?? "");
  await browser.close();
}

/* ===== Khách: đề thường trộn câu + đáp án =====
 * (đoàn viên chưa thử được qua giao diện: snapshot member của /api/store lỗi 500 vì
 *  view citizen_feedbacks không có trong DB — lỗi có sẵn, ngoài phạm vi nhóm A) */
{
  const { browser, page } = await browserAs(null);
  await page.goto("/thi-kien-thuc/A-THUONG");
  await page.getByPlaceholder("VD: Nguyễn Văn A").fill(`Đề thường UI ${RUN}`);
  await page.getByRole("button", { name: /Vào thi ngay/ }).click();
  await page.getByText(/Câu 1\/5/).waitFor({ timeout: 8000 });
  for (let i = 0; i < 5; i++) {
    const text = await page.content();
    if (text.includes("thành lập năm nào")) {
      await page.getByRole("button", { name: "1931", exact: true }).click();
    } else if (text.includes("Chọn các phong trào")) {
      await page.getByRole("button", { name: "Thanh niên tình nguyện", exact: true }).click();
      await page.getByRole("button", { name: "Sinh viên 5 tốt", exact: true }).click();
    } else if (text.includes("Ngày 26/3")) {
      await page.getByRole("button", { name: "Sai", exact: true }).click(); // cố tình sai
    } else if (text.includes("Đoàn mang tên Chủ tịch")) {
      await page.getByPlaceholder("Nhập đáp án…").fill("hồ chí minh");
    } else if (text.includes("Nêu cảm nghĩ")) {
      await page.getByPlaceholder("Trình bày ý kiến của bạn…").fill("Tự luận chờ giám khảo.");
    }
    if (i < 4) await page.getByRole("button", { name: /Câu tiếp/ }).click();
  }
  await page.getByRole("button", { name: /^Nộp bài$/ }).last().click();
  check("đề thường: nộp bài thành công", await toastHas(page, /Đã nộp bài thành công/));
  const html = await page.content();
  check("đề thường (trộn đáp án): điểm server 4/7", /4<span[^>]*>\/7<\/span>/.test(html));
  check("có 1 câu chờ giám khảo chấm", html.includes("Chờ giám khảo chấm"));
  await browser.close();
}

summary();
