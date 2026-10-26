import { query } from "../db.ts";
import type { SessionDto } from "./auth.ts";
import { effectivePermissions, hasPerm } from "../permissions.ts";
import { maskForumRow } from "./forum-view.ts";
import {
  ENTITY_ORDER,
  ENTITY_SPECS,
  MEMBER_READ_ENTITIES,
  PUBLIC_READ_ENTITIES,
  readEntity,
} from "./store-tables.ts";

/**
 * CHÍNH SÁCH ĐỌC snapshot GET /api/store — lọc dòng + che cột theo người xem.
 *
 * 3 phạm vi:
 *  - public  (khách): chỉ dữ liệu công khai đã duyệt.
 *  - member  (DOAN_VIEN): như khách + dữ liệu CỦA CHÍNH MÌNH.
 *  - full    (cán bộ): QUAN_TRI_TW xem toàn bộ; vai trò khác chỉ thấy dữ liệu nội bộ
 *            trong cây đơn vị của mình (đơn vị mình + mọi đơn vị con), dữ liệu tham
 *            chiếu chung (bộ tiêu chí, nhiệm vụ, đề thi, BXH đã chốt…) giữ nguyên.
 *
 * Mỗi entity có 1 luật: `null` = không trả; `where` = điều kiện SQL cho readEntity
 * (biến dạng {me} {tree} {open} {prov} — chỉ biến nào dùng mới được bind tham số);
 * `mask` = che/bỏ field trên từng dòng sau khi đọc.
 *
 * LƯU Ý cho cán bộ (scope full): chỉ lọc DÒNG, không che cột — client cán bộ vẫn ghi qua
 * POST /api/store bằng cả dòng, field bị che (null) sẽ bị UPSERT đè mất dữ liệu.
 * NGOẠI LỆ duy nhất là diễn đàn (che authorAccountId/likedByAccountIds với cán bộ ngoài TW):
 * diễn đàn không ghi qua /api/store (API_ONLY_ENTITIES), cán bộ duyệt bài qua
 * POST /api/dien-dan/kiem-duyet nên che cột không làm mất dữ liệu.
 */

export type ReadScope = "public" | "member" | "full";

export interface ReadViewer {
  scope: ReadScope;
  accountId: number | null;
  role: SessionDto["role"] | null;
  orgUnitId: number | null;
  /** QUAN_TRI_TW — xem toàn bộ, không lọc */
  isTW: boolean;
  perms: string[];
  /** Cây đơn vị của người xem (đơn vị mình + mọi đơn vị con) */
  tree: number[];
  /** Tên tỉnh rút gọn (vd. "Nghệ An") — chỉ có khi đơn vị người xem là cấp 2 */
  provinceKey: string;
  /** Hoạt động đang mở điểm danh (settings attendance_open_ids) */
  openActivityIds: number[];
}

interface EntityRule {
  where?: string;
  mask?: (row: Record<string, unknown>, v: ReadViewer) => void;
}
type RuleFn = (v: ReadViewer) => EntityRule | null;

/* ---------------- Dựng ngữ cảnh người xem ---------------- */

async function loadOpenActivityIds(): Promise<number[]> {
  const rows = await query<{ value: string | null }>(
    "SELECT value FROM system_settings WHERE setting_key = 'attendance_open_ids'",
  );
  return String(rows[0]?.value ?? "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** "Đoàn TNCS Hồ Chí Minh Tỉnh Nghệ An" → "Nghệ An" (khớp ô "Đoàn tỉnh/thành" người gửi tự gõ) */
export function provinceKeyOf(name: string): string {
  return name
    .replace(/^Đoàn TNCS Hồ Chí Minh\s+/i, "")
    .replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, "")
    .trim();
}

export async function buildReadViewer(session: SessionDto | null): Promise<ReadViewer> {
  const openActivityIds = await loadOpenActivityIds();
  if (!session) {
    return {
      scope: "public", accountId: null, role: null, orgUnitId: null, isTW: false,
      perms: [], tree: [], provinceKey: "", openActivityIds,
    };
  }
  const scope: ReadScope = session.role === "DOAN_VIEN" ? "member" : "full";
  const isTW = session.role === "QUAN_TRI_TW";
  let tree: number[] = [];
  let provinceKey = "";
  if (scope === "full" && !isTW) {
    const rows = await query<{ id: string; org_level: number; name: string; is_self: boolean }>(
      `SELECT o.id, o.org_level, o.name, o.id = me.id AS is_self
         FROM org_units o, (SELECT id, path FROM org_units WHERE id = $1) me
        WHERE o.path LIKE me.path || '%'`,
      [session.orgUnitId],
    );
    tree = rows.map((r) => Number(r.id));
    const self = rows.find((r) => r.is_self);
    if (self && Number(self.org_level) === 2) {
      const key = provinceKeyOf(self.name);
      provinceKey = key.length >= 3 ? key : "";
    }
    if (!tree.includes(session.orgUnitId)) tree.push(session.orgUnitId);
  }
  return {
    scope,
    accountId: session.accountId,
    role: session.role,
    orgUnitId: session.orgUnitId,
    isTW,
    perms: effectivePermissions(session),
    tree,
    provinceKey,
    openActivityIds,
  };
}

const hasAny = (v: ReadViewer, codes: string[]) => codes.some((c) => hasPerm(v.perms, c));

/* ---------------- Mảnh SQL dùng lại ---------------- */

/** Tài khoản thuộc cây đơn vị người xem */
const ACC_IN_TREE = "(SELECT id FROM accounts WHERE org_unit_id = ANY({tree}))";
const PUBLIC_RESOURCE = "(status = 'PUBLISHED' AND is_public)";
const OPEN_EXAM_QUESTIONS =
  "(SELECT unnest(question_ids) FROM quiz_exams WHERE status = 'OPEN')";
const FINALIZED_SNAPSHOTS = "(SELECT id FROM ranking_snapshots WHERE status = 'FINALIZED')";

/* ---------------- Che cột ---------------- */

const drop = (...fields: string[]) => (row: Record<string, unknown>) => {
  for (const f of fields) delete row[f];
};

/**
 * Hợp đồng 2 — diễn đàn ẩn danh: che authorAccountId / likedByAccountIds / dấu vết kiểm duyệt
 * theo người xem. Dùng CHUNG hàm với các API /api/dien-dan/* (forum-view.ts). Chỉ QUAN_TRI_TW
 * nhận đủ cột — cán bộ khác (kể cả có forum.manage) bị che như người dùng thường.
 */
function maskForum(row: Record<string, unknown>, v: ReadViewer) {
  maskForumRow(row, {
    accountId: v.accountId,
    isTW: v.isTW,
    canModerate: v.scope === "full" && hasPerm(v.perms, "forum.manage"),
  });
}

/** Dự án tình nguyện của người khác: bỏ id người gửi + thông tin kiểm duyệt */
function maskProject(row: Record<string, unknown>, v: ReadViewer) {
  if (v.accountId !== null && Number(row.submittedByAccountId) === v.accountId) return;
  for (const f of ["submittedByAccountId", "moderatedByAccountId", "moderatedAt", "aiVerdict", "aiReason", "rejectionReason"]) {
    delete row[f];
  }
}

function maskResource(row: Record<string, unknown>, v: ReadViewer) {
  if (v.accountId !== null && Number(row.submittedByAccountId) === v.accountId) return;
  delete row.submittedByAccountId;
}

/* ---------------- Luật cho khách (public) ---------------- */

const PUBLIC_RULES: Record<string, RuleFn> = {
  // Bảng xếp hạng: chỉ kỳ đã chốt (trang chủ + /bang-xep-hang)
  rankingSnapshots: () => ({ where: "status = 'FINALIZED'", mask: drop("generatedByAccountId") }),
  rankingEntries: () => ({ where: `snapshot_id IN ${FINALIZED_SNAPSHOTS}` }),
  // Hoạt động: chỉ hoạt động đang mở điểm danh (trang /diem-danh); số đếm trang chủ lấy từ /api/thong-ke
  activities: () => ({ where: "id = ANY({open})", mask: drop("reviewNote") }),
  activityCategories: () => ({ where: "activity_id = ANY({open})" }),
  activityLinks: () => ({ where: "activity_id = ANY({open})" }),
  publishedPosts: () => ({ where: "status = 'PUBLISHED'", mask: drop("internalNotes", "editorAccountId") }),
  documents: () => ({ where: "status = 'ISSUED'" }),
  resources: () => ({ where: PUBLIC_RESOURCE, mask: maskResource }),
  settings: () => ({ where: "group_name = 'Công khai' OR setting_key = 'attendance_open_ids'" }),
  forumThreads: () => ({ where: "status = 'PUBLISHED'", mask: maskForum }),
  forumComments: () => ({
    where: "status = 'PUBLISHED' AND thread_id IN (SELECT id FROM forum_threads WHERE status = 'PUBLISHED')",
    mask: maskForum,
  }),
  hs3tUnitStandards: () => ({ mask: drop("confirmedByAccountId") }),
  // Hợp đồng 3 — đề đang mở + câu hỏi thuộc các đề đó, KHÔNG kèm đáp án
  quizExams: () => ({ where: "status = 'OPEN'", mask: drop("createdByAccountId") }),
  quizQuestions: () => ({ where: `id IN ${OPEN_EXAM_QUESTIONS}`, mask: drop("correctIndexes", "correctText") }),
  volunteerProjects: () => ({ where: "status = 'APPROVED'", mask: maskProject }),
};

/* ---------------- Luật cho đoàn viên (member) = khách + của chính mình ---------------- */

const MEMBER_RULES: Record<string, RuleFn> = {
  ...PUBLIC_RULES,
  resources: () => ({ where: `${PUBLIC_RESOURCE} OR submitted_by_account_id = {me}`, mask: maskResource }),
  forumThreads: () => ({ where: "status = 'PUBLISHED' OR author_account_id = {me}", mask: maskForum }),
  forumComments: () => ({
    where:
      "(status = 'PUBLISHED' AND thread_id IN (SELECT id FROM forum_threads WHERE status = 'PUBLISHED' OR author_account_id = {me})) OR author_account_id = {me}",
    mask: maskForum,
  }),
  volunteerProjects: () => ({ where: "status = 'APPROVED' OR submitted_by_account_id = {me}", mask: maskProject }),
  // Đề đã đóng nhưng mình từng thi → vẫn trả để trang "lượt thi của tôi" hiện tên đề
  quizExams: () => ({
    where: "status = 'OPEN' OR id IN (SELECT exam_id FROM quiz_attempts WHERE account_id = {me})",
    mask: drop("createdByAccountId"),
  }),
  quizAttempts: () => ({ where: "account_id = {me}" }),
  notifications: () => ({ where: "recipient_account_id = {me}" }),
  feedbacks: () => ({ where: "sender_account_id = {me}" }),
  // Ghi chú nội bộ của cán bộ KHÔNG gửi cho người phản ánh
  feedbackMessages: () => ({
    where: "is_internal_note = false AND feedback_id IN (SELECT id FROM feedbacks WHERE sender_account_id = {me})",
    mask: drop("senderAccountId"),
  }),
  emailLogs: () => ({
    where: "feedback_id IN (SELECT id FROM feedbacks WHERE sender_account_id = {me})",
    mask: drop("sentByAccountId"),
  }),
  hs3tProfiles: () => ({ where: "account_id = {me}" }),
  hs3tAchievements: () => ({ where: "profile_id IN (SELECT id FROM hs3t_profiles WHERE account_id = {me})" }),
  memberContributions: () => ({ where: "contributor_account_id = {me}" }),
  contributions: () => ({ where: "account_id = {me}" }),
};

/* ---------------- Luật cho cán bộ (trừ QUAN_TRI_TW) — chỉ lọc dòng ---------------- */

/** Phân công thấy được: giao cho đơn vị trong cây, do cây giao, hoặc là phân công cha trực tiếp */
const VISIBLE_ASSIGNMENTS = `(SELECT id FROM task_assignments
  WHERE org_unit_id = ANY({tree}) OR assigned_by_org_unit_id = ANY({tree})
     OR id IN (SELECT parent_assignment_id FROM task_assignments WHERE org_unit_id = ANY({tree})))`;
const VISIBLE_ACTIVITIES = "(SELECT id FROM activities WHERE org_unit_id = ANY({tree}) OR id = ANY({open}))";

/**
 * Phản ánh trong phạm vi: người được giao / người gửi thuộc cây đơn vị; địa bàn hành
 * chính của người gửi khớp địa bàn đơn vị trong cây; Tỉnh đoàn còn khớp theo ô
 * "Đoàn tỉnh/thành" người gửi tự nhập (so không dấu, không phân biệt hoa thường).
 */
function feedbackScope(v: ReadViewer): string {
  const parts = [
    `assigned_account_id IN ${ACC_IN_TREE}`,
    `sender_account_id IN ${ACC_IN_TREE}`,
    `sender_admin_unit_id IN (SELECT admin_unit_id FROM org_units WHERE id = ANY({tree}) AND admin_unit_id IS NOT NULL)`,
    `sender_admin_unit_id IN (SELECT au.id FROM admin_units au JOIN org_units o ON o.admin_unit_id = au.parent_id WHERE o.id = ANY({tree}))`,
  ];
  if (v.provinceKey) {
    parts.push(
      "lower(immutable_unaccent(COALESCE(sender_province_union, ''))) LIKE '%' || lower(immutable_unaccent({prov})) || '%'",
    );
  }
  return `(${parts.join(" OR ")})`;
}
const FEEDBACK_PERMS = ["feedback.view", "feedback.reply", "feedback.manage"];

const STAFF_RULES: Record<string, RuleFn> = {
  // Tham chiếu chung: bộ tiêu chí, nhiệm vụ, chỉ tiêu, cài đặt, tiêu chuẩn HS3T, ngân hàng đề
  criteriaSets: () => ({}),
  tasks: () => ({}),
  taskMetrics: () => ({}),
  settings: () => ({}),
  hs3tUnitStandards: () => ({}),
  quizQuestions: () => ({}),
  quizExams: () => ({}),

  taskAssignments: () => ({ where: `id IN ${VISIBLE_ASSIGNMENTS}` }),
  assignmentTargets: () => ({ where: `task_assignment_id IN ${VISIBLE_ASSIGNMENTS}` }),
  taskResults: () => ({ where: `task_assignment_id IN ${VISIBLE_ASSIGNMENTS}` }),
  assignmentReviews: () => ({ where: `task_assignment_id IN ${VISIBLE_ASSIGNMENTS}` }),
  scores: () => ({ where: "org_unit_id = ANY({tree})" }),
  rankingSnapshots: () => ({ where: "status = 'FINALIZED' OR scope_org_unit_id = ANY({tree})" }),
  rankingEntries: () => ({
    where: "snapshot_id IN (SELECT id FROM ranking_snapshots WHERE status = 'FINALIZED' OR scope_org_unit_id = ANY({tree}))",
  }),
  activities: () => ({ where: `id IN ${VISIBLE_ACTIVITIES}` }),
  activityCategories: () => ({ where: `activity_id IN ${VISIBLE_ACTIVITIES}` }),
  activityLinks: () => ({ where: `activity_id IN ${VISIBLE_ACTIVITIES}` }),
  // Ban biên tập (post.manage/post.publish) quản lý tin bài toàn hệ thống
  publishedPosts: (v) =>
    hasAny(v, ["post.manage", "post.publish"])
      ? {}
      : {
          where: `status = 'PUBLISHED' OR activity_id IN ${VISIBLE_ACTIVITIES} OR author_org_unit_id = ANY({tree}) OR editor_account_id = {me} OR contributor_account_id = {me}`,
        },
  reports: () => ({ where: "org_unit_id = ANY({tree})" }),
  documents: () => ({
    where: "status = 'ISSUED' OR issuing_org_unit_id = ANY({tree}) OR id IN (SELECT document_id FROM document_recipients WHERE org_unit_id = ANY({tree}))",
  }),
  documentRecipients: () => ({
    where: "org_unit_id = ANY({tree}) OR document_id IN (SELECT id FROM documents WHERE issuing_org_unit_id = ANY({tree}))",
  }),
  // Thông báo: CHỈ của chính tài khoản
  notifications: () => ({ where: "recipient_account_id = {me}" }),
  feedbacks: (v) => (hasAny(v, FEEDBACK_PERMS) ? { where: feedbackScope(v) } : null),
  feedbackMessages: (v) =>
    hasAny(v, FEEDBACK_PERMS) ? { where: `feedback_id IN (SELECT id FROM feedbacks WHERE ${feedbackScope(v)})` } : null,
  emailLogs: (v) =>
    hasAny(v, FEEDBACK_PERMS)
      ? { where: `feedback_id IN (SELECT id FROM feedbacks WHERE ${feedbackScope(v)}) OR sent_by_account_id = {me}` }
      : { where: "sent_by_account_id = {me}" },
  attendances: () => ({ where: `activity_id IN ${VISIBLE_ACTIVITIES} OR org_unit_id = ANY({tree})` }),
  liveEvents: () => ({ where: "org_unit_id = ANY({tree})" }),
  resources: () => ({
    where: `status = 'PUBLISHED' OR published_by_org_unit_id = ANY({tree}) OR submitted_by_account_id IN ${ACC_IN_TREE}`,
  }),
  // Diễn đàn ẩn danh — kiểm duyệt cần forum.manage (mặc định chỉ QUAN_TRI_TW); mọi cán bộ ngoài TW
  // đều bị che tác giả/người thích (maskForum), cán bộ không có forum.manage chỉ thấy như người dùng thường
  forumThreads: (v) =>
    hasPerm(v.perms, "forum.manage")
      ? { mask: maskForum }
      : { where: "status = 'PUBLISHED' OR author_account_id = {me}", mask: maskForum },
  forumComments: (v) =>
    hasPerm(v.perms, "forum.manage")
      ? { mask: maskForum }
      : {
          where:
            "(status = 'PUBLISHED' AND thread_id IN (SELECT id FROM forum_threads WHERE status = 'PUBLISHED' OR author_account_id = {me})) OR author_account_id = {me}",
          mask: maskForum,
        },
  // HS3T theo trường trong cây (trang /quan-tri/hs3t mở cho TINH/CAP3/DON_VI hoặc quyền hs3t.*)
  hs3tProfiles: (v) =>
    ["QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"].includes(v.role ?? "") || hasAny(v, ["hs3t.view", "hs3t.review"])
      ? { where: "school_org_unit_id = ANY({tree}) OR account_id = {me}" }
      : { where: "account_id = {me}" },
  hs3tAchievements: (v) =>
    ["QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"].includes(v.role ?? "") || hasAny(v, ["hs3t.view", "hs3t.review"])
      ? { where: "profile_id IN (SELECT id FROM hs3t_profiles WHERE school_org_unit_id = ANY({tree}) OR account_id = {me})" }
      : { where: "profile_id IN (SELECT id FROM hs3t_profiles WHERE account_id = {me})" },
  // Lượt thi: cần quyền quiz.manage/quiz.result — đề do cây đơn vị tạo (mọi lượt) + lượt của
  // thí sinh có tài khoản trong cây; luôn thấy lượt thi của chính mình
  quizAttempts: (v) =>
    hasAny(v, ["quiz.manage", "quiz.result"])
      ? {
          where: `account_id = {me} OR account_id IN ${ACC_IN_TREE} OR exam_id IN (SELECT id FROM quiz_exams WHERE created_by_account_id IN ${ACC_IN_TREE})`,
        }
      : { where: "account_id = {me}" },
  volunteerProjects: () => ({
    where: `status = 'APPROVED' OR org_unit_id = ANY({tree}) OR submitted_by_account_id IN ${ACC_IN_TREE}`,
  }),
  orgDirectories: () => ({ where: "org_unit_id = ANY({tree})" }),
  memberContributions: (v) =>
    hasPerm(v.perms, "contribution.review") ? {} : { where: `contributor_account_id IN ${ACC_IN_TREE}` },
  contributions: () => ({ where: `account_id = {me} OR account_id IN ${ACC_IN_TREE}` }),
};

/* ---------------- Áp luật ---------------- */

const VAR_TYPES: Record<string, string> = { me: "bigint", tree: "bigint[]", open: "bigint[]", prov: "text" };

/** Đổi {me} {tree} {open} {prov} → $1..$n (chỉ bind biến có dùng) */
export function bindWhere(where: string, v: ReadViewer): { where: string; params: unknown[] } {
  const values: Record<string, unknown> = {
    me: v.accountId ?? 0,
    tree: v.tree,
    open: v.openActivityIds,
    prov: v.provinceKey,
  };
  const index = new Map<string, number>();
  const params: unknown[] = [];
  const sql = where.replace(/\{(me|tree|open|prov)\}/g, (_, name: string) => {
    if (!index.has(name)) {
      params.push(values[name]);
      index.set(name, params.length);
    }
    return `$${index.get(name)}::${VAR_TYPES[name]}`;
  });
  return { where: sql, params };
}

/** Luật của 1 entity với người xem — null = không trả entity này */
export function ruleFor(entity: string, v: ReadViewer): EntityRule | null {
  if (!ENTITY_SPECS[entity]) return null;
  if (v.scope === "full") {
    if (v.isTW) return {};
    const fn = STAFF_RULES[entity];
    // Entity mới chưa khai báo luật → không trả cho cán bộ cấp dưới (an toàn mặc định)
    return fn ? fn(v) : null;
  }
  const allowed = v.scope === "public" ? PUBLIC_READ_ENTITIES : MEMBER_READ_ENTITIES;
  if (!allowed.has(entity)) return null;
  const fn = (v.scope === "public" ? PUBLIC_RULES : MEMBER_RULES)[entity];
  return fn ? fn(v) : null;
}

/** Đọc snapshot theo chính sách — trả {entity: rows[]}; entity không được đọc thì vắng mặt */
export async function readSnapshot(v: ReadViewer): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {};
  for (const entity of ENTITY_ORDER) {
    const rule = ruleFor(entity, v);
    if (!rule) continue;
    const rows = rule.where ? await readEntity(entity, bindWhere(rule.where, v)) : await readEntity(entity);
    if (rule.mask) for (const row of rows) rule.mask(row, v);
    data[entity] = rows;
  }
  return data;
}
