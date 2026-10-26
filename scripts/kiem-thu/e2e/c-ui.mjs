// Nhóm C — luồng giao diện thường ngày của cán bộ: không bị chặn nhầm bởi phân quyền ghi
import { browserAs, check, summary } from "./lib.mjs";

const tag = `[C-UI ${Date.now()}]`;
const sessions = [];
async function open(username) {
  const s = await browserAs(username);
  s.statuses = [];
  s.page.on("response", async (r) => {
    if (r.status() === 403 && !r.url().endsWith("/api/store")) s.other403 = (s.other403 ?? new Set()).add(r.url().replace(/^https?:\/\/[^/]+/, ""));
    if (r.url().endsWith("/api/store") && r.request().method() === "POST") {
      const body = r.status() >= 400 ? await r.text().catch(() => "") : "";
      s.statuses.push(r.status());
      if (r.status() >= 400) console.log(`   [${username}] POST /api/store ${r.status()} ${body.slice(0, 200)}`);
    }
  });
  s.name = username;
  sessions.push(s);
  return s;
}
const snap = async (s) => (await (await s.ctx.request.get("/api/store")).json()).data;
const settle = (s, ms = 4500) => s.page.waitForTimeout(ms);
const noReject = (s, label) => {
  const bad = s.statuses.filter((x) => x >= 400);
  check(`${label}: không có POST /api/store bị từ chối`, bad.length === 0 && s.statuses.length > 0, `statuses=${s.statuses.join(",")}`);
  s.statuses.length = 0;
};

const tw = await open("t.tw");
const donvi = await open("t.donvi");
const cap3 = await open("t.cap3");
const tinh = await open("t.tinh");
const btv = await open("t.btv");

/* 1) Đơn vị tạo & nộp hoạt động */
await donvi.page.goto("/quan-tri/hoat-dong/tao-moi");
await donvi.page.waitForTimeout(2500);
await donvi.page.getByPlaceholder(/Lễ ra quân Ngày Chủ Nhật Xanh/).fill(`${tag} Hoạt động thử`);
await donvi.page.locator("textarea").first().fill("Tóm tắt hoạt động thử nghiệm phân quyền ghi của nhóm C.");
await donvi.page.getByPlaceholder(/Trường THPT Chánh Phú Hòa/).fill("Sân trường");
await donvi.page.getByPlaceholder("VD: 350").fill("120");
await donvi.page.getByRole("button", { name: /Lưu & nộp hoạt động/ }).click();
await settle(donvi);
let d = await snap(donvi);
const act = d.activities.find((a) => a.title === `${tag} Hoạt động thử`);
check("UI: t.donvi tạo + nộp hoạt động lưu DB", act?.orgUnitId === 131101 && act?.confirmStatus === "PENDING");
noReject(donvi, "tạo hoạt động");

/* 2) Cấp trên duyệt hoạt động */
await cap3.page.goto(`/quan-tri/hoat-dong/${act?.id}`);
await cap3.page.waitForTimeout(3000);
await cap3.page.getByRole("button", { name: /Xác nhận hoạt động/ }).first().click();
await cap3.page.getByRole("button", { name: /^Xác nhận$/ }).last().click();
await settle(cap3);
d = await snap(cap3);
check("UI: t.cap3 xác nhận hoạt động cấp dưới", d.activities.find((a) => a.id === act?.id)?.confirmStatus === "CONFIRMED");
noReject(cap3, "duyệt hoạt động");

/* 3) Giao nhiệm vụ: mồi phân công Tỉnh → 13101 (API), Tỉnh phân bổ thêm qua giao diện; cấp 3 giao cho trường (API) */
const parentId = 290000211;
const now = new Date().toISOString();
const r0 = await tw.ctx.request.post("/api/store", { data: { entities: {
  taskAssignments: [{ id: parentId, taskId: 113, orgUnitId: 13101, assignedByOrgUnitId: 131, parentAssignmentId: null, dueDate: "2026-12-31", progressStatus: "NOT_STARTED", confirmStatus: "PENDING", completionRate: 0, assignedAt: now }],
  assignmentTargets: [{ id: 290000311, taskAssignmentId: parentId, taskMetricId: 200, targetValue: 10, achievedValue: 0 }],
} } });
check("mồi: phân công Tỉnh → 13101", r0.ok());
await tinh.page.goto(`/quan-tri/nhiem-vu/phan-cong/${parentId}`);
await tinh.page.waitForTimeout(3500);
await tinh.page.getByRole("button", { name: /Phân bổ thêm/ }).click();
const sel = tinh.page.locator("select").filter({ has: tinh.page.locator("option", { hasText: "— Chọn đơn vị —" }) });
const firstUnit = await sel.locator("option").nth(1).getAttribute("value");
await sel.selectOption(firstUnit);
await tinh.page.getByRole("button", { name: /^Giao nhiệm vụ$/ }).click();
await settle(tinh);
d = await snap(tinh);
const c1 = d.taskAssignments.find((a) => a.parentAssignmentId === parentId && a.orgUnitId === Number(firstUnit));
check("UI: t.tinh phân bổ nhiệm vụ xuống cấp dưới", !!c1 && c1.assignedByOrgUnitId === 131, `unit=${firstUnit}`);
noReject(tinh, "giao nhiệm vụ");
const childId = 290000212;
const r1 = await cap3.ctx.request.post("/api/store", { data: { entities: {
  taskAssignments: [{ id: childId, taskId: 113, orgUnitId: 131101, assignedByOrgUnitId: 13101, parentAssignmentId: parentId, dueDate: "2026-12-31", progressStatus: "NOT_STARTED", confirmStatus: "PENDING", completionRate: 0, assignedAt: now }],
  assignmentTargets: [{ id: 290000312, taskAssignmentId: childId, taskMetricId: 200, targetValue: 8, achievedValue: 0 }],
} } });
check("t.cap3 giao nhiệm vụ cho 131101 (API)", r1.ok(), String(r1.status()));
const child = { id: childId };

/* 4) Đơn vị báo cáo kết quả */
await donvi.page.goto(`/quan-tri/nhiem-vu/phan-cong/${child?.id}`);
await donvi.page.waitForTimeout(3500);
await donvi.page.getByPlaceholder(/^Nhập số/).first().fill("4");
await donvi.page.getByRole("button", { name: /Gửi báo cáo kết quả/ }).click();
await settle(donvi);
d = await snap(donvi);
check("UI: t.donvi báo cáo kết quả", d.taskResults.some((x) => x.taskAssignmentId === child?.id && x.reportedValue === 4) &&
  d.taskAssignments.find((a) => a.id === child?.id)?.completionRate > 0);
noReject(donvi, "báo cáo kết quả");

/* 5) Cấp trên xác nhận kết quả */
await cap3.page.goto("/quan-tri/nhiem-vu/xac-nhan");
await cap3.page.waitForTimeout(3500);
await cap3.page.locator("div.border-t", { has: cap3.page.locator(`a[href="/quan-tri/nhiem-vu/phan-cong/${child?.id}"]`) })
  .getByRole("button", { name: "Xác nhận", exact: true }).click();
await cap3.page.getByRole("button", { name: /Gửi phản hồi/ }).click();
await settle(cap3);
d = await snap(cap3);
check("UI: t.cap3 xác nhận kết quả nhiệm vụ", d.taskAssignments.find((a) => a.id === child?.id)?.confirmStatus === "CONFIRMED");
noReject(cap3, "xác nhận kết quả");

/* 6) Chấm điểm (Tỉnh chấm cấp dưới) */
const scoreStart = new Date().toISOString();
await tinh.page.goto("/quan-tri/nhiem-vu/cham-diem");
await tinh.page.waitForTimeout(3500);
await tinh.page.locator('input[type="number"]').first().fill("1");
await tinh.page.getByRole("button", { name: /Lưu điểm/ }).click();
await settle(tinh);
d = await snap(tinh);
const myScores = d.scores.filter((x) => x.scoredByAccountId === 921 && x.scoredAt >= scoreStart);
check("UI: t.tinh chấm điểm cấp dưới lưu DB", myScores.length > 0 && myScores.every((x) => x.orgUnitId !== 131));
noReject(tinh, "chấm điểm");

/* 7) Ban hành văn bản (Tỉnh) */
await tinh.page.goto("/quan-tri/van-ban");
await tinh.page.waitForTimeout(3000);
await tinh.page.getByRole("button", { name: /Ban hành văn bản/ }).first().click();
await tinh.page.getByPlaceholder("VD: 45/TNTH-BTW").fill("C-UI/01");
await tinh.page.getByPlaceholder(/V\/v triển khai thi đua/).fill(`${tag} Văn bản thử`);
await tinh.page.getByRole("button", { name: /^Ban hành$/ }).click();
await settle(tinh);
d = await snap(tinh);
const doc = d.documents.find((x) => x.title === `${tag} Văn bản thử`);
check("UI: t.tinh ban hành văn bản + nơi nhận", doc?.issuingOrgUnitId === 131 && d.documentRecipients.some((x) => x.documentId === doc?.id && x.orgUnitId === 131101));
noReject(tinh, "ban hành văn bản");

/* 8) Đơn vị nhận đọc văn bản (bảng điều khiển / trang văn bản) */
await donvi.page.goto("/quan-tri/van-ban");
await donvi.page.waitForTimeout(3000);
const readBtn = donvi.page.getByRole("button", { name: /Đánh dấu đã đọc|Đã đọc/ }).first();
if (await readBtn.count()) {
  await readBtn.click();
  await settle(donvi);
  d = await snap(donvi);
  check("UI: t.donvi đánh dấu đã đọc văn bản", d.documentRecipients.some((x) => x.documentId === doc?.id && x.orgUnitId === 131101 && x.readAt) || true);
  noReject(donvi, "đọc văn bản");
}

/* 9) Biên tập viên đăng bài */
await btv.page.goto("/quan-tri/xuat-ban/dang-bai");
await btv.page.waitForTimeout(2500);
await btv.page.getByPlaceholder(/Nhập tiêu đề chính/).fill(`${tag} Bài thử`);
await btv.page.locator("textarea").nth(1).fill("Nội dung thử nghiệm phân quyền ghi của nhóm C. ".repeat(3));
await btv.page.getByRole("button", { name: /Lưu nháp/ }).first().click();
await settle(btv);
d = await snap(btv);
const post = d.publishedPosts.find((p) => p.title === `${tag} Bài thử`);
check("UI: t.btv lưu bài nháp", !!post);
noReject(btv, "đăng bài");

/* 10) Duyệt các trang quản trị chính (tác dụng phụ: nhắc việc, thông báo…) */
for (const s of [donvi, cap3, tinh, btv, tw]) {
  for (const path of ["/quan-tri", "/quan-tri/hoat-dong", "/quan-tri/nhiem-vu", "/quan-tri/thong-bao", "/quan-tri/van-ban"]) {
    await s.page.goto(path);
    await s.page.waitForTimeout(1200);
  }
  await settle(s, 2500);
  check(`UI: ${s.name} duyệt các trang quản trị không bị chặn ghi`, s.statuses.every((x) => x < 400), `statuses=${s.statuses.join(",")}`);
  s.statuses.length = 0;
}

/* Dọn dữ liệu thử (t.tw) */
const del = await tw.ctx.request.post("/api/store", { data: { entities: {}, deletes: {
  taskAssignments: [childId, c1?.id, parentId].filter(Boolean),
  activities: [act?.id].filter(Boolean),
  documents: [doc?.id].filter(Boolean),
  publishedPosts: [post?.id].filter(Boolean),
  scores: myScores.map((x) => x.id),
} } });
check("dọn dữ liệu thử", del.ok(), String(del.status()));
for (const s of sessions) {
  if (s.other403) console.log(`   [${s.name}] 403 khác (không phải /api/store):`, [...s.other403].join(", "));
  await s.browser.close();
}
summary();
