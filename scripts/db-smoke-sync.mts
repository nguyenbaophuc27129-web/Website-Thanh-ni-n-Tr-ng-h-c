// Smoke test vòng đời sync DB — chạy SAU khi `npm start` (mặc định soi port 3110):
//   node scripts/db-smoke-sync.mts [port]
// Kiểm tra: đăng nhập demo, sync TOÀN BỘ 35 entity (đủ nhóm thi đua, văn bản,
// thông báo, tài nguyên…), roundtrip kiểu dữ liệu, ghi công khai của khách
// vãng lai, đăng ký đoàn viên, khoá tài khoản.
// Yêu cầu tunnel DB đang mở (ssh -N tnth-db) và DATABASE_URL trong .env.local.
import { activities } from "../src/data/activities.ts";
import { publishedPosts } from "../src/data/published-posts.ts";
import { feedbacks, feedbackMessages } from "../src/data/feedbacks.ts";
import { FORUM_THREADS, FORUM_COMMENTS } from "../src/data/forum.ts";
import { quizQuestions } from "../src/data/quiz-bank.ts";
import { quizExams } from "../src/data/quiz-exams.ts";
import { volunteerProjects } from "../src/data/volunteer-projects.ts";
import { criteriaSets, tasks, taskMetrics } from "../src/data/criteria-tasks.ts";
import { taskAssignments, assignmentTargets, taskResults, assignmentReviews } from "../src/data/task-assignments.ts";
import { documents, documentRecipients } from "../src/data/documents.ts";
import { notifications as seedNotifications } from "../src/data/notifications.ts";
import { reports } from "../src/data/reports.ts";
import { resources, systemSettings } from "../src/data/resources.ts";
import { liveEvents } from "../src/data/live-events.ts";
import { orgDirectories } from "../src/data/directory.ts";
import { hs3tProfiles, hs3tAchievements, hs3tUnitStandards } from "../src/data/hs3t.ts";

const BASE = `http://127.0.0.1:${process.argv[2] ?? "3110"}`;
const results: string[] = [];
const check = (name: string, ok: boolean, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);

// Seed điểm danh y hệt seedAttendances trong store-context
const attendances = [
  { id: 1, activityId: 101, memberName: "Nguyễn Thị Kim Ngân", memberClass: "12A1", orgUnitId: 31, checkedInAt: "2026-08-15T01:10:00Z" },
  { id: 2, activityId: 101, memberName: "Trần Hoàng Phú", memberClass: "11A3", orgUnitId: 31, checkedInAt: "2026-08-15T01:12:00Z" },
  { id: 3, activityId: 101, memberName: "Lê Thanh Trúc", memberClass: "10A2", orgUnitId: 31, checkedInAt: "2026-08-15T01:15:00Z" },
  { id: 4, activityId: 102, memberName: "Phạm Mỹ Duyên", memberClass: "12A5", orgUnitId: 31, checkedInAt: "2026-08-02T02:30:00Z" },
];

// 1) Đăng nhập tw.admin → cookie
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "tw.admin", password: "demo123" }),
});
const cookie = (loginRes.headers.getSetCookie() ?? [])[0]?.split(";")[0] ?? "";
const authHeaders = { "Content-Type": "application/json", Cookie: cookie };
check("login tw.admin", loginRes.ok && cookie.includes("tnth_session="), `status ${loginRes.status}`);

// 2) Sync TOÀN BỘ entity (đúng cấu trúc client gửi — 1 transaction như seed-push)
const entities: Record<string, unknown> = {
  activities,
  activityCategories: activities.flatMap((a) => a.categoryIds.map((categoryId) => ({ activityId: a.id, categoryId }))),
  activityLinks: activities.flatMap((a) => a.links),
  attendances,
  publishedPosts,
  feedbacks,
  feedbackMessages,
  forumThreads: FORUM_THREADS,
  forumComments: FORUM_COMMENTS,
  quizQuestions,
  quizExams,
  volunteerProjects,
  // Nhóm thi đua (nhắc việc + KPI công văn)
  criteriaSets,
  tasks,
  taskMetrics,
  taskAssignments,
  assignmentTargets,
  taskResults,
  assignmentReviews,
  scores: (await import("../src/data/scores.ts")).scores,
  // Văn bản + thông báo (nhắc văn bản mới)
  documents,
  documentRecipients,
  notifications: seedNotifications,
  reports,
  // Cộng đồng + tài nguyên + danh bạ + HS3T
  emailLogs: [],
  liveEvents,
  resources,
  settings: systemSettings,
  hs3tProfiles,
  hs3tAchievements,
  hs3tUnitStandards,
  orgDirectories,
  memberContributions: [],
  contributions: [],
};
const syncRes = await fetch(`${BASE}/api/store`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ entities }),
});
const syncJson = (await syncRes.json().catch(() => null)) as { ok?: boolean; counts?: Record<string, number>; error?: string } | null;
check("POST /api/store (sync toàn bộ 35 entity)", syncRes.ok && syncJson?.ok === true, syncJson?.error ?? JSON.stringify(syncJson?.counts ?? {}));

// 3) GET ngược — xác nhận roundtrip giữ đúng kiểu dữ liệu
const getRes = await fetch(`${BASE}/api/store`, { headers: { Cookie: cookie } });
const getJson = (await getRes.json().catch(() => null)) as {
  ok?: boolean; scope?: string;
  data?: Record<string, Array<Record<string, unknown>>>;
} | null;
const d = getJson?.data ?? {};
check("GET /api/store scope=full", getJson?.scope === "full", `scope ${getJson?.scope}`);
const linksDb = d.activityLinks ?? [];
const rebuiltLinks = linksDb.filter((l) => l.activityId === (d.activities?.[0]?.id));
check("activityLinks roundtrip (ghép lại như client)", linksDb.length === 7 && rebuiltLinks.length === (activities[0]?.links.length ?? -1),
  `tổng=${linksDb.length} của activity đầu=${rebuiltLinks.length}`);
const fbDb = d.feedbacks ?? [];
check("feedbacks roundtrip", fbDb.length >= feedbacks.length, `${fbDb.length}/${feedbacks.length}`);
const ftDb = d.forumThreads ?? [];
const likes = ftDb[0]?.likedByAccountIds as unknown[] | undefined;
check("forum likedByAccountIds là number[]", Array.isArray(likes) && likes.every((x) => typeof x === "number"), JSON.stringify(likes));
const qeDb = d.quizExams ?? [];
const qids = qeDb[0]?.questionIds as unknown[] | undefined;
check("quizExams questionIds là number[]", Array.isArray(qids) && qids.every((x) => typeof x === "number"));
const vpDb = d.volunteerProjects ?? [];
check("volunteerProjects roundtrip", vpDb.length === volunteerProjects.length, `${vpDb.length}/${volunteerProjects.length}`);
check("quizAttempts trống đọc về ổn", Array.isArray(d.quizAttempts) && d.quizAttempts.length === 0);

// 3b) Kiểm nhóm thi đua + văn bản + thông báo + tài nguyên (Giai đoạn 01)
const csDb = d.criteriaSets ?? [];
check("criteriaSets roundtrip (BTS 2026/2025/2027)", csDb.length >= criteriaSets.length, `${csDb.length}/${criteriaSets.length}`);
const tDb = d.tasks ?? [];
check("tasks roundtrip (nhóm I/II/III + BTS 2027)", tDb.length >= tasks.length, `${tDb.length}/${tasks.length}`);
const tmDb = d.taskMetrics ?? [];
check("taskMetrics roundtrip", tmDb.length >= taskMetrics.length, `${tmDb.length}/${taskMetrics.length}`);
const scDb = d.scores ?? [];
const scPoints = scDb[0]?.points;
check("scores roundtrip + points là number", scDb.length >= 54 && typeof scPoints === "number", `${scDb.length} dòng, points=${scPoints}`);
const docDb = d.documents ?? [];
check("documents roundtrip (công văn chỉ đạo)", docDb.length >= documents.length, `${docDb.length}/${documents.length}`);
const drDb = d.documentRecipients ?? [];
check("documentRecipients roundtrip (đã đọc)", drDb.length >= documentRecipients.length, `${drDb.length}/${documentRecipients.length}`);
const ntDb = d.notifications ?? [];
check("notifications roundtrip (nhắc việc/văn bản mới)", ntDb.length >= seedNotifications.length, `${ntDb.length}/${seedNotifications.length}`);
const rpDb = d.reports ?? [];
const rpPeriod = rpDb[0]?.periodStart;
check("reports roundtrip + periodStart giữ kiểu date", rpDb.length >= reports.length && rpPeriod === reports[0]?.periodStart, `${rpDb.length}/${reports.length} periodStart=${rpPeriod}`);
const rsDb = d.resources ?? [];
check("resources roundtrip", rsDb.length >= resources.length, `${rsDb.length}/${resources.length}`);
check("systemSettings roundtrip", (d.settings ?? []).length >= systemSettings.length, `${(d.settings ?? []).length}/${systemSettings.length}`);
const hpDb = d.hs3tProfiles ?? [];
const haDb = d.hs3tAchievements ?? [];
check("hs3t roundtrip (profiles/achievements/standards)", hpDb.length === hs3tProfiles.length && haDb.length >= hs3tAchievements.length && (d.hs3tUnitStandards ?? []).length === hs3tUnitStandards.length,
  `${hpDb.length}/${haDb.length}/${(d.hs3tUnitStandards ?? []).length}`);
check("orgDirectories roundtrip", (d.orgDirectories ?? []).length >= orgDirectories.length, `${(d.orgDirectories ?? []).length}/${orgDirectories.length}`);
check("emailLogs/memberContributions/contributions trống đọc về ổn",
  d.emailLogs?.length === 0 && d.memberContributions?.length === 0 && d.contributions?.length === 0,
  `${d.emailLogs?.length}/${d.memberContributions?.length}/${d.contributions?.length}`);

// 4) Khách vãng lai ghi phản ánh (nhóm public)
const anonFeedback = [
  { id: 990001, trackingCode: "PA-2026-TEST1", senderName: "Khách test", senderEmail: "khach@test.vn", senderPhone: null,
    senderOrgText: null, senderAccountId: null, senderCommuneUnion: null, senderProvinceUnion: null,
    feedbackTopicId: 4, title: "Test phản ánh ẩn danh", content: "Nội dung test từ script.", evidenceNames: [],
    status: "NEW", assignedAccountId: null, submittedAt: new Date().toISOString() },
  { id: 990002, feedbackId: 990001, senderType: "CITIZEN", senderName: "Khách test", senderAccountId: null,
    content: "Nội dung test từ script.", isInternalNote: false, sentAt: new Date().toISOString() },
];
const anonRes = await fetch(`${BASE}/api/store`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ entities: { feedbacks: [anonFeedback[0], ...feedbacks], feedbackMessages: [anonFeedback[1], ...feedbackMessages] } }),
});
const anonJson = (await anonRes.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
check("POST /api/store KHÔNG đăng nhập (phản ánh)", anonRes.ok && anonJson?.ok === true, anonJson?.error ?? `status ${anonRes.status}`);

// 5) Anonymous bị chặn entity không public
const denyRes = await fetch(`${BASE}/api/store`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ entities: { notifications: [] } }),
});
check("Anonymous bị chặn ghi notifications (401)", denyRes.status === 401, `status ${denyRes.status}`);

// 6) Đăng ký đoàn viên mới + login + khoá tài khoản
const uname = `sv.test${Date.now() % 100000}`;
const regRes = await fetch(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: uname, password: "test123", email: `${uname}@test.vn`, fullName: "Sinh viên Test", position: "Đoàn viên", className: "12A1", orgUnitId: 31 }),
});
const regJson = (await regRes.json().catch(() => null)) as { ok?: boolean; accountId?: number; error?: string } | null;
check("POST /api/auth/register", regRes.ok && regJson?.ok === true, regJson?.error ?? `accountId=${regJson?.accountId}`);

const login2Res = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: uname, password: "test123" }),
});
const login2Json = (await login2Res.json().catch(() => null)) as { ok?: boolean; session?: { role?: string; orgUnitId?: number } } | null;
check("Login tài khoản vừa đăng ký", login2Res.ok && login2Json?.ok === true && login2Json.session?.role === "DOAN_VIEN",
  `role=${login2Json?.session?.role} org=${login2Json?.session?.orgUnitId}`);

if (regJson?.accountId) {
  const patchRes = await fetch(`${BASE}/api/accounts/${regJson.accountId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "LOCKED" }),
  });
  const patchJson = (await patchRes.json().catch(() => null)) as { ok?: boolean } | null;
  check("PATCH /api/accounts/[id] LOCKED", patchRes.ok && patchJson?.ok === true, `status ${patchRes.status}`);
  const login3Res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: uname, password: "test123" }),
  });
  check("Tài khoản LOCKED không đăng nhập được", login3Res.status === 403, `status ${login3Res.status}`);
}

console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
