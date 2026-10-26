import { effectivePermissions, hasPerm } from "@/lib/permissions";
import { CONTRIBUTION_POINTS } from "@/types";

/**
 * Phân quyền GHI phía server cho POST /api/store (đồng bộ dòng của cán bộ).
 *
 * Mỗi entity của ENTITY_SPECS có 1 chính sách: quyền cần (effectivePermissions +
 * hasPerm, mã quyền theo PERM_CATALOG), cột xác định đơn vị để kiểm phạm vi (bảng
 * con thì tra qua bảng cha) và quy tắc đặc thù (không tự chấm/tự duyệt, chỉ người
 * nhận được đánh dấu đã đọc…).
 *
 * Nguyên tắc chung:
 * - Phạm vi đơn vị = đơn vị của phiên + mọi đơn vị con (tính ở server từ org_units).
 *   QUAN_TRI_TW toàn quyền (bỏ qua kiểm tra).
 * - Cập nhật: điều kiện phải đúng với CẢ dòng cũ (DB) lẫn dòng mới — không "chuyển"
 *   bản ghi sang đơn vị khác hay lấy bản ghi của đơn vị khác về.
 * - Xoá (tombstone): cùng điều kiện với dòng hiện có trong DB.
 * - Dòng ở đây là dạng CỘT DB (đã chuẩn hoá: số, chuỗi ISO…), không phải field client.
 */

export type Row = Record<string, unknown>;

/** Chủ thể ghi — dựng 1 lần mỗi request từ phiên đăng nhập */
export interface WriteSubject {
  accountId: number;
  orgUnitId: number;
  role: string;
  perms: string[];
  /** QUAN_TRI_TW có quyền "*" — bỏ qua mọi kiểm tra */
  superAdmin: boolean;
  /** Đơn vị của phiên + mọi đơn vị con */
  scope: Set<number>;
}

export interface RowChange {
  entity: string;
  op: "insert" | "update" | "delete";
  /** Dòng đang có trong DB (null khi thêm mới) */
  old: Row | null;
  /** Dòng sau khi ghi (null khi xoá) */
  next: Row | null;
  /** Cột thay đổi so với DB (thêm mới: mọi cột client gửi). Hoạt động có thêm "#categories"/"#links" */
  changed: string[];
}

/** Tra cứu phục vụ kiểm quyền — ưu tiên bản mới trong cùng lô gửi, không có thì đọc DB */
export interface PolicyEnv {
  subject: WriteSubject;
  row(entity: string, key: unknown): Promise<Row | null>;
  /** Dòng này được THÊM MỚI trong cùng lô gửi */
  isNew(entity: string, key: unknown): boolean;
  /** Đơn vị của 1 tài khoản */
  accountOrg(accountId: unknown): Promise<number | null>;
}

export interface EntityPolicy {
  /** Tên loại dữ liệu hiển thị trong thông báo lỗi */
  label: string;
  /** Trả lý do từ chối (tiếng Việt), null = cho phép */
  check(ch: RowChange, env: PolicyEnv): Promise<string | null> | string | null;
  /** Cột server tự điền khi thêm mới (người tạo…) — giá trị undefined = giữ nguyên */
  setOnInsert?: Record<string, (s: WriteSubject, next: Row) => unknown>;
  /** Cột không được sửa / do derive ghi đè — khi cập nhật luôn giữ giá trị trong DB */
  keepOnUpdate?: string[];
}

/* ---------------- Tiện ích ---------------- */

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const same = (a: unknown, b: unknown) => num(a) !== null && num(a) === num(b);

export function anyPerm(s: WriteSubject, ...codes: string[]): boolean {
  return codes.some((c) => hasPerm(s.perms, c));
}
/** Đơn vị nằm trong phạm vi (đơn vị mình hoặc cấp dưới) */
export function inScope(s: WriteSubject, org: unknown): boolean {
  const id = num(org);
  return s.superAdmin || (id !== null && s.scope.has(id));
}
/** Đơn vị CẤP DƯỚI trong phạm vi (không phải đơn vị mình) */
export function below(s: WriteSubject, org: unknown): boolean {
  return inScope(s, org) && num(org) !== s.orgUnitId;
}
const isSelf = (s: WriteSubject, accountId: unknown) => same(accountId, s.accountId);
const isOwnOrg = (s: WriteSubject, org: unknown) => same(org, s.orgUnitId);
const onlyChanged = (ch: RowChange, allowed: string[]) => ch.changed.every((c) => allowed.includes(c));
/** Các dòng phải thoả điều kiện: thêm → dòng mới; sửa → cả cũ lẫn mới; xoá → dòng cũ */
const rowsOf = (ch: RowChange): Row[] => [ch.old, ch.next].filter((r): r is Row => r !== null);
const allRows = (ch: RowChange, pred: (r: Row) => boolean) => rowsOf(ch).every(pred);

async function allRowsAsync(ch: RowChange, pred: (r: Row) => Promise<boolean>): Promise<boolean> {
  for (const r of rowsOf(ch)) if (!(await pred(r))) return false;
  return true;
}

const NO_PERM = "tài khoản chưa được phân quyền chức năng này";
const OUT_OF_SCOPE = "dữ liệu thuộc đơn vị ngoài phạm vi quản lý";

/** Quyền chấm điểm thi đua: score.manage, hoặc cán bộ quản trị cấp trên (Tỉnh/cấp 3) có quyền xem điểm */
const canScore = (s: WriteSubject) =>
  anyPerm(s, "score.manage") ||
  ((s.role === "QUAN_TRI_TINH" || s.role === "QUAN_TRI_CAP3") && anyPerm(s, "score.view"));
/** Quyền lập/chốt kỳ xếp hạng */
const canRank = (s: WriteSubject) => anyPerm(s, "ranking.manage") || canScore(s);
const anyTaskPerm = (s: WriteSubject) => anyPerm(s, "task.assign", "task.update", "task.review");
const anyActivityPerm = (s: WriteSubject) => anyPerm(s, "activity.create", "activity.view", "activity.review");
const anyFeedbackPerm = (s: WriteSubject) => anyPerm(s, "feedback.view", "feedback.reply", "feedback.manage");

/** Đơn vị sở hữu nhiệm vụ: chủ bộ tiêu chí, nhiệm vụ ngoài bộ tiêu chí thì đơn vị tạo */
async function taskOwner(env: PolicyEnv, task: Row | null): Promise<number | null> {
  if (!task) return null;
  if (num(task.criteria_set_id) !== null) {
    const set = await env.row("criteriaSets", task.criteria_set_id);
    return num(set?.owner_org_unit_id);
  }
  return num(task.created_by_org_unit_id);
}

/** Bên giao (hoặc cấp trên của bên giao) — toàn quyền với phân công */
const assignerOf = (s: WriteSubject, a: Row | null) =>
  !!a && anyPerm(s, "task.assign", "task.review") && inScope(s, a.assigned_by_org_unit_id) && inScope(s, a.org_unit_id);

/** Danh sách id trong chuỗi "1,2,3" (setting attendance_open_ids) */
const idList = (v: unknown) =>
  new Set(
    String(v ?? "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  );

/**
 * Entity CHỈ ghi qua API riêng, không bao giờ qua POST /api/store (kể cả QUAN_TRI_TW):
 * dòng diễn đàn trả về cho cán bộ ngoài TW đã che authorAccountId/likedByAccountIds, nên
 * UPSERT cả dòng từ snapshot sẽ đè mất cột thật. Đăng bài/bình luận: /api/dien-dan/bai-viet,
 * /api/dien-dan/binh-luan; thích: /api/dien-dan/thich; duyệt/ẩn: /api/dien-dan/kiem-duyet.
 */
export const API_ONLY_ENTITIES: ReadonlySet<string> = new Set(["forumThreads", "forumComments"]);

const forumViaApiPolicy = (label: string): EntityPolicy => ({
  label,
  check: () => "diễn đàn chỉ ghi qua API riêng (/api/dien-dan/*), không ghi qua đồng bộ",
});

/* ---------------- Bảng chính sách theo entity ---------------- */

export const WRITE_POLICIES: Record<string, EntityPolicy> = {
  /* ===== Thi đua: bộ tiêu chí, nhiệm vụ, chỉ tiêu — chỉ đơn vị sở hữu và cấp trên ===== */
  criteriaSets: {
    label: "Bộ tiêu chí thi đua",
    check(ch, { subject: s }) {
      if (!anyPerm(s, "task.assign", "score.manage")) return NO_PERM;
      return allRows(ch, (r) => inScope(s, r.owner_org_unit_id)) ? null : "bộ tiêu chí thuộc đơn vị khác (chỉ đơn vị ban hành và cấp trên được sửa)";
    },
  },
  tasks: {
    label: "Nhiệm vụ / tiêu chí",
    async check(ch, env) {
      if (!anyPerm(env.subject, "task.assign")) return NO_PERM;
      return (await allRowsAsync(ch, async (r) => inScope(env.subject, await taskOwner(env, r))))
        ? null
        : "nhiệm vụ thuộc bộ tiêu chí của đơn vị khác";
    },
    setOnInsert: { created_by_org_unit_id: (s) => s.orgUnitId },
    keepOnUpdate: ["created_by_org_unit_id"],
  },
  taskMetrics: {
    label: "Chỉ tiêu của nhiệm vụ",
    async check(ch, env) {
      if (!anyPerm(env.subject, "task.assign")) return NO_PERM;
      return (await allRowsAsync(ch, async (r) => inScope(env.subject, await taskOwner(env, await env.row("tasks", r.task_id)))))
        ? null
        : "chỉ tiêu thuộc nhiệm vụ của đơn vị khác";
    },
  },

  /* ===== Phân công: bên giao tạo/sửa; bên nhận chỉ cập nhật tiến độ của mình ===== */
  taskAssignments: {
    label: "Phân công nhiệm vụ",
    check(ch, { subject: s }) {
      if (ch.op === "insert") {
        const n = ch.next!;
        if (!anyPerm(s, "task.assign")) return NO_PERM;
        if (!inScope(s, n.assigned_by_org_unit_id) || !inScope(s, n.org_unit_id)) return OUT_OF_SCOPE;
        return same(n.org_unit_id, n.assigned_by_org_unit_id) ? "không được tự giao nhiệm vụ cho chính đơn vị giao" : null;
      }
      if (ch.op === "delete") return assignerOf(s, ch.old) ? null : "chỉ đơn vị giao (hoặc cấp trên) mới được thu hồi phân công";
      if (assignerOf(s, ch.old) && assignerOf(s, ch.next)) return null;
      // Cấp trên của đơn vị nhận xác nhận / trả lại kết quả
      if (anyPerm(s, "task.review") && allRows(ch, (r) => below(s, r.org_unit_id)) && onlyChanged(ch, ["confirm_status", "confirmed_at"])) {
        return null;
      }
      // Đơn vị nhận (và cấp trên trong phạm vi) cập nhật tiến độ — không tự xác nhận
      if (
        anyTaskPerm(s) &&
        allRows(ch, (r) => inScope(s, r.org_unit_id)) &&
        onlyChanged(ch, ["progress_status", "completion_rate", "confirm_status"]) &&
        (!ch.changed.includes("confirm_status") || ch.next!.confirm_status === "PENDING")
      ) {
        return null;
      }
      return "đơn vị nhận chỉ được cập nhật tiến độ của mình; giao/sửa/xác nhận do cấp trên thực hiện";
    },
  },
  assignmentTargets: {
    label: "Chỉ tiêu được giao",
    async check(ch, env) {
      const s = env.subject;
      const parents = await Promise.all(rowsOf(ch).map((r) => env.row("taskAssignments", r.task_assignment_id)));
      if (parents.some((p) => !p)) return "không tìm thấy phân công của chỉ tiêu";
      if (parents.every((p) => assignerOf(s, p))) return null;
      // Đơn vị nhận báo cáo số liệu đạt được / cấp trên cộng số liệu khi duyệt hoạt động
      if (ch.op === "update" && anyTaskPerm(s) && onlyChanged(ch, ["achieved_value"]) && parents.every((p) => inScope(s, p!.org_unit_id))) {
        return null;
      }
      return "chỉ đơn vị giao được đặt chỉ tiêu; đơn vị nhận chỉ cập nhật số liệu đạt được";
    },
  },
  taskResults: {
    label: "Kết quả thực hiện nhiệm vụ",
    async check(ch, env) {
      const s = env.subject;
      const parents = await Promise.all(rowsOf(ch).map((r) => env.row("taskAssignments", r.task_assignment_id)));
      if (parents.some((p) => !p)) return "không tìm thấy phân công của kết quả";
      if (ch.op === "delete") return parents.every((p) => assignerOf(s, p)) ? null : "chỉ đơn vị giao được xoá kết quả";
      if (!anyTaskPerm(s)) return NO_PERM;
      if (!parents.every((p) => inScope(s, p!.org_unit_id))) return "chỉ đơn vị được giao (hoặc cấp trên) mới báo cáo kết quả";
      return isSelf(s, ch.next!.reported_by_account_id) ? null : "người báo cáo phải là tài khoản đang đăng nhập";
    },
  },
  assignmentReviews: {
    label: "Xác nhận kết quả nhiệm vụ",
    async check(ch, env) {
      const s = env.subject;
      const parents = await Promise.all(rowsOf(ch).map((r) => env.row("taskAssignments", r.task_assignment_id)));
      if (parents.some((p) => !p)) return "không tìm thấy phân công cần xác nhận";
      if (ch.op === "delete") return parents.every((p) => assignerOf(s, p)) ? null : "chỉ đơn vị giao được xoá lượt xác nhận";
      if (!anyPerm(s, "task.review")) return NO_PERM;
      if (!parents.every((p) => below(s, p!.org_unit_id))) return "chỉ cấp trên được xác nhận kết quả của đơn vị cấp dưới — không tự duyệt đơn vị mình";
      return isSelf(s, ch.next!.reviewer_account_id) ? null : "người xác nhận phải là tài khoản đang đăng nhập";
    },
  },

  /* ===== Chấm điểm & xếp hạng: chỉ cấp trên chấm cấp dưới ===== */
  scores: {
    label: "Điểm thi đua",
    check(ch, { subject: s }) {
      if (!canScore(s)) return NO_PERM;
      if (!allRows(ch, (r) => below(s, r.org_unit_id))) return "chỉ cấp trên được chấm điểm đơn vị cấp dưới trong phạm vi — không tự chấm đơn vị mình";
      if (ch.op !== "delete" && !isSelf(s, ch.next!.scored_by_account_id)) return "người chấm phải là tài khoản đang đăng nhập";
      return null;
    },
  },
  rankingSnapshots: {
    label: "Kỳ xếp hạng",
    check(ch, { subject: s }) {
      if (!canRank(s)) return NO_PERM;
      if (!allRows(ch, (r) => inScope(s, r.scope_org_unit_id))) return OUT_OF_SCOPE;
      if (ch.op === "insert" && !isSelf(s, ch.next!.generated_by_account_id)) return "người lập phải là tài khoản đang đăng nhập";
      return null;
    },
    keepOnUpdate: ["generated_by_account_id"],
  },
  rankingEntries: {
    label: "Kết quả xếp hạng",
    async check(ch, env) {
      const s = env.subject;
      if (!canRank(s)) return NO_PERM;
      for (const r of rowsOf(ch)) {
        const snap = await env.row("rankingSnapshots", r.snapshot_id);
        if (!snap || !inScope(s, snap.scope_org_unit_id)) return OUT_OF_SCOPE;
        if (!below(s, r.org_unit_id)) return "chỉ xếp hạng đơn vị cấp dưới trong phạm vi — không tự xếp hạng đơn vị mình";
      }
      return null;
    },
  },

  /* ===== Hoạt động: đơn vị mình tạo/sửa, cấp trên duyệt ===== */
  activities: {
    label: "Hoạt động",
    check(ch, { subject: s }) {
      const okStatus = (v: unknown) => v === null || v === undefined || v === "NOT_REQUIRED" || v === "PENDING";
      if (ch.op === "insert") {
        if (!anyActivityPerm(s)) return NO_PERM;
        if (!isOwnOrg(s, ch.next!.org_unit_id)) return "chỉ được tạo hoạt động cho đơn vị của mình";
        return okStatus(ch.next!.confirm_status) ? null : "không được tự xác nhận hoạt động của đơn vị mình";
      }
      if (ch.op === "delete") {
        return isOwnOrg(s, ch.old!.org_unit_id) || (below(s, ch.old!.org_unit_id) && anyPerm(s, "activity.review"))
          ? null
          : "hoạt động thuộc đơn vị khác";
      }
      if (allRows(ch, (r) => isOwnOrg(s, r.org_unit_id))) {
        if (ch.changed.includes("confirm_status") && !okStatus(ch.next!.confirm_status)) return "không được tự xác nhận hoạt động của đơn vị mình";
        if (ch.changed.includes("review_note")) return "nhận xét duyệt do cấp trên ghi";
        return null;
      }
      if (allRows(ch, (r) => below(s, r.org_unit_id)) && anyPerm(s, "activity.review") && onlyChanged(ch, ["confirm_status", "review_note", "updated_at"])) {
        return null;
      }
      return "chỉ đơn vị thực hiện được sửa hoạt động; cấp trên chỉ được duyệt";
    },
    setOnInsert: { created_by_account_id: (s) => s.accountId },
    keepOnUpdate: ["created_by_account_id"],
  },
  // Bảng con gửi kèm hoạt động được kiểm theo hoạt động cha; dòng lẻ (không kèm cha) kiểm ở đây
  activityCategories: {
    label: "Chuyên mục của hoạt động",
    async check(ch, env) {
      return (await allRowsAsync(ch, async (r) => isOwnOrg(env.subject, (await env.row("activities", r.activity_id))?.org_unit_id)))
        ? null
        : "hoạt động thuộc đơn vị khác";
    },
  },
  activityLinks: {
    label: "Liên kết của hoạt động",
    async check(ch, env) {
      return (await allRowsAsync(ch, async (r) => isOwnOrg(env.subject, (await env.row("activities", r.activity_id))?.org_unit_id)))
        ? null
        : "hoạt động thuộc đơn vị khác";
    },
  },
  attendances: {
    label: "Điểm danh",
    async check(ch, env) {
      const s = env.subject;
      if (ch.op === "insert") {
        const n = ch.next!;
        const open = idList((await env.row("settings", "attendance_open_ids"))?.value);
        const act = await env.row("activities", n.activity_id);
        if (!act || !open.has(Number(n.activity_id))) return "hoạt động chưa mở điểm danh";
        return same(n.org_unit_id, act.org_unit_id) ? null : "đơn vị điểm danh không khớp hoạt động";
      }
      if (ch.op === "delete") {
        const act = await env.row("activities", ch.old!.activity_id);
        return act && inScope(s, act.org_unit_id) && anyActivityPerm(s) ? null : OUT_OF_SCOPE;
      }
      return "lượt điểm danh đã ghi không được sửa";
    },
  },
  liveEvents: {
    label: "Sự kiện trực tiếp",
    check: () => "sự kiện trực tiếp do máy chủ tự sinh",
  },

  /* ===== Truyền thông ===== */
  publishedPosts: {
    label: "Bài viết xuất bản",
    async check(ch, env) {
      const s = env.subject;
      const editor = anyPerm(s, "post.manage", "post.publish");
      // Duyệt bài đóng góp của đoàn viên → dựng bài công khai mới
      const fromContribution = ch.op === "insert" && anyPerm(s, "contribution.review") && num(ch.next!.contributor_account_id) !== null;
      if (!editor && !fromContribution) return NO_PERM;
      // Ban biên tập TW quản lý mọi bài; cấp dưới chỉ bài do tài khoản trong phạm vi biên tập
      if (s.orgUnitId === 1) return null;
      for (const r of rowsOf(ch)) {
        if (!inScope(s, await env.accountOrg(r.editor_account_id))) return "bài viết do đơn vị khác biên tập";
      }
      return null;
    },
  },
  reports: {
    label: "Báo cáo",
    check(ch, { subject: s }) {
      if (!anyPerm(s, "report.create", "report.manage")) return NO_PERM;
      return allRows(ch, (r) => inScope(s, r.org_unit_id)) ? null : "báo cáo của đơn vị ngoài phạm vi";
    },
    setOnInsert: { created_by_account_id: (s) => s.accountId },
    keepOnUpdate: ["created_by_account_id", "finalized_at"],
  },
  documents: {
    label: "Văn bản",
    check(ch, { subject: s }) {
      if (!anyPerm(s, "document.issue")) return NO_PERM;
      return allRows(ch, (r) => inScope(s, r.issuing_org_unit_id)) ? null : "văn bản do đơn vị ngoài phạm vi ban hành";
    },
    setOnInsert: { created_by_account_id: (s) => s.accountId },
    keepOnUpdate: ["created_by_account_id"],
  },
  documentRecipients: {
    label: "Nơi nhận văn bản",
    async check(ch, env) {
      const s = env.subject;
      const issuer = async (r: Row) => {
        const doc = await env.row("documents", r.document_id);
        return !!doc && anyPerm(s, "document.issue") && inScope(s, doc.issuing_org_unit_id);
      };
      if (ch.op === "insert") {
        const n = ch.next!;
        if (!(await issuer(n))) return "chỉ đơn vị ban hành được thêm nơi nhận";
        if (!inScope(s, n.org_unit_id)) return "nơi nhận ngoài phạm vi của đơn vị ban hành";
        return n.read_at == null || isOwnOrg(s, n.org_unit_id) ? null : "không được đánh dấu đã đọc thay đơn vị nhận";
      }
      if (ch.op === "delete") return (await issuer(ch.old!)) ? null : "chỉ đơn vị ban hành được bỏ nơi nhận";
      // Đơn vị nhận chỉ được đánh dấu đã đọc của chính mình
      if (onlyChanged(ch, ["read_at"]) && allRows(ch, (r) => isOwnOrg(s, r.org_unit_id))) return null;
      return "chỉ đơn vị nhận được đánh dấu đã đọc văn bản của chính mình";
    },
  },
  notifications: {
    label: "Thông báo",
    check(ch, { subject: s }) {
      // Thông báo là tác dụng phụ của nhiều thao tác (giao việc, duyệt…) → cán bộ được tạo
      if (ch.op === "insert") return ch.next!.is_read === true ? "thông báo mới phải ở trạng thái chưa đọc" : null;
      if (ch.op === "delete") return "không xoá thông báo qua đồng bộ";
      return onlyChanged(ch, ["is_read"]) && allRows(ch, (r) => isSelf(s, r.recipient_account_id))
        ? null
        : "chỉ người nhận được đánh dấu đã đọc thông báo của mình";
    },
  },

  /* ===== Phản ánh kiến nghị ===== */
  feedbacks: {
    label: "Phản ánh kiến nghị",
    check(ch, { subject: s }) {
      if (ch.op === "insert") {
        // Cán bộ gửi phản ánh từ trang công khai — đứng tên chính mình (hoặc ẩn danh)
        const n = ch.next!;
        if (num(n.sender_account_id) !== null && !isSelf(s, n.sender_account_id)) return "không được gửi phản ánh dưới tên người khác";
        return n.status == null || n.status === "NEW" ? null : "phản ánh mới phải ở trạng thái tiếp nhận";
      }
      if (ch.op === "delete") return anyPerm(s, "feedback.manage") ? null : NO_PERM;
      if (!anyFeedbackPerm(s)) return NO_PERM;
      return onlyChanged(ch, ["status", "assigned_account_id"]) ? null : "cán bộ chỉ được đổi trạng thái/người xử lý, không sửa nội dung phản ánh";
    },
    keepOnUpdate: ["access_token", "is_spam"],
  },
  feedbackMessages: {
    label: "Trao đổi phản ánh",
    async check(ch, env) {
      const s = env.subject;
      if (ch.op === "insert") {
        const n = ch.next!;
        if (n.sender_type === "STAFF") return anyFeedbackPerm(s) ? null : NO_PERM;
        // Tin của người gửi: kèm phản ánh mới tạo trong cùng lô, hoặc phản ánh do chính mình gửi
        if (env.isNew("feedbacks", n.feedback_id)) return null;
        const fb = await env.row("feedbacks", n.feedback_id);
        return fb && isSelf(s, fb.sender_account_id) ? null : "chỉ người gửi phản ánh được nhắn với tư cách người gửi";
      }
      if (ch.op === "delete") return anyPerm(s, "feedback.manage") ? null : NO_PERM;
      return "tin nhắn đã gửi không được sửa";
    },
    setOnInsert: { sender_account_id: (s, n) => (n.sender_type === "STAFF" ? s.accountId : undefined) },
    keepOnUpdate: ["sender_account_id"],
  },
  emailLogs: {
    label: "Nhật ký email",
    check(ch, { subject: s }) {
      if (ch.op === "insert") {
        if (!anyFeedbackPerm(s)) return NO_PERM;
        return isSelf(s, ch.next!.sent_by_account_id) ? null : "người gửi phải là tài khoản đang đăng nhập";
      }
      // Chỉ thêm mới; riêng trạng thái gửi (delivery) do chính người gửi cập nhật sau khi SMTP trả lời
      if (ch.op === "update" && onlyChanged(ch, ["delivery"]) && allRows(ch, (r) => isSelf(s, r.sent_by_account_id))) return null;
      return "nhật ký email chỉ được thêm mới";
    },
  },

  /* ===== Tài nguyên ===== */
  resources: {
    label: "Tài nguyên",
    check(ch, { subject: s }) {
      const mgr = anyPerm(s, "resource.manage");
      // Duyệt tài nguyên do đoàn viên đóng góp
      const moderator = anyPerm(s, "contribution.review", "post.manage");
      const contributed = (r: Row) => num(r.submitted_by_account_id) !== null;
      if (ch.op === "insert") {
        const n = ch.next!;
        const myDraft = isSelf(s, n.submitted_by_account_id) && n.status === "DRAFT" && n.is_public !== true && isOwnOrg(s, n.published_by_org_unit_id);
        if (myDraft || (mgr && inScope(s, n.published_by_org_unit_id))) return null;
        return mgr ? OUT_OF_SCOPE : NO_PERM;
      }
      const manageable = (r: Row) => (mgr || (moderator && contributed(r))) && inScope(s, r.published_by_org_unit_id);
      if (allRows(ch, manageable)) return null;
      // Ai cũng tăng được lượt tải khi bấm tải về
      if (ch.op === "update" && onlyChanged(ch, ["download_count"])) {
        const d = (num(ch.next!.download_count) ?? 0) - (num(ch.old!.download_count) ?? 0);
        if (d > 0 && d <= 100) return null;
      }
      return mgr || moderator ? OUT_OF_SCOPE : NO_PERM;
    },
  },

  /* ===== Cấu hình hệ thống ===== */
  settings: {
    label: "Cấu hình hệ thống",
    check(ch, { subject: s }) {
      if (ch.op === "delete") return "không xoá cấu hình qua đồng bộ";
      if (s.role === "QUAN_TRI_TW" && anyPerm(s, "system.settings")) return null;
      // Danh sách hoạt động mở điểm danh (attendance_open_ids) do đơn vị bật/tắt TỪNG hoạt động qua
      // POST /api/diem-danh/mo-dong (nguyên tử, kiểm phạm vi) — ghi cả chuỗi qua đây sẽ đè lẫn nhau
      return "chỉ Quản trị Trung ương được sửa cấu hình hệ thống";
    },
  },

  /* ===== Diễn đàn ===== */
  forumThreads: forumViaApiPolicy("Bài viết diễn đàn"),
  forumComments: forumViaApiPolicy("Bình luận diễn đàn"),

  /* ===== Học sinh 3 tốt ===== */
  hs3tProfiles: {
    label: "Hồ sơ Học sinh 3 tốt",
    check(ch, { subject: s }) {
      const reviewer = anyPerm(s, "hs3t.review");
      if (ch.op === "insert") {
        const n = ch.next!;
        if (isSelf(s, n.account_id) && isOwnOrg(s, n.school_org_unit_id) && n.awarded_level == null) return null;
        return reviewer && inScope(s, n.school_org_unit_id) ? null : "chỉ được tạo hồ sơ của chính mình";
      }
      if (!reviewer) return NO_PERM;
      if (!allRows(ch, (r) => inScope(s, r.school_org_unit_id))) return OUT_OF_SCOPE;
      if (ch.op === "update" && ch.changed.includes("awarded_by_account_id") && !isSelf(s, ch.next!.awarded_by_account_id)) {
        return "người chốt danh hiệu phải là tài khoản đang đăng nhập";
      }
      return null;
    },
  },
  hs3tAchievements: {
    label: "Thành tích Học sinh 3 tốt",
    async check(ch, env) {
      const s = env.subject;
      const profiles = await Promise.all(rowsOf(ch).map((r) => env.row("hs3tProfiles", r.profile_id)));
      if (profiles.some((p) => !p)) return "không tìm thấy hồ sơ";
      if (ch.op === "insert") {
        if (!isSelf(s, ch.next!.added_by_account_id)) return "người bổ sung phải là tài khoản đang đăng nhập";
        const p = profiles[0]!;
        // Chủ hồ sơ tự thêm, hoặc cán bộ trường/cấp trên bổ sung hộ hồ sơ trong phạm vi
        return isSelf(s, p.account_id) || inScope(s, p.school_org_unit_id) ? null : OUT_OF_SCOPE;
      }
      if (!anyPerm(s, "hs3t.review")) return NO_PERM;
      return profiles.every((p) => inScope(s, p!.school_org_unit_id)) ? null : OUT_OF_SCOPE;
    },
  },
  hs3tUnitStandards: {
    label: "Tiêu chuẩn Học sinh 3 tốt của đơn vị",
    check(ch, { subject: s }) {
      if (!allRows(ch, (r) => inScope(s, r.org_unit_id))) return OUT_OF_SCOPE;
      if (ch.op !== "delete" && !isSelf(s, ch.next!.confirmed_by_account_id)) return "người xác nhận phải là tài khoản đang đăng nhập";
      return null;
    },
  },

  /* ===== Thi trực tuyến ===== */
  quizQuestions: {
    label: "Ngân hàng câu hỏi",
    check: (_ch, { subject: s }) => (anyPerm(s, "quiz.manage") ? null : NO_PERM),
  },
  quizExams: {
    label: "Đề thi",
    check(ch, { subject: s }) {
      if (!anyPerm(s, "quiz.manage")) return NO_PERM;
      if (ch.op === "insert" && !isSelf(s, ch.next!.created_by_account_id)) return "người tạo đề phải là tài khoản đang đăng nhập";
      return null;
    },
    keepOnUpdate: ["created_by_account_id"],
  },
  quizAttempts: {
    label: "Bài thi",
    check(ch, { subject: s }) {
      const grader = anyPerm(s, "quiz.manage", "quiz.result");
      if (ch.op === "insert") {
        const n = ch.next!;
        if (!isSelf(s, n.account_id)) return "chỉ được làm bài dưới tài khoản của mình";
        return n.status === "GRADED" || num(n.graded_by_account_id) !== null || num(n.manual_points) !== null
          ? "không được tự chấm bài thi"
          : null;
      }
      if (ch.op === "delete") return grader ? null : NO_PERM;
      if (grader && onlyChanged(ch, ["manual_points", "status", "graded_by_account_id"])) {
        return isSelf(s, ch.next!.graded_by_account_id) ? null : "người chấm phải là tài khoản đang đăng nhập";
      }
      // Thí sinh nộp bài của chính mình (đang làm → đã nộp)
      if (
        allRows(ch, (r) => isSelf(s, r.account_id)) &&
        ch.old!.status === "IN_PROGRESS" &&
        (ch.next!.status === "IN_PROGRESS" || ch.next!.status === "SUBMITTED") &&
        onlyChanged(ch, ["answers", "trail", "auto_score", "max_score", "status", "submitted_at"])
      ) {
        return null;
      }
      return "chỉ thí sinh nộp bài của mình hoặc cán bộ có quyền chấm";
    },
  },

  /* ===== Cộng đồng ===== */
  volunteerProjects: {
    label: "Dự án tình nguyện",
    check(ch, { subject: s }) {
      const mgr = anyPerm(s, "project.manage");
      if (ch.op === "insert") {
        const n = ch.next!;
        if (mgr && inScope(s, n.org_unit_id)) return null;
        if (!isSelf(s, n.submitted_by_account_id)) return "người gửi phải là tài khoản đang đăng nhập";
        if (!inScope(s, n.org_unit_id)) return OUT_OF_SCOPE;
        return n.status === "PENDING" && num(n.moderated_by_account_id) === null ? null : "dự án mới phải chờ duyệt";
      }
      if (!mgr) return NO_PERM;
      return allRows(ch, (r) => inScope(s, r.org_unit_id)) ? null : OUT_OF_SCOPE;
    },
  },
  orgDirectories: {
    label: "Danh bạ đơn vị",
    check(ch, { subject: s }) {
      if (!allRows(ch, (r) => inScope(s, r.org_unit_id))) return "chỉ được cập nhật danh bạ đơn vị mình và cấp dưới";
      if (ch.op !== "delete" && !isSelf(s, ch.next!.updated_by_account_id)) return "người cập nhật phải là tài khoản đang đăng nhập";
      return null;
    },
  },
  memberContributions: {
    label: "Bài đóng góp của đoàn viên",
    check(ch, { subject: s }) {
      if (ch.op === "insert") {
        const n = ch.next!;
        if (!isSelf(s, n.contributor_account_id)) return "chỉ được gửi bài dưới tài khoản của mình";
        return n.status === "PENDING" ? null : "bài đóng góp mới phải chờ duyệt";
      }
      return anyPerm(s, "contribution.review", "post.manage") ? null : NO_PERM;
    },
  },
  contributions: {
    label: "Điểm đóng góp",
    check(ch, { subject: s }) {
      if (ch.op !== "insert") return "điểm đóng góp đã ghi không được sửa/xoá";
      const n = ch.next!;
      const kind = String(n.contribution_kind) as keyof typeof CONTRIBUTION_POINTS;
      const permsByKind: Record<string, string[]> = {
        POST: ["contribution.review", "post.manage"],
        RESOURCE: ["contribution.review", "post.manage", "resource.manage"],
        PROJECT: ["project.manage"],
        HS3T: ["hs3t.review"],
      };
      if (!permsByKind[kind] || !anyPerm(s, ...permsByKind[kind])) return "chỉ cán bộ duyệt nội dung tương ứng mới được cộng điểm";
      if (isSelf(s, n.account_id)) return "không được tự cộng điểm cho mình";
      return num(n.points) === CONTRIBUTION_POINTS[kind] ? null : "số điểm không đúng quy định";
    },
  },
};

/** Dựng chủ thể ghi từ phiên + danh sách đơn vị trong phạm vi */
export function buildWriteSubject(
  session: { accountId: number; orgUnitId: number; role: string; contactPosition?: string; grantedPerms?: string[] },
  scopeIds: number[],
): WriteSubject {
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  return {
    accountId: Number(session.accountId),
    orgUnitId: Number(session.orgUnitId),
    role: session.role,
    perms,
    superAdmin: session.role === "QUAN_TRI_TW" && hasPerm(perms, "*"),
    scope: new Set(scopeIds.map(Number)),
  };
}
