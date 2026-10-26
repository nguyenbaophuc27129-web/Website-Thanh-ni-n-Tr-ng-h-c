// Kiểm thử bảo mật tổng hợp sau khi gộp các nhóm — chạy trên web thử (BASE), DB tnth_test.
import { request } from "playwright";
import { readFileSync } from "node:fs";
import { check, summary } from "./lib.mjs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const PW = readFileSync("/staging/test-password.txt", "utf8").trim();
const as = async (u) => {
  const ctx = await request.newContext({ baseURL: BASE });
  if (u) { const r = await ctx.post("/api/auth/login", { data: { username: u, password: PW } }); if (!r.ok()) throw new Error("login " + u); }
  return ctx;
};
const snap = async (ctx) => (await (await ctx.get("/api/store")).json()).data ?? {};
const post = (ctx, entities, deletes) => ctx.post("/api/store", { data: { entities, deletes } });

const guest = await as(null), dv1 = await as("t.dv1"), dv2 = await as("t.dv2");
const donvi = await as("t.donvi"), cap3 = await as("t.cap3"), tinh = await as("t.tinh"), tinhkhac = await as("t.tinhkhac"), btv = await as("t.btv"), tw = await as("t.tw");
const twSnap = await snap(tw);

// ---------- B/C: khách & đoàn viên không ghi qua sync ----------
check("khách POST /api/store bị chặn", !(await post(guest, { feedbacks: [{ id: 1, title: "x" }] })).ok());
check("đoàn viên POST /api/store bị chặn", !(await post(dv1, { forumThreads: [{ id: 1, title: "x" }] })).ok());

// ---------- D: chặn tự chấm điểm, chặn ngoài phạm vi ----------
const cs = twSnap.criteriaSets?.[0], task = twSnap.tasks?.[0];
if (cs && task) {
  const score = (org) => ({ id: Date.now() * 1000 + Math.floor(Math.random() * 999), criteriaSetId: cs.id, taskId: task.id, orgUnitId: org, points: 1, maxPoints: 5, scoringMethod: "MANUAL_CONFIRM", note: "smoke" });
  check("DON_VI tự chấm đơn vị mình → chặn", (await post(donvi, { scores: [score(131101)] })).status() === 403);
  const rc = await post(cap3, { scores: [{ ...score(131101), scoredByAccountId: 923 }] });
  check("cấp 3 chấm cấp dưới → được", rc.ok(), rc.ok() ? "" : (await rc.text()).slice(0, 200));
  check("tỉnh khác chấm Nghệ An → chặn", (await post(tinhkhac, { scores: [score(131101)] })).status() === 403);
} else check("có bộ tiêu chí để thử chấm điểm", false, "tnth_test thiếu criteriaSets/tasks");
const setting = twSnap.settings?.find((s) => s.settingKey === "site.name");
check("DON_VI sửa cấu hình → chặn", (await post(donvi, { settings: [{ ...setting, value: "hack" }] })).status() === 403);
const twPost = twSnap.publishedPosts?.[0];
if (twPost) check("DON_VI xoá bài → chặn", (await post(donvi, {}, { publishedPosts: [twPost.id] })).status() === 403);

// ---------- F: thi ----------
const gs = await snap(guest), ms = await snap(dv1);
const leak = (rows) => (rows ?? []).some((q) => q.correctIndexes?.length || q.correctText);
check("khách không có đáp án", !leak(gs.quizQuestions));
check("đoàn viên không có đáp án", !leak(ms.quizQuestions));

// ---------- G: diễn đàn ẩn danh ----------
const othersAuthor = (rows, me) => (rows ?? []).some((t) => t.authorAccountId != null && t.authorAccountId !== me);
check("khách không thấy ID người viết", !othersAuthor(gs.forumThreads, -1) && !othersAuthor(gs.forumComments, -1));
check("khách chỉ thấy bài đã đăng", (gs.forumThreads ?? []).every((t) => t.status === "PUBLISHED"));
const likeLeak = (rows, me) => (rows ?? []).some((t) => (t.likedByAccountIds ?? []).some((id) => id !== me));
check("không lộ danh sách người thích", !likeLeak(gs.forumThreads, -1) && !likeLeak(ms.forumThreads, 927));

// ---------- H: đoàn viên chỉ thấy của mình ----------
const ms2 = await snap(dv2);
const onlyMine = (rows, field, me) => (rows ?? []).every((r) => r[field] === me);
check("thông báo chỉ của mình", onlyMine(ms2.notifications, "recipientAccountId", 928));
check("HS3T chỉ hồ sơ mình", onlyMine(ms2.hs3tProfiles, "accountId", 928));
check("lượt thi chỉ của mình", onlyMine(ms2.quizAttempts, "accountId", 928));
check("điểm đóng góp chỉ của mình", onlyMine(ms2.contributions, "accountId", 928));

// ---------- I: khách không thấy dữ liệu nội bộ ----------
for (const e of ["taskAssignments", "taskResults", "assignmentReviews", "scores", "documentRecipients", "liveEvents", "feedbacks", "notifications", "emailLogs"]) {
  check(`khách không nhận ${e}`, !(gs[e]?.length));
}
check("khách chỉ thấy tài nguyên công khai", (gs.resources ?? []).every((r) => r.status === "PUBLISHED" && r.isPublic));
check("khách chỉ thấy văn bản đã ban hành", (gs.documents ?? []).every((d) => d.status === "ISSUED"));
check("khách chỉ thấy dự án đã duyệt", (gs.volunteerProjects ?? []).every((p) => p.status === "APPROVED"));
check("khách không thấy bài nháp", (gs.publishedPosts ?? []).every((p) => p.status === "PUBLISHED" && !("internalNotes" in p && p.internalNotes)));

// ---------- J: cán bộ chỉ thấy phản ánh/thông báo trong phạm vi ----------
const ks = await snap(tinhkhac);
check("cán bộ chỉ thấy thông báo của mình", onlyMine(ks.notifications, "recipientAccountId", 922));
check("TW thấy đầy đủ phản ánh", (twSnap.feedbacks ?? []).length >= (ks.feedbacks ?? []).length);

// ---------- K: tra cứu phản ánh ----------
check("mã phản ánh kiểu cũ không tra cứu được khi chưa đăng nhập", !(await guest.get("/api/phan-anh/PA-2026-00101")).ok());

// ---------- L: proxy & AI ----------
check("khách gọi fetch-article → 401", (await guest.post("/api/fetch-article", { data: { url: "https://example.com" } })).status() === 401);
check("đoàn viên gọi fetch-article → 403", (await dv1.post("/api/fetch-article", { data: { url: "https://example.com" } })).status() === 403);
check("khách gọi phân tích công văn → bị chặn", [401, 403].includes((await guest.post("/api/ai/phan-tich-cong-van", { data: { text: "x".repeat(50) } })).status()));
summary();
