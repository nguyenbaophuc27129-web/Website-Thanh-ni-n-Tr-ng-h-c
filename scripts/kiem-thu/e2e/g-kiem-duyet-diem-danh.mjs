// Nhóm G — API riêng của cán bộ: kiểm duyệt diễn đàn, bật/tắt điểm danh từng hoạt động,
// created_by của dòng mới qua /api/store, che tác giả diễn đàn với cán bộ ngoài TW. Chỉ gọi API (không cần trình duyệt).
//   chay-e2e.sh g-kiem-duyet-diem-danh.mjs        (web thử + DB thử tnth_test, đủ 9 tài khoản t.*)
//   KEEP_DATA=1 giữ lại dữ liệu thử (không dọn cuối) để chạy các câu SQL kiểm created_by in ở cuối kết quả.
import { request } from "playwright";
import { BASE, PW, check, summary } from "./lib.mjs";

const RUN = Date.now().toString(36);
const ID = (n) => 296000000 + n; // dải id riêng của nhóm G
const now = new Date().toISOString();

async function as(username) {
  const ctx = await request.newContext({ baseURL: BASE });
  let accountId = null;
  if (username) {
    const r = await ctx.post("/api/auth/login", { data: { username, password: PW } });
    if (!r.ok()) throw new Error(`login ${username} ${r.status()}`);
    accountId = (await r.json()).session?.accountId ?? null;
  }
  return { ctx, accountId };
}
const call = async (who, path, data) => {
  const r = data === undefined ? await who.ctx.get(path) : await who.ctx.post(path, { data });
  return { status: r.status(), j: await r.json().catch(() => null) };
};
const store = (who, entities = {}, deletes = {}) => call(who, "/api/store", { entities, deletes });
const snap = async (who) => (await call(who, "/api/store")).j?.data ?? {};
const expect = (name, res, status) =>
  check(name, res.status === status, `HTTP ${res.status}${res.j?.error ? " — " + res.j.error : ""}`);
const moderate = (who, kind, id, action, reason) => call(who, "/api/dien-dan/kiem-duyet", { kind, id, action, reason });
const toggle = (who, activityId, open) => call(who, "/api/diem-danh/mo-dong", { activityId, open });
const isOpen = async (guest, id) => (await call(guest, `/api/diem-danh?activityId=${id}`)).j?.open === true;

const tw = await as("t.tw");
const tinh = await as("t.tinh");
const tinhkhac = await as("t.tinhkhac");
const cap3 = await as("t.cap3");
const donvi = await as("t.donvi");
const donvi2 = await as("t.donvi2");
const dv1 = await as("t.dv1");
const dv2 = await as("t.dv2");
const guest = await as(null);
const created = { threads: [], comments: [], activities: [], tasks: [], taskMetrics: [], reports: [], documents: [] };

/* =================================================================
 * 1) Diễn đàn: kiểm duyệt qua /api/dien-dan/kiem-duyet
 * ================================================================= */
const clean = await call(dv1, "/api/dien-dan/bai-viet", { title: `[G] Bài sạch ${RUN}`, content: "Chia sẻ cách ôn thi hiệu quả cho cả lớp, mời mọi người góp ý." });
const flagged = await call(dv1, "/api/dien-dan/bai-viet", { title: `[G] Bài cần duyệt ${RUN}`, content: "Rủ cả lớp đi cá độ bóng đá cuối tuần này nhé mọi người" });
const T1 = clean.j?.row?.id;
const T2 = flagged.j?.row?.id;
created.threads.push(T1, T2);
check("dv1 đăng bài sạch → PUBLISHED, bài vi phạm → HIDDEN", clean.j?.row?.status === "PUBLISHED" && flagged.j?.row?.status === "HIDDEN", `${clean.j?.row?.status}/${flagged.j?.row?.status}`);
const c1 = await call(dv2, "/api/dien-dan/binh-luan", { threadId: T1, content: `Bình luận sạch ${RUN} rất hữu ích.` });
const c2 = await call(dv2, "/api/dien-dan/binh-luan", { threadId: T1, content: "Rủ nhau đi cá độ bóng đá nhé mọi người ơi" });
const C1 = c1.j?.row?.id;
const C2 = c2.j?.row?.id;
created.comments.push(C1, C2);
check("bình luận sạch PUBLISHED, bình luận vi phạm PENDING_REVIEW", c1.j?.row?.status === "PUBLISHED" && c2.j?.row?.status === "PENDING_REVIEW", `${c1.j?.row?.status}/${c2.j?.row?.status}`);
// dv1 + dv2 cùng thích bài sạch → likeCount 2 để kiểm che
await call(dv1, "/api/dien-dan/thich", { kind: "THREAD", id: T1 });
await call(dv2, "/api/dien-dan/thich", { kind: "THREAD", id: T1 });

/* ---- quyền: chỉ cán bộ có forum.manage (mặc định QUAN_TRI_TW) ---- */
expect("khách duyệt bài → 401", await moderate(guest, "THREAD", T2, "APPROVE"), 401);
expect("đoàn viên t.dv1 tự duyệt bài của mình → 403", await moderate(dv1, "THREAD", T2, "APPROVE"), 403);
expect("t.tinh (không có forum.manage) duyệt bài → 403", await moderate(tinh, "THREAD", T2, "APPROVE"), 403);
expect("t.tinhkhac duyệt bài → 403", await moderate(tinhkhac, "THREAD", T2, "APPROVE"), 403);
expect("t.cap3 ẩn bài → 403", await moderate(cap3, "THREAD", T1, "HIDE"), 403);
expect("t.donvi từ chối bình luận → 403", await moderate(donvi, "COMMENT", C2, "REJECT"), 403);
let twSnap = await snap(tw);
const rowOf = (s, ent, id) => (s[ent] ?? []).find((r) => r.id === id);
check("bị từ chối quyền → dữ liệu không đổi (bài vi phạm vẫn HIDDEN, bình luận vẫn PENDING_REVIEW)",
  rowOf(twSnap, "forumThreads", T2)?.status === "HIDDEN" && rowOf(twSnap, "forumComments", C2)?.status === "PENDING_REVIEW");

/* ---- dữ liệu sai ---- */
expect("kind sai → 400", await moderate(tw, "POST", T2, "APPROVE"), 400);
expect("action sai → 400", await moderate(tw, "THREAD", T2, "DELETE"), 400);
expect("id không hợp lệ → 400", await moderate(tw, "THREAD", -1, "APPROVE"), 400);
expect("bài không tồn tại → 404", await moderate(tw, "THREAD", 2147483000, "APPROVE"), 404);
expect("bình luận không tồn tại → 404", await moderate(tw, "COMMENT", 2147483000, "HIDE"), 404);

/* ---- TW duyệt / từ chối / ẩn ---- */
let r = await moderate(tw, "THREAD", T2, "APPROVE");
expect("t.tw duyệt bài chờ duyệt → 200", r, 200);
check("bài được duyệt → PUBLISHED, ghi người duyệt + giờ duyệt, không còn lý do từ chối",
  r.j?.row?.status === "PUBLISHED" && r.j.row.moderatedByAccountId === tw.accountId && !!r.j.row.moderatedAt && r.j.row.rejectionReason == null, JSON.stringify(r.j?.row));
check("dòng trả cho TW không che tác giả", r.j?.row?.authorAccountId === dv1.accountId);
const pubGuest = (await snap(guest)).forumThreads ?? [];
check("khách thấy bài vừa duyệt", pubGuest.some((t) => t.id === T2));

r = await moderate(tw, "THREAD", T1, "HIDE");
check("t.tw ẩn bài → HIDDEN, không lý do", r.status === 200 && r.j?.row?.status === "HIDDEN" && r.j.row.rejectionReason == null);
check("khách không còn thấy bài đã ẩn", !((await snap(guest)).forumThreads ?? []).some((t) => t.id === T1));
r = await moderate(tw, "THREAD", T1, "REJECT", "Nội dung quảng cáo");
check("t.tw từ chối bài + lý do → HIDDEN, lưu lý do", r.status === 200 && r.j?.row?.status === "HIDDEN" && r.j.row.rejectionReason === "Nội dung quảng cáo");
check("tác giả dv1 thấy lý do từ chối bài của mình, người khác (dv2) không thấy bài",
  rowOf(await snap(dv1), "forumThreads", T1)?.rejectionReason === "Nội dung quảng cáo" && !rowOf(await snap(dv2), "forumThreads", T1));
r = await moderate(tw, "THREAD", T1, "REJECT");
check("từ chối không kèm lý do → lý do mặc định", r.status === 200 && typeof r.j?.row?.rejectionReason === "string" && r.j.row.rejectionReason.length > 0);
r = await moderate(tw, "THREAD", T1, "APPROVE");
check("mở lại bài → PUBLISHED, xoá lý do từ chối", r.status === 200 && r.j?.row?.status === "PUBLISHED" && r.j.row.rejectionReason == null);

r = await moderate(tw, "COMMENT", C1, "REJECT");
check("t.tw từ chối bình luận → REJECTED", r.status === 200 && r.j?.row?.status === "REJECTED");
r = await moderate(tw, "COMMENT", C2, "APPROVE");
check("t.tw duyệt bình luận chờ duyệt → PUBLISHED", r.status === 200 && r.j?.row?.status === "PUBLISHED" && r.j.row.moderatedByAccountId === tw.accountId);
r = await moderate(tw, "COMMENT", C2, "HIDE");
check("ẩn bình luận → REJECTED", r.status === 200 && r.j?.row?.status === "REJECTED");
r = await moderate(tw, "COMMENT", C2, "APPROVE");
check("duyệt lại bình luận → PUBLISHED", r.status === 200 && r.j?.row?.status === "PUBLISHED");

// Nội dung/tác giả/lượt thích không bị động tới
twSnap = await snap(tw);
const t1 = rowOf(twSnap, "forumThreads", T1);
check("duyệt/ẩn không đổi nội dung, tác giả, lượt thích",
  t1?.title === `[G] Bài sạch ${RUN}` && t1.authorAccountId === dv1.accountId && t1.likedByAccountIds.length === 2, JSON.stringify({ a: t1?.authorAccountId, l: t1?.likedByAccountIds }));

/* ---- snapshot: cán bộ ngoài TW không thấy tác giả / người thích ---- */
for (const [name, who] of [["t.tinh", tinh], ["t.cap3", cap3], ["t.donvi", donvi]]) {
  const s = await snap(who);
  const mine = (s.forumThreads ?? []).filter((t) => [T1, T2].includes(t.id)).concat((s.forumComments ?? []).filter((c) => [C1, C2].includes(c.id)));
  check(`${name}: thấy bài/bình luận đã duyệt`, mine.length >= 3, `${mine.length} dòng`);
  check(`${name}: authorAccountId = null trên mọi dòng diễn đàn`, (s.forumThreads ?? []).concat(s.forumComments ?? []).every((x) => x.authorAccountId === null));
  check(`${name}: likedByAccountIds rỗng, vẫn có likeCount`, (s.forumThreads ?? []).every((x) => x.likedByAccountIds.length === 0) && rowOf(s, "forumThreads", T1)?.likeCount === 2, `likeCount=${rowOf(s, "forumThreads", T1)?.likeCount}`);
  check(`${name}: không có dấu vết kiểm duyệt của người khác`, mine.every((x) => !("moderatedByAccountId" in x) && !("aiReason" in x)));
}
check("TW vẫn thấy đủ tác giả + người thích", rowOf(twSnap, "forumThreads", T1)?.authorAccountId === dv1.accountId && rowOf(twSnap, "forumThreads", T1)?.likedByAccountIds.includes(dv2.accountId));
// cán bộ thích bài: chỉ thấy mình trong likedByAccountIds
await call(tinh, "/api/dien-dan/thich", { kind: "THREAD", id: T1 });
const tinhRow = rowOf(await snap(tinh), "forumThreads", T1);
check("t.tinh thích bài → chỉ thấy chính mình trong likedByAccountIds, likeCount = 3", tinhRow?.likedByAccountIds.length === 1 && tinhRow.likedByAccountIds[0] === tinh.accountId && tinhRow.likeCount === 3);

/* ---- /api/store không còn ghi được dòng diễn đàn ---- */
const stolen = rowOf(await snap(tinh), "forumThreads", T1); // dòng đã che (authorAccountId null)
expect("t.tinh UPSERT cả dòng diễn đàn (đã che) qua /api/store → 403", await store(tinh, { forumThreads: [{ ...stolen, title: "bị sửa" }] }), 403);
expect("t.tinh UPSERT bình luận qua /api/store → 403", await store(tinh, { forumComments: [{ id: C1, threadId: T1, alias: "x", authorAccountId: 1, content: "bị sửa", status: "PUBLISHED", likedByAccountIds: [], createdAt: now }] }), 403);
expect("t.tinh xoá bài diễn đàn qua /api/store → 403", await store(tinh, {}, { forumThreads: [T1] }), 403);
expect("t.tw UPSERT bài diễn đàn qua /api/store cũng bị từ chối (ghi qua API riêng) → 403", await store(tw, { forumThreads: [{ ...t1, title: "TW sửa" }] }), 403);
expect("đoàn viên t.dv1 UPSERT diễn đàn qua /api/store → 403", await store(dv1, { forumThreads: [{ ...t1, title: "dv sửa" }] }), 403);
twSnap = await snap(tw);
check("sau các lần ghi bị từ chối: bài vẫn nguyên (tiêu đề, tác giả, người thích)",
  rowOf(twSnap, "forumThreads", T1)?.title === `[G] Bài sạch ${RUN}` && rowOf(twSnap, "forumThreads", T1)?.authorAccountId === dv1.accountId && rowOf(twSnap, "forumThreads", T1).likedByAccountIds.length === 3);

/* =================================================================
 * 2) Điểm danh: bật/tắt từng hoạt động qua /api/diem-danh/mo-dong
 * ================================================================= */
const act = (id, org) => ({
  id, orgUnitId: org, title: `[G] HĐ điểm danh ${id}`, summary: "Hoạt động thử nhóm G",
  startDate: "2026-10-01", endDate: "2026-10-02", activityType: "GENERAL", status: "SUBMITTED",
  confirmStatus: "PENDING", imageSeed: 1, createdAt: now, links: [], categoryIds: [],
});
const A1 = act(ID(1), 131101); // t.donvi (Vinh → THPT Chuyên PBC)
const A2 = act(ID(2), 131103); // t.donvi2 (Diễn Châu → THPT Diễn Châu 1)
const A3 = act(ID(3), 131101); // t.donvi
const post = (a) => ({ activities: [a], activityCategories: [], activityLinks: [] });
expect("t.donvi tạo A1 (đơn vị mình)", await store(donvi, post(A1)), 200);
expect("t.donvi2 tạo A2 (đơn vị mình)", await store(donvi2, post(A2)), 200);
expect("t.donvi tạo A3 (đơn vị mình)", await store(donvi, post(A3)), 200);
created.activities.push(A1.id, A2.id, A3.id);

check("ban đầu cả 3 hoạt động chưa mở", !(await isOpen(guest, A1.id)) && !(await isOpen(guest, A2.id)) && !(await isOpen(guest, A3.id)));

/* ---- quyền + phạm vi ---- */
expect("khách bật điểm danh → 401", await toggle(guest, A1.id, true), 401);
expect("đoàn viên bật điểm danh → 403", await toggle(dv1, A1.id, true), 403);
expect("t.donvi bật điểm danh hoạt động đơn vị khác (A2) → 403", await toggle(donvi, A2.id, true), 403);
expect("t.donvi2 tắt điểm danh hoạt động đơn vị khác (A1) → 403", await toggle(donvi2, A1.id, false), 403);
expect("t.tinhkhac (tỉnh khác) bật A1 → 403", await toggle(tinhkhac, A1.id, true), 403);
expect("t.cap3 (cấp trên A1, không phải cấp trên A2) bật A2 → 403", await toggle(cap3, A2.id, true), 403);
check("các lần bị từ chối không làm mở hoạt động nào", !(await isOpen(guest, A1.id)) && !(await isOpen(guest, A2.id)));
expect("hoạt động không tồn tại → 404", await toggle(donvi, 2147483000, true), 404);
expect("thiếu cờ open → 400", await call(donvi, "/api/diem-danh/mo-dong", { activityId: A1.id }), 400);
expect("open không phải boolean → 400", await call(donvi, "/api/diem-danh/mo-dong", { activityId: A1.id, open: "true" }), 400);
expect("activityId sai → 400", await call(donvi, "/api/diem-danh/mo-dong", { activityId: "abc", open: true }), 400);

r = await toggle(donvi, A1.id, true);
check("t.donvi bật A1 → 200, open + changed", r.status === 200 && r.j?.open === true && r.j.changed === true && r.j.openIds.includes(A1.id), JSON.stringify(r.j));
check("dòng settings trả về đúng định dạng client", r.j?.setting?.settingKey === "attendance_open_ids" && r.j.setting.value.split(",").includes(String(A1.id)));
r = await toggle(donvi, A1.id, true);
check("bật lại A1 (đã mở) → 200, changed = false", r.status === 200 && r.j?.changed === false);
expect("t.cap3 (cấp trên) bật A1 → 200 (đã mở, không đổi)", await toggle(cap3, A1.id, true), 200);

/* ---- hai/ba bên cùng lúc, mỗi bên một hoạt động → không đè nhau ---- */
await toggle(donvi, A1.id, false);
let allOk = true;
let allOpen = true;
let allClosed = true;
for (let round = 0; round < 6; round++) {
  const opens = await Promise.all([toggle(donvi, A1.id, true), toggle(donvi2, A2.id, true), toggle(tinh, A3.id, true)]);
  allOk &&= opens.every((x) => x.status === 200);
  allOpen &&= (await Promise.all([A1, A2, A3].map((a) => isOpen(guest, a.id)))).every(Boolean);
  const closes = await Promise.all([toggle(donvi, A1.id, false), toggle(donvi2, A2.id, false), toggle(tinh, A3.id, false)]);
  allOk &&= closes.every((x) => x.status === 200);
  allClosed &&= (await Promise.all([A1, A2, A3].map((a) => isOpen(guest, a.id)))).every((o) => !o);
}
check("6 vòng: 3 bên (2 đơn vị + cấp tỉnh) bật 3 hoạt động cùng lúc → đều 200", allOk);
check("… cả 3 hoạt động đều mở sau mỗi lần bật đồng thời (không bên nào bị đè)", allOpen);
check("… tắt đồng thời cũng đủ 3, không để sót hoạt động nào", allClosed);

// Bật A1, A2 rồi tắt A1: A2 phải còn mở
await toggle(donvi, A1.id, true);
await toggle(donvi2, A2.id, true);
await toggle(donvi, A1.id, false);
check("tắt A1 không ảnh hưởng A2 đang mở", !(await isOpen(guest, A1.id)) && (await isOpen(guest, A2.id)));
expect("t.tinh bật A1 (hoạt động của đơn vị cấp dưới trong tỉnh) → 200", await toggle(tinh, A1.id, true), 200);
expect("t.tw bật hoạt động bất kỳ → 200", await toggle(tw, A3.id, true), 200);
check("A1, A2, A3 cùng mở", (await Promise.all([A1, A2, A3].map((a) => isOpen(guest, a.id)))).every(Boolean));

/* ---- /api/store không còn cho cán bộ ngoài TW ghi chuỗi attendance_open_ids ---- */
const openRow = (await snap(donvi)).settings.find((s) => s.settingKey === "attendance_open_ids");
check("cán bộ đọc được dòng attendance_open_ids", !!openRow);
expect("t.donvi ghi thẳng attendance_open_ids qua /api/store → 403", await store(donvi, { settings: [{ ...openRow, value: String(A1.id) }] }), 403);
expect("t.tinh ghi thẳng attendance_open_ids qua /api/store → 403", await store(tinh, { settings: [{ ...openRow, value: String(A1.id) }] }), 403);
check("… danh sách mở không bị đổi", (await Promise.all([A1, A2, A3].map((a) => isOpen(guest, a.id)))).every(Boolean));
// dọn: tắt hết
for (const [who, a] of [[donvi, A1], [donvi2, A2], [donvi, A3]]) await toggle(who, a.id, false);
check("tắt hết sau khi thử", (await Promise.all([A1, A2, A3].map((a) => isOpen(guest, a.id)))).every((o) => !o));

/* =================================================================
 * 3) created_by của dòng mới qua /api/store theo người tạo (derive nhận ngữ cảnh người ghi)
 *    tasks.created_by_org_unit_id không lộ trong snapshot → kiểm bằng hành vi: nhiệm vụ không thuộc bộ tiêu chí
 *    có "chủ" = đơn vị tạo; chỉ chủ (và cấp trên) mới thêm được chỉ tiêu.
 * ================================================================= */
const TK = {
  id: ID(11), criteriaSetId: null, parentTaskId: null, code: `G-${RUN}`, title: `[G] Nhiệm vụ của tỉnh ${RUN}`, description: "x",
  taskKind: "TASK", maxPoints: 5, requirement: "x", scoringMethod: "MANUAL_CONFIRM", dueDate: "2026-12-31", displayOrder: 1, status: "DRAFT",
};
const metric = (id, name) => ({ id, taskId: TK.id, code: `GM-${id}`, name, unitOfMeasure: "lượt", aggregationType: "SUM", maxPoints: 1 });
expect("t.tinh tạo nhiệm vụ mới (không thuộc bộ tiêu chí) → 200", await store(tinh, { tasks: [TK] }), 200);
created.tasks.push(TK.id);
expect("t.cap3 thêm chỉ tiêu vào nhiệm vụ của tỉnh → 403 (nhiệm vụ thuộc đơn vị khác)", await store(cap3, { taskMetrics: [metric(ID(21), "cấp 3 thêm")] }), 403);
expect("t.tinh thêm chỉ tiêu vào nhiệm vụ mình tạo → 200 (created_by_org_unit_id = đơn vị tỉnh, không phải TW)", await store(tinh, { taskMetrics: [metric(ID(22), "tỉnh thêm")] }), 200);
created.taskMetrics.push(ID(22));
// TW sửa nhiệm vụ: người tạo KHÔNG đổi sang TW
expect("t.tw sửa tiêu đề nhiệm vụ của tỉnh → 200", await store(tw, { tasks: [{ ...TK, title: TK.title + " (TW sửa)" }] }), 200);
expect("sau khi TW sửa, t.tinh vẫn là chủ nhiệm vụ (thêm chỉ tiêu được) → 200", await store(tinh, { taskMetrics: [metric(ID(23), "tỉnh thêm lần 2")] }), 200);
created.taskMetrics.push(ID(23));
expect("… và t.cap3 vẫn không phải chủ → 403", await store(cap3, { taskMetrics: [metric(ID(24), "cấp 3 thêm")] }), 403);

// reports + documents của tỉnh: created_by_account_id đúng người tạo (kiểm bằng SQL, xem cuối tệp)
const RP = { id: ID(31), orgUnitId: 131, title: `[G] Báo cáo ${RUN}`, reportType: "ANNUAL", periodYear: 2026, periodStart: "2026-01-01", periodEnd: "2026-12-31", content: "x", status: "DRAFT", createdAt: now };
const DC = { id: ID(41), docNumber: `G-${RUN}`, title: `[G] Văn bản ${RUN}`, summary: "x", documentCategoryId: 1, issuingOrgUnitId: 131, issuedDate: "2026-10-25", recipientScope: "SELECTED", status: "ISSUED", createdAt: now };
expect("t.tinh tạo báo cáo của tỉnh → 200", await store(tinh, { reports: [RP] }), 200);
expect("t.tinh ban hành văn bản của tỉnh → 200", await store(tinh, { documents: [DC] }), 200);
created.reports.push(RP.id);
created.documents.push(DC.id);
expect("t.tw sửa báo cáo + văn bản của tỉnh → 200 (người tạo giữ nguyên)", await store(tw, { reports: [{ ...RP, title: RP.title + " (TW sửa)" }], documents: [{ ...DC, title: DC.title + " (TW sửa)" }] }), 200);

console.log(`
   Kiểm created_by bằng SQL (psql-test.sh) — mong đợi: tasks 131, reports ${tinh.accountId}, documents ${tinh.accountId} (t.tinh), KHÔNG phải 1/TW:
     select created_by_org_unit_id from tasks where id = ${TK.id};
     select created_by_account_id, finalized_at from reports where id = ${RP.id};
     select created_by_account_id from documents where id = ${DC.id};
   Kiểm nhật ký: select action, entity_type, entity_id, account_id from audit_logs
     where action like 'FORUM_%' or action like 'ATTENDANCE_%' order by id desc limit 40;`);

/* ---------- Dọn dữ liệu thử (t.tw toàn quyền); KEEP_DATA=1 để giữ lại chạy các câu SQL ở trên ---------- */
if (!process.env.KEEP_DATA) {
  r = await store(tw, {}, {
    forumComments: created.comments, forumThreads: created.threads,
    taskMetrics: created.taskMetrics, tasks: created.tasks,
    reports: created.reports, documents: created.documents, activities: created.activities,
  });
  expect("t.tw dọn dữ liệu thử", r, 200);
}

for (const w of [tw, tinh, tinhkhac, cap3, donvi, donvi2, dv1, dv2, guest]) await w.ctx.dispose();
summary();
