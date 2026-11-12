// Nhóm D — so snapshot GET /api/store theo người xem (chạy: BASE=... BASE_BEFORE=... node d-snapshot.mjs)
import { readFileSync } from "node:fs";
import { check, summary } from "./lib.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3104";
const BEFORE = process.env.BASE_BEFORE ?? "";
const PW = readFileSync("/staging/test-password.txt", "utf8").trim();
const USERS = [null, "t.dv1", "t.dv2", "t.donvi", "t.cap3", "t.tinh", "t.tinhkhac", "t.btv", "t.tw"];

async function snapshot(base, username) {
  const headers = {};
  if (username) {
    const r = await fetch(`${base}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password: PW }),
    });
    if (!r.ok) throw new Error(`login ${username} ${r.status}`);
    const cookie = (r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie")]).map((c) => c.split(";")[0]).join("; ");
    headers.cookie = cookie;
  }
  const r = await fetch(`${base}/api/store`, { headers });
  const text = await r.text();
  return { status: r.status, size: text.length, json: JSON.parse(text), text };
}

const D = (n) => 973000 + n;
const ids = (rows) => new Set((rows ?? []).map((r) => r.id));
const has = (s, ent, n) => ids(s.data[ent]).has(D(n));
const row = (s, ent, n) => (s.data[ent] ?? []).find((r) => r.id === D(n));
const absentOrEmptyOfD = (s, ent) => !(s.data[ent] ?? []).some((r) => r.id >= 973000 && r.id < 974000);
const noKey = (s, ent, keys) => (s.data[ent] ?? []).every((r) => keys.every((k) => !(k in r)));

const snaps = {};
for (const u of USERS) snaps[u ?? "khach"] = await snapshot(BASE, u);
const sizes = {};
for (const u of USERS) {
  const k = u ?? "khach";
  sizes[k] = { after: snaps[k].size, before: BEFORE ? (await snapshot(BEFORE, u)).size : null };
}

for (const [k, s] of Object.entries(snaps)) check(`${k}: GET /api/store 200 + ok`, s.status === 200 && s.json.ok === true, `scope=${s.json.scope}`);

/* ---------- Khách ---------- */
{
  const s = snaps.khach.json;
  check("khách: scope public", s.scope === "public");
  const INTERNAL = ["taskAssignments", "assignmentTargets", "taskResults", "assignmentReviews", "scores", "criteriaSets", "tasks",
    "taskMetrics", "documentRecipients", "orgDirectories", "liveEvents", "notifications", "feedbacks", "feedbackMessages", "emailLogs",
    "hs3tProfiles", "hs3tAchievements", "quizAttempts", "attendances", "reports", "memberContributions", "contributions"];
  check("khách: không có entity nội bộ", INTERNAL.every((e) => !(e in s.data)), INTERNAL.filter((e) => e in s.data).join(","));
  check("khách: quizQuestions không có correctIndexes/correctText", noKey(s, "quizQuestions", ["correctIndexes", "correctText"]));
  check("khách: chỉ câu hỏi của đề đang mở", has(s, "quizQuestions", 1) && has(s, "quizQuestions", 2) && !has(s, "quizQuestions", 3));
  check("khách: chỉ đề OPEN", (s.data.quizExams ?? []).every((e) => e.status === "OPEN") && has(s, "quizExams", 1) && !has(s, "quizExams", 3));
  check("khách: quizExams không có createdByAccountId", noKey(s, "quizExams", ["createdByAccountId"]));
  check("khách: diễn đàn chỉ bài PUBLISHED", (s.data.forumThreads ?? []).every((t) => t.status === "PUBLISHED") && !has(s, "forumThreads", 2));
  check("khách: không có authorAccountId của ai", (s.data.forumThreads ?? []).concat(s.data.forumComments ?? []).every((t) => t.authorAccountId === null));
  const t1 = row(s, "forumThreads", 1);
  check("khách: likedByAccountIds rỗng + likeCount", t1 && t1.likedByAccountIds.length === 0 && t1.likeCount === 3, JSON.stringify(t1 && { l: t1.likedByAccountIds, c: t1.likeCount }));
  check("khách: bỏ aiReason/aiModel/moderatedByAccountId", noKey(s, "forumThreads", ["aiReason", "aiModel", "moderatedByAccountId"]) && noKey(s, "forumComments", ["aiReason", "aiModel", "moderatedByAccountId"]));
  check("khách: bình luận chỉ PUBLISHED", has(s, "forumComments", 1) && !has(s, "forumComments", 2) && !has(s, "forumComments", 3));
  check("khách: bài viết chỉ PUBLISHED, không internalNotes", has(s, "publishedPosts", 1) && !has(s, "publishedPosts", 2) && noKey(s, "publishedPosts", ["internalNotes", "editorAccountId"]));
  check("khách: văn bản chỉ ISSUED", has(s, "documents", 1) && !has(s, "documents", 2) && (s.data.documents ?? []).every((d) => d.status === "ISSUED"));
  check("khách: tài nguyên chỉ PUBLISHED + công khai", has(s, "resources", 1) && !has(s, "resources", 2) && !has(s, "resources", 3));
  const p1 = row(s, "volunteerProjects", 1);
  check("khách: dự án APPROVED, bỏ người gửi/kiểm duyệt", p1 && !("submittedByAccountId" in p1) && !("aiReason" in p1) && !has(s, "volunteerProjects", 2));
  check("khách: settings chỉ nhóm Công khai + attendance_open_ids", (s.data.settings ?? []).every((x) => x.groupName === "Công khai" || x.settingKey === "attendance_open_ids") && (s.data.settings ?? []).some((x) => x.settingKey === "attendance_open_ids"));
  check("khách: hoạt động chỉ loại đang mở điểm danh, bỏ reviewNote", has(s, "activities", 1) && !has(s, "activities", 2) && !has(s, "activities", 3) && noKey(s, "activities", ["reviewNote"]));
  check("khách: BXH chỉ kỳ đã chốt", has(s, "rankingSnapshots", 1) && !has(s, "rankingSnapshots", 2) && has(s, "rankingEntries", 1) && !has(s, "rankingEntries", 3));
  const txt = snaps.khach.text;
  check("khách: không lộ email/đáp án/ghi chú nội bộ/tên HS3T", !["dv1-secret@example.com", "D-DAP-AN", "D-INTERNAL-NOTE", "D-GHI-CHU-NOI-BO", "[D] HS Nguyễn Một", "D-REVIEW-NOTE", "D-AI-"].some((x) => txt.includes(x)));
}

/* ---------- Đoàn viên ---------- */
{
  const s = snaps["t.dv1"].json;
  check("dv1: scope member", s.scope === "member");
  check("dv1: chỉ thông báo của mình", (s.data.notifications ?? []).every((n) => n.recipientAccountId === 927) && has(s, "notifications", 1));
  check("dv1: chỉ hồ sơ HS3T của mình", (s.data.hs3tProfiles ?? []).every((p) => p.accountId === 927) && has(s, "hs3tProfiles", 1) && has(s, "hs3tAchievements", 1) && !has(s, "hs3tAchievements", 2));
  check("dv1: chỉ lượt thi của mình", (s.data.quizAttempts ?? []).every((a) => a.accountId === 927) && has(s, "quizAttempts", 1));
  check("dv1: không có đáp án", noKey(s, "quizQuestions", ["correctIndexes", "correctText"]));
  const t1 = row(s, "forumThreads", 1), t2 = row(s, "forumThreads", 2);
  check("dv1: bài của mình giữ authorAccountId + likedBy=[mình]", t1?.authorAccountId === 927 && JSON.stringify(t1?.likedByAccountIds) === "[927]" && t1?.likeCount === 3);
  check("dv1: thấy bài ẩn của mình (chờ duyệt) + aiReason", t2?.authorAccountId === 927 && t2?.aiReason === "D-AI-FLAG");
  check("dv1: không thấy bài ẩn của dv2", !has(s, "forumThreads", 3));
  const c1 = row(s, "forumComments", 1);
  check("dv1: BL người khác authorAccountId null, likedBy=[mình]", c1?.authorAccountId === null && JSON.stringify(c1?.likedByAccountIds) === "[927]");
  check("dv1: BL chờ duyệt của mình có, của dv2 không", has(s, "forumComments", 2) && !has(s, "forumComments", 3));
  check("dv1: phản ánh của mình, không ghi chú nội bộ", has(s, "feedbacks", 1) && !has(s, "feedbacks", 2) && has(s, "feedbackMessages", 3) && !has(s, "feedbackMessages", 2));
  check("dv1: email phản ánh của mình", has(s, "emailLogs", 1) && !has(s, "emailLogs", 2));
  check("dv1: tài nguyên nháp mình gửi", has(s, "resources", 2) && !has(s, "resources", 3));
  check("dv1: dự án của mình giữ submittedBy", row(s, "volunteerProjects", 1)?.submittedByAccountId === 927 && !has(s, "volunteerProjects", 2));
  check("dv1: đóng góp + điểm của mình", has(s, "memberContributions", 1) && !has(s, "memberContributions", 2) && has(s, "contributions", 1) && !has(s, "contributions", 2));
  check("dv1: không có phân công/điểm/BXH nháp", !("taskAssignments" in s.data) && !("scores" in s.data) && !has(s, "rankingSnapshots", 2));
}
{
  const s = snaps["t.dv2"].json, txt = snaps["t.dv2"].text;
  check("dv2: không thấy thông báo dv1", !has(s, "notifications", 1) && has(s, "notifications", 2));
  check("dv2: không thấy HS3T dv1", !has(s, "hs3tProfiles", 1) && !txt.includes("[D] HS Nguyễn Một") && has(s, "hs3tProfiles", 2));
  check("dv2: không thấy lượt thi/đóng góp/phản ánh dv1", !has(s, "quizAttempts", 1) && has(s, "quizAttempts", 2) && !has(s, "memberContributions", 1) && !has(s, "feedbacks", 1));
  check("dv2: đề đã đóng mình từng thi vẫn có", has(s, "quizExams", 3));
  check("dv2: dự án chờ duyệt của mình có", has(s, "volunteerProjects", 2));
  check("dv2: bài ẩn của mình có, của dv1 không", has(s, "forumThreads", 3) && !has(s, "forumThreads", 2));
  check("dv2: bài dv1 authorAccountId null", row(s, "forumThreads", 1)?.authorAccountId === null);
  check("dv2: không lộ email dv1", !txt.includes("dv1-secret@example.com"));
}

/* ---------- Cán bộ ---------- */
{
  const s = snaps["t.donvi"].json, txt = snaps["t.donvi"].text;
  check("donvi: scope full", s.scope === "full");
  check("donvi: thông báo chỉ của mình", (s.data.notifications ?? []).every((n) => n.recipientAccountId === 924) && has(s, "notifications", 4));
  check("donvi: phân công của mình + phân công cha, không TQ", has(s, "taskAssignments", 3) && has(s, "taskAssignments", 2) && !has(s, "taskAssignments", 1) && !has(s, "taskAssignments", 4));
  check("donvi: kết quả/chỉ tiêu theo phân công", has(s, "taskResults", 3) && !has(s, "taskResults", 4) && has(s, "assignmentTargets", 3) && !has(s, "assignmentTargets", 4));
  check("donvi: hoạt động trong cây", has(s, "activities", 1) && !has(s, "activities", 2) && !has(s, "activities", 3));
  check("donvi: HS3T trường mình", has(s, "hs3tProfiles", 1) && has(s, "hs3tProfiles", 2) && !has(s, "hs3tProfiles", 3));
  check("donvi: Trực tiếp/danh bạ/báo cáo trong cây", has(s, "liveEvents", 1) && !has(s, "liveEvents", 2) && has(s, "orgDirectories", 1) && !has(s, "orgDirectories", 2) && has(s, "reports", 1) && !has(s, "reports", 2));
  check("donvi: không có phản ánh (không quyền feedback)", absentOrEmptyOfD(s, "feedbacks") && !txt.includes("tq-secret@example.com"));
  check("donvi: văn bản ISSUED + nhận, không nháp tỉnh", has(s, "documents", 1) && !has(s, "documents", 2));
  check("donvi: bảng tham chiếu còn (tiêu chí/nhiệm vụ/đề thi)", (s.data.criteriaSets ?? []).length > 0 && (s.data.tasks ?? []).length > 0 && has(s, "quizExams", 2));
  check("donvi: BXH đã chốt có, nháp TW không", has(s, "rankingSnapshots", 1) && !has(s, "rankingSnapshots", 2));
}
{
  const s = snaps["t.cap3"].json;
  check("cap3: phản ánh của người gửi thuộc cây (dv1)", has(s, "feedbacks", 1) && !has(s, "feedbacks", 2));
  check("cap3: phân công Vinh + PBC + cha NA, không TQ", has(s, "taskAssignments", 2) && has(s, "taskAssignments", 3) && has(s, "taskAssignments", 1) && !has(s, "taskAssignments", 4));
}
{
  const s = snaps["t.tinh"].json;
  check("tinh: phản ánh Nghệ An (theo người gửi + ô tỉnh không dấu)", has(s, "feedbacks", 1) && has(s, "feedbacks", 3) && !has(s, "feedbacks", 2));
  check("tinh: tin nhắn/email theo phản ánh trong phạm vi", has(s, "feedbackMessages", 2) && !has(s, "feedbackMessages", 4) && has(s, "emailLogs", 1) && !has(s, "emailLogs", 2));
  check("tinh: thông báo chỉ của mình", (s.data.notifications ?? []).every((n) => n.recipientAccountId === 921) && has(s, "notifications", 3));
  check("tinh: phân công/điểm trong cây", has(s, "taskAssignments", 1) && has(s, "taskAssignments", 3) && !has(s, "taskAssignments", 4) && has(s, "scores", 1) && !has(s, "scores", 2));
  check("tinh: HS3T toàn tỉnh", has(s, "hs3tProfiles", 1) && has(s, "hs3tProfiles", 3));
  check("tinh: văn bản nháp của tỉnh", has(s, "documents", 2));
  check("tinh: hoạt động trong cây", has(s, "activities", 1) && has(s, "activities", 3) && !has(s, "activities", 2));
}
{
  const s = snaps["t.tinhkhac"].json, txt = snaps["t.tinhkhac"].text;
  check("tinhkhac: không thấy phản ánh Nghệ An", !has(s, "feedbacks", 1) && !has(s, "feedbacks", 3) && has(s, "feedbacks", 2) && !txt.includes("dv1-secret@example.com") && !txt.includes("na-secret@example.com"));
  check("tinhkhac: phân công/HS3T/hoạt động chỉ Tuyên Quang", has(s, "taskAssignments", 4) && !has(s, "taskAssignments", 1) && !has(s, "hs3tProfiles", 1) && has(s, "activities", 2) && !has(s, "activities", 3));
  check("tinhkhac: không thấy thông báo người khác", (s.data.notifications ?? []).every((n) => n.recipientAccountId === 922));
}
{
  const s = snaps["t.btv"].json;
  check("btv: thấy bài nháp (post.manage)", has(s, "publishedPosts", 2));
  check("btv: không có phản ánh (không quyền)", absentOrEmptyOfD(s, "feedbacks"));
  check("btv: thông báo chỉ của mình", (s.data.notifications ?? []).every((n) => n.recipientAccountId === 926));
}
{
  const s = snaps["t.tw"].json;
  const all = (ent, ns) => ns.every((n) => has(s, ent, n));
  check("tw: thấy đủ phản ánh/thông báo/HS3T/phân công", all("feedbacks", [1, 2, 3]) && all("notifications", [1, 2, 3, 4, 5]) && all("hs3tProfiles", [1, 2, 3]) && all("taskAssignments", [1, 2, 3, 4]));
  check("tw: đáp án + authorAccountId nguyên vẹn", row(s, "quizQuestions", 1)?.correctText === "D-DAP-AN-1" && row(s, "forumThreads", 1)?.authorAccountId === 927 && row(s, "forumThreads", 1)?.likedByAccountIds.length === 3);
  check("tw: bài ẩn + BXH nháp + live + danh bạ", all("forumThreads", [1, 2, 3]) && has(s, "rankingSnapshots", 2) && all("liveEvents", [1, 2]) && all("orgDirectories", [1, 2]));
}

console.log("\nKích thước snapshot (byte JSON):");
console.log("vai trò".padEnd(12), "trước".padStart(10), "sau".padStart(10));
for (const [k, v] of Object.entries(sizes)) console.log(k.padEnd(12), String(v.before ?? "-").padStart(10), String(v.after).padStart(10));
summary();
