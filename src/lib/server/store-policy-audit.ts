import { ENTITY_SPECS } from "@/lib/server/store-tables";
import { WRITE_POLICIES } from "@/lib/server/store-write-policy";
import { ruleFor, type ReadViewer } from "@/lib/server/store-read-policy";

/**
 * CHỐT CHẶN CHÍNH SÁCH — mọi entity trong ENTITY_SPECS phải có:
 *  - luật GHI trong WRITE_POLICIES (store-write-policy.ts), và
 *  - luật ĐỌC cho từng nhóm người xem (store-read-policy.ts): khách, đoàn viên, cán bộ cấp dưới.
 *    (QUAN_TRI_TW luôn đọc toàn bộ nên không cần luật riêng.)
 *
 * Entity CỐ Ý không cho ghi / không cho một nhóm đọc thì phải khai rõ ở 2 bảng dưới đây —
 * không để ngầm định. Thêm entity mới mà quên khai → auditStorePolicies() báo lỗi:
 *  - route /api/store cảnh báo trong log khi nạp module;
 *  - `scripts/kiem-thu/kiem-chinh-sach.mts` thoát mã 1 (xem scripts/kiem-thu/README.md).
 */

/** Entity KHÔNG có luật ghi qua /api/store (mọi thao tác ghi bị từ chối) — khai tường minh */
export const WRITE_DENIED_BY_DESIGN: readonly string[] = [];

export type ReadGroup = "public" | "member" | "staff";

/** Entity cố ý KHÔNG trả cho từng nhóm người xem (không có luật đọc) */
export const READ_DENIED_BY_DESIGN: Record<ReadGroup, readonly string[]> = {
  // Khách: không thấy dữ liệu nội bộ của cán bộ hay dữ liệu cá nhân
  public: [
    "criteriaSets", "tasks", "taskMetrics", "taskAssignments", "assignmentTargets",
    "taskResults", "assignmentReviews", "scores", "reports", "documentRecipients",
    "attendances", "liveEvents", "orgDirectories",
    "notifications", "feedbacks", "feedbackMessages", "emailLogs",
    "hs3tProfiles", "hs3tAchievements", "quizAttempts", "memberContributions", "contributions",
  ],
  // Đoàn viên: như khách trừ dữ liệu của chính mình (notifications, feedbacks, hồ sơ HS3T…)
  member: [
    "criteriaSets", "tasks", "taskMetrics", "taskAssignments", "assignmentTargets",
    "taskResults", "assignmentReviews", "scores", "reports", "documentRecipients",
    "attendances", "liveEvents", "orgDirectories",
  ],
  // Cán bộ cấp dưới: STAFF_RULES phủ hết entity, không có ngoại lệ
  staff: [],
};

/** Người xem giả lập cho từng nhóm — staff có đủ quyền ("*") để các luật điều kiện không trả null */
function viewerOf(group: ReadGroup): ReadViewer {
  const base: ReadViewer = {
    scope: "public", accountId: null, role: null, orgUnitId: null, isTW: false,
    perms: [], tree: [], provinceKey: "", openActivityIds: [],
  };
  if (group === "member") {
    return { ...base, scope: "member", accountId: 1, role: "DOAN_VIEN", orgUnitId: 1 };
  }
  if (group === "staff") {
    return { ...base, scope: "full", accountId: 1, role: "QUAN_TRI_TINH", orgUnitId: 1, perms: ["*"], tree: [1] };
  }
  return base;
}

/** Trả danh sách lỗi (rỗng = đủ chính sách) */
export function auditStorePolicies(): string[] {
  const errors: string[] = [];
  const entities = Object.keys(ENTITY_SPECS);
  const known = new Set(entities);

  const checkDeclared = (label: string, names: readonly string[]) => {
    for (const n of names) if (!known.has(n)) errors.push(`${label}: khai entity không tồn tại "${n}"`);
  };

  // --- Ghi ---
  checkDeclared("WRITE_DENIED_BY_DESIGN", WRITE_DENIED_BY_DESIGN);
  for (const n of Object.keys(WRITE_POLICIES)) {
    if (!known.has(n)) errors.push(`WRITE_POLICIES: có luật cho entity không tồn tại "${n}"`);
  }
  for (const e of entities) {
    const has = !!WRITE_POLICIES[e];
    const denied = WRITE_DENIED_BY_DESIGN.includes(e);
    if (!has && !denied) errors.push(`GHI: "${e}" chưa có luật trong WRITE_POLICIES (hoặc khai vào WRITE_DENIED_BY_DESIGN)`);
    if (has && denied) errors.push(`GHI: "${e}" vừa có luật ghi vừa khai không cho ghi`);
  }

  // --- Đọc ---
  for (const group of ["public", "member", "staff"] as const) {
    checkDeclared(`READ_DENIED_BY_DESIGN.${group}`, READ_DENIED_BY_DESIGN[group]);
    const viewer = viewerOf(group);
    for (const e of entities) {
      const has = ruleFor(e, viewer) !== null;
      const denied = READ_DENIED_BY_DESIGN[group].includes(e);
      if (!has && !denied) {
        errors.push(
          `ĐỌC (${group}): "${e}" chưa có luật đọc — khai luật trong store-read-policy.ts` +
            (group === "staff" ? " (STAFF_RULES)" : " (PUBLIC/MEMBER_READ_ENTITIES + luật)") +
            " hoặc khai vào READ_DENIED_BY_DESIGN",
        );
      }
      if (has && denied) errors.push(`ĐỌC (${group}): "${e}" vừa có luật đọc vừa khai không cho đọc`);
    }
  }
  return errors;
}
