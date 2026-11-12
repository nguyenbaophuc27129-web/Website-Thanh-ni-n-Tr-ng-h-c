// Nhóm C — kiểm quyền ghi POST /api/store bằng gọi API trực tiếp
import { request } from "playwright";
import { BASE, PW, check, summary } from "./lib.mjs";

const now = new Date().toISOString();
const ID = (n) => 290000000 + n; // dải id riêng của nhóm C

async function as(username) {
  const ctx = await request.newContext({ baseURL: BASE });
  if (username) {
    const r = await ctx.post("/api/auth/login", { data: { username, password: PW } });
    if (!r.ok()) throw new Error(`login ${username} ${r.status()}`);
  }
  return ctx;
}
async function post(ctx, entities = {}, deletes = {}) {
  const r = await ctx.post("/api/store", { data: { entities, deletes } });
  const j = await r.json().catch(() => null);
  return { status: r.status(), j };
}
async function snap(ctx) {
  return (await (await ctx.get("/api/store")).json()).data;
}
const expect = (name, res, status) =>
  check(name, res.status === status, `HTTP ${res.status}${res.j?.error ? " — " + res.j.error : ""}`);

const tw = await as("t.tw");
const tinh = await as("t.tinh");
const tinhkhac = await as("t.tinhkhac");
const cap3 = await as("t.cap3");
const donvi = await as("t.donvi");
const donvi2 = await as("t.donvi2");
const btv = await as("t.btv");
const dv1 = await as("t.dv1");
const guest = await as(null);

/* ---------- Dữ liệu mồi do t.tw tạo (toàn quyền) ---------- */
const act = (id, org, extra = {}) => ({
  id, orgUnitId: org, title: `[C] HĐ thử ${id}`, summary: "Hoạt động thử phân quyền nhóm C",
  startDate: "2026-10-01", endDate: "2026-10-02", activityType: "GENERAL", status: "SUBMITTED",
  confirmStatus: "PENDING", imageSeed: 1, createdAt: now, links: [], categoryIds: [], ...extra,
});
const A1 = act(ID(101), 131101);
const A2 = act(ID(102), 131103, { links: [{ id: ID(704), activityId: ID(102), platform: "WEBSITE", url: "https://example.com/a2" }] });
const P1 = {
  id: ID(501), activityId: null, slug: `c-bai-tw-${ID(501)}`, title: "[C] Bài của TW", excerpt: "x", content: "Nội dung",
  coverSeed: 1, status: "PUBLISHED", isFeatured: false, publishedAt: now, viewCount: 0,
  authorOrgUnitName: "TW", editorAccountId: 920, categoryNames: [], createdAt: now,
};
const D1 = {
  id: ID(401), docNumber: "C-01", title: "[C] Văn bản tỉnh", summary: "x", documentCategoryId: 1,
  issuingOrgUnitId: 131, issuedDate: "2026-10-25", recipientScope: "SELECTED", status: "ISSUED", createdAt: now,
};
let r = await post(tw, {
  activities: [A1, A2], activityCategories: [], activityLinks: A2.links,
  publishedPosts: [P1], documents: [D1],
  documentRecipients: [
    { documentId: D1.id, orgUnitId: 131101, readAt: null },
    { documentId: D1.id, orgUnitId: 131103, readAt: null },
  ],
});
expect("t.tw tạo dữ liệu mồi (hoạt động, bài, văn bản)", r, 200);

/* ---------- Khách / đoàn viên ---------- */
expect("khách gửi POST bị từ chối (401)", await post(guest, { feedbacks: [{ id: ID(901), trackingCode: "PA-C", senderName: "x", senderEmail: "a@b.c", feedbackTopicId: 1, title: "t", content: "c", status: "NEW", submittedAt: now }] }), 401);
expect("đoàn viên t.dv1 gửi POST bị từ chối (403)", await post(dv1, { forumThreads: [{ id: ID(902), alias: "x", title: "t", authorAccountId: 927, content: "c", status: "PUBLISHED", likedByAccountIds: [], createdAt: now }] }), 403);

/* ---------- Chấm điểm ---------- */
const score = (id, org, by, task = 112) => ({
  id, criteriaSetId: 3, taskId: task, metricId: null, orgUnitId: org, points: 3, maxPoints: 23,
  scoringMethod: "MANUAL_CONFIRM", note: "[C]", scoredByAccountId: by, scoredAt: now,
});
expect("t.donvi tự chấm điểm đơn vị 131101 → 403", await post(donvi, { scores: [score(ID(601), 131101, 924)] }), 403);
expect("t.cap3 tự chấm điểm đơn vị mình 13101 → 403", await post(cap3, { scores: [score(ID(602), 13101, 923)] }), 403);
r = await post(cap3, { scores: [score(ID(603), 131101, 923)] });
expect("t.cap3 chấm điểm cấp dưới 131101 → OK", r, 200);
expect("t.cap3 chấm hộ đứng tên người khác → 403", await post(cap3, { scores: [{ ...score(ID(603), 131101, 924), points: 4 }] }), 403);

/* ---------- Tỉnh khác ---------- */
expect("t.tinhkhac sửa hoạt động của Nghệ An → 403", await post(tinhkhac, { activities: [{ ...A2, title: "bị sửa" }], activityCategories: [], activityLinks: [] }), 403);
expect("t.tinhkhac xoá hoạt động của Nghệ An → 403", await post(tinhkhac, {}, { activities: [A2.id] }), 403);
expect("t.tinhkhac sửa điểm của 131101 → 403", await post(tinhkhac, { scores: [{ ...score(ID(603), 131101, 922), points: 1 }] }), 403);
expect("t.tinhkhac xoá điểm của 131101 → 403", await post(tinhkhac, {}, { scores: [ID(603)] }), 403);
expect("t.tinhkhac 'kéo' hoạt động Nghệ An về Tuyên Quang → 403", await post(tinhkhac, { activities: [{ ...A2, orgUnitId: 100 }], activityCategories: [], activityLinks: [] }), 403);

/* ---------- Dữ liệu TW ---------- */
const data = await snap(donvi);
const set3 = data.criteriaSets.find((s) => s.id === 3);
expect("t.donvi sửa bộ tiêu chí TW → 403", await post(donvi, { criteriaSets: [{ ...set3, name: set3.name + " (sửa)" }] }), 403);
expect("t.donvi xoá bài của TW → 403", await post(donvi, {}, { publishedPosts: [P1.id] }), 403);
expect("t.donvi sửa bài của TW → 403", await post(donvi, { publishedPosts: [{ ...P1, title: "bị sửa" }] }), 403);
const siteName = data.settings.find((s) => s.settingKey === "site.name");
expect("t.donvi sửa settings → 403", await post(donvi, { settings: [{ ...siteName, value: "Bị sửa" }] }), 403);
expect("t.tinh sửa settings → 403", await post(tinh, { settings: [{ ...siteName, value: "Bị sửa" }] }), 403);

/* ---------- Gửi lại dòng y hệt của đơn vị khác ---------- */
// Dòng của đơn vị khác nay KHÔNG còn nằm trong snapshot của t.donvi (lọc đọc theo cây đơn vị) — lấy từ t.tw
const twData = await snap(tw);
const a2 = twData.activities.find((a) => a.id === A2.id);
const p1 = twData.publishedPosts.find((p) => p.id === P1.id);
r = await post(donvi, {
  activities: [{ ...a2, links: twData.activityLinks.filter((l) => l.activityId === A2.id), categoryIds: [] }], activityCategories: [], activityLinks: twData.activityLinks.filter((l) => l.activityId === A2.id), criteriaSets: [set3], publishedPosts: [p1], settings: [siteName],
  scores: twData.scores.filter((s) => s.id === ID(603)),
});
check("gửi lại dòng không đổi của đơn vị khác → không chặn, không ghi",
  r.status === 200 && Object.keys(r.j?.counts ?? {}).length === 0 && r.j?.skipped >= 5, JSON.stringify(r.j));

/* ---------- Văn bản ---------- */
expect("t.donvi đánh dấu đã đọc văn bản của đơn vị mình → OK",
  await post(donvi, { documentRecipients: [{ documentId: D1.id, orgUnitId: 131101, readAt: now }] }), 200);
expect("t.donvi đánh dấu đã đọc thay đơn vị 131103 → 403",
  await post(donvi, { documentRecipients: [{ documentId: D1.id, orgUnitId: 131103, readAt: now }] }), 403);
const recips = (await snap(donvi)).documentRecipients.filter((x) => x.documentId === D1.id);
check("read_at của 131101 đã lưu, 131103 vẫn trống",
  !!recips.find((x) => x.orgUnitId === 131101)?.readAt && !recips.find((x) => x.orgUnitId === 131103)?.readAt);
expect("t.donvi ban hành văn bản (không có document.issue) → 403",
  await post(donvi, { documents: [{ ...D1, id: ID(402), issuingOrgUnitId: 131101 }] }), 403);
expect("t.tinh thu hồi văn bản của tỉnh → OK", await post(tinh, { documents: [{ ...D1, status: "REVOKED" }] }), 200);
expect("t.tinhkhac thu hồi văn bản của Nghệ An → 403", await post(tinhkhac, { documents: [{ ...D1, status: "ISSUED" }] }), 403);

/* ---------- Hoạt động: tạo / duyệt ---------- */
const A3 = act(ID(103), 131101, { links: [{ id: ID(701), activityId: ID(103), platform: "WEBSITE", url: "https://example.com/c" }], categoryIds: [1] });
expect("t.donvi tạo hoạt động của đơn vị mình → OK",
  await post(donvi, { activities: [A3], activityCategories: [{ activityId: A3.id, categoryId: 1 }], activityLinks: A3.links }), 200);
expect("t.donvi tạo hoạt động cho đơn vị khác → 403", await post(donvi, { activities: [act(ID(104), 131103)], activityCategories: [], activityLinks: [] }), 403);
expect("t.donvi tự xác nhận hoạt động của mình → 403",
  await post(donvi, { activities: [{ ...A3, confirmStatus: "CONFIRMED" }], activityCategories: [{ activityId: A3.id, categoryId: 1 }], activityLinks: A3.links }), 403);
expect("t.cap3 duyệt hoạt động cấp dưới → OK",
  await post(cap3, { activities: [{ ...A3, confirmStatus: "CONFIRMED", reviewNote: "Tốt", updatedAt: now }], activityCategories: [{ activityId: A3.id, categoryId: 1 }], activityLinks: A3.links }), 200);
expect("t.cap3 sửa nội dung hoạt động cấp dưới → 403",
  await post(cap3, { activities: [{ ...A3, title: "cấp trên sửa", confirmStatus: "CONFIRMED", reviewNote: "Tốt", updatedAt: now }], activityCategories: [{ activityId: A3.id, categoryId: 1 }], activityLinks: A3.links }), 403);
const s3 = await snap(donvi);
const a3db = s3.activities.find((a) => a.id === A3.id);
check("hoạt động giữ chuyên mục + liên kết sau khi duyệt",
  a3db?.confirmStatus === "CONFIRMED" && s3.activityLinks.filter((l) => l.activityId === A3.id).length === 1 &&
  s3.activityCategories.filter((c) => c.activityId === A3.id).length === 1);
// Đơn vị sửa hoạt động (liên kết sinh id mới như updateActivity) → thay bảng con
const A3b = { ...A3, confirmStatus: "CONFIRMED", reviewNote: "Tốt", links: [{ id: ID(702), activityId: A3.id, platform: "FACEBOOK", url: "https://fb.com/c" }], categoryIds: [] };
expect("t.donvi sửa liên kết/chuyên mục hoạt động của mình → OK", await post(donvi, { activities: [A3b], activityCategories: [], activityLinks: A3b.links }), 200);
const s3b = await snap(donvi);
check("bảng con được thay đúng", s3b.activityLinks.filter((l) => l.activityId === A3.id).map((l) => l.url).join() === "https://fb.com/c" &&
  s3b.activityCategories.filter((c) => c.activityId === A3.id).length === 0);
expect("t.donvi chiếm liên kết của hoạt động khác qua id → 403",
  await post(donvi, { activities: [{ ...A3b, title: "x" }], activityCategories: [], activityLinks: [{ id: ID(703), activityId: A3.id, platform: "WEBSITE", url: "https://x" }, ...(s3b.activityLinks.filter((l) => l.activityId === A2.id).map((l) => ({ ...l, activityId: A3.id })))] }),
  s3b.activityLinks.some((l) => l.activityId === A2.id) ? 403 : 200);

/* ---------- Nhiệm vụ: giao / báo cáo / xác nhận ---------- */
const X1 = { id: ID(201), taskId: 112, orgUnitId: 131101, assignedByOrgUnitId: 13101, parentAssignmentId: null, dueDate: "2026-12-31", progressStatus: "NOT_STARTED", confirmStatus: "PENDING", completionRate: 0, assignedAt: now };
const T1 = { id: ID(301), taskAssignmentId: X1.id, taskMetricId: 200, targetValue: 10, achievedValue: 0 };
expect("t.donvi tự giao nhiệm vụ → 403", await post(donvi, { taskAssignments: [{ ...X1, id: ID(202), assignedByOrgUnitId: 131101 }] }), 403);
expect("t.cap3 giao nhiệm vụ cho 131101 → OK",
  await post(cap3, { taskAssignments: [X1], assignmentTargets: [T1], notifications: [{ id: ID(801), recipientAccountId: 924, notificationType: "TASK_ASSIGNED", title: "[C] Nhiệm vụ mới", message: "x", isRead: false, createdAt: now }] }), 200);
expect("t.donvi báo cáo kết quả nhiệm vụ của mình → OK", await post(donvi, {
  taskAssignments: [{ ...X1, progressStatus: "IN_PROGRESS", completionRate: 50 }],
  assignmentTargets: [{ ...T1, achievedValue: 5 }],
  taskResults: [{ id: ID(311), taskAssignmentId: X1.id, assignmentTargetId: T1.id, reportedValue: 5, dataSource: "MANUAL", reportedByAccountId: 924, reportedAt: now }],
}), 200);
expect("t.donvi sửa chỉ tiêu được giao (target) → 403", await post(donvi, { assignmentTargets: [{ ...T1, targetValue: 1, achievedValue: 5 }] }), 403);
expect("t.donvi tự xác nhận kết quả của mình → 403", await post(donvi, { taskAssignments: [{ ...X1, progressStatus: "IN_PROGRESS", completionRate: 50, confirmStatus: "CONFIRMED" }] }), 403);
expect("t.donvi tự duyệt (assignmentReviews) → 403", await post(donvi, { assignmentReviews: [{ id: ID(321), taskAssignmentId: X1.id, reviewerAccountId: 924, action: "CONFIRM", reviewedAt: now }] }), 403);
expect("t.donvi2 báo cáo hộ nhiệm vụ của 131101 → 403", await post(donvi2, { taskResults: [{ id: ID(312), taskAssignmentId: X1.id, assignmentTargetId: T1.id, reportedValue: 9, dataSource: "MANUAL", reportedByAccountId: 925, reportedAt: now }] }), 403);
expect("t.cap3 xác nhận kết quả cấp dưới → OK", await post(cap3, {
  assignmentReviews: [{ id: ID(322), taskAssignmentId: X1.id, reviewerAccountId: 923, action: "CONFIRM", reviewedAt: now }],
  taskAssignments: [{ ...X1, progressStatus: "IN_PROGRESS", completionRate: 50, confirmStatus: "CONFIRMED", confirmedAt: now }],
}), 200);

/* ---------- Thông báo ---------- */
expect("t.donvi đánh dấu đã đọc thông báo của mình → OK", await post(donvi, { notifications: [{ id: ID(801), recipientAccountId: 924, notificationType: "TASK_ASSIGNED", title: "[C] Nhiệm vụ mới", message: "x", isRead: true, createdAt: now }] }), 200);
expect("t.donvi2 đánh dấu đã đọc thông báo của người khác → 403", await post(donvi2, { notifications: [{ id: ID(801), recipientAccountId: 924, notificationType: "TASK_ASSIGNED", title: "[C] Nhiệm vụ mới", message: "x", isRead: false, createdAt: now }] }), 403);

/* ---------- Bài viết ---------- */
const P2 = { ...P1, id: ID(502), slug: `c-bai-btv-${ID(502)}`, title: "[C] Bài BTV", status: "DRAFT", publishedAt: null, editorAccountId: 926 };
expect("t.btv đăng bài → OK", await post(btv, { publishedPosts: [P2] }), 200);
expect("t.btv sửa/xuất bản bài → OK", await post(btv, { publishedPosts: [{ ...P2, title: "[C] Bài BTV (sửa)", status: "PUBLISHED", publishedAt: now }] }), 200);
expect("t.donvi đăng bài (không có post.*) → 403", await post(donvi, { publishedPosts: [{ ...P2, id: ID(503), slug: `c-x-${ID(503)}`, editorAccountId: 924 }] }), 403);

/* ---------- Điểm danh (settings attendance_open_ids) ---------- */
// Cán bộ ngoài TW không còn ghi thẳng chuỗi qua /api/store — bật/tắt TỪNG hoạt động qua /api/diem-danh/mo-dong
// (kiểm đầy đủ ở g-kiem-duyet-diem-danh.mjs)
const openRow = (await snap(donvi)).settings.find((s) => s.settingKey === "attendance_open_ids");
const openIds = (openRow?.value ?? "").split(",").filter(Boolean);
const toggleOpen = async (ctx, activityId, open) => (await ctx.post("/api/diem-danh/mo-dong", { data: { activityId, open } })).status();
expect("t.donvi ghi thẳng attendance_open_ids qua /api/store → 403", await post(donvi, { settings: [{ ...(openRow ?? { settingKey: "attendance_open_ids", valueType: "STRING", groupName: "Hoạt động", description: "x" }), value: [...openIds, String(A3.id)].join(",") }] }), 403);
check("t.donvi mở điểm danh hoạt động của mình qua /api/diem-danh/mo-dong → 200", (await toggleOpen(donvi, A3.id, true)) === 200);
check("t.donvi mở điểm danh hoạt động đơn vị khác qua API riêng → 403", (await toggleOpen(donvi, A2.id, true)) === 403);
check("t.donvi đóng lại điểm danh → 200", (await toggleOpen(donvi, A3.id, false)) === 200);

/* ---------- t.tw làm mọi thứ ---------- */
expect("t.tw sửa bài TW + điểm + hoạt động đơn vị khác → OK", await post(tw, {
  publishedPosts: [{ ...P1, title: "[C] Bài của TW (sửa)" }],
  scores: [score(ID(603), 131101, 920)],
  activities: [{ ...A2, title: "[C] TW sửa" }], activityCategories: [], activityLinks: [],
}), 200);
expect("t.tw thêm settings → OK", await post(tw, { settings: [{ settingKey: "c.test.key", value: "1", valueType: "STRING", groupName: "Thử", description: "Nhóm C thử" }] }), 200);

/* ---------- Nhật ký ---------- */
// (đếm dòng audit_logs kiểm ở bước psql bên ngoài)

/* ---------- Dọn dữ liệu mồi (t.tw) ---------- */
r = await post(tw, {}, {
  taskResults: [ID(311)], assignmentReviews: [ID(322)], assignmentTargets: [ID(301)], taskAssignments: [ID(201)],
  scores: [ID(603)], publishedPosts: [ID(501), ID(502)], activities: [ID(101), ID(102), ID(103)], documents: [ID(401)],
});
expect("t.tw xoá dữ liệu mồi → OK", r, 200);

for (const c of [tw, tinh, tinhkhac, cap3, donvi, donvi2, btv, dv1, guest]) await c.dispose();
summary();
