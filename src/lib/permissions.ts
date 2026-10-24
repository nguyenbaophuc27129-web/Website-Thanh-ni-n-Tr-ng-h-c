import { ROLE_PERMISSIONS } from "@/types";
import { chucDanhQuyenList } from "@/data/chuc-danh-quyen";
import { permissionsList } from "@/data/org-units";

/** Đối tượng xét quyền: tài khoản đang đăng nhập hoặc form tạo tài khoản */
export interface PermissionSubject {
  role: string;
  contactPosition?: string;
  /**
   * Quyền gán RIÊNG theo tài khoản (bảng account_permissions — cấp trên tick).
   * Có danh sách này thì DÙNG THAY quyền mặc định: tick mục nào xem mục đó.
   */
  grantedPerms?: string[];
}

/** Tìm cấu hình chức danh khớp contactPosition (bỏ qua chênh lệch khoảng trắng) */
export function chucDanhOf(position?: string) {
  const p = position?.trim().replace(/\s+/g, " ");
  if (!p) return undefined;
  return chucDanhQuyenList.find((c) => c.ten.replace(/\s+/g, " ") === p);
}

/**
 * Quyền hiệu lực của một tài khoản, theo thứ tự ưu tiên:
 * 1. grantedPerms — quyền cấp trên gán riêng trong bảng account_permissions (tick mục nào xem mục đó);
 * 2. Chức danh TW khớp bảng phân quyền tĩnh (tương thích dữ liệu cũ, sẽ dần thay bằng grantedPerms);
 * 3. Quyền mặc định theo vai trò đơn vị (ROLE_PERMISSIONS).
 */
export function effectivePermissions(subject: PermissionSubject): string[] {
  if (subject.grantedPerms && subject.grantedPerms.length > 0) {
    return subject.grantedPerms;
  }
  if (subject.role === "QUAN_TRI_TW") {
    const cd = chucDanhOf(subject.contactPosition);
    if (cd) return cd.toanQuyen ? ["*"] : cd.quyen.map((q) => q.code);
  }
  return ROLE_PERMISSIONS[subject.role] ?? [];
}

export const hasPerm = (perms: string[], code: string) =>
  perms.includes("*") || perms.includes(code);

/* =====================================================================
 * DANH MỤC CHỨC NĂNG PHÂN QUYỀN — gom permissionsList thành các nhóm
 * hiển thị trên trang "Phân quyền nhiệm vụ" của từng tài khoản.
 * Nguồn chức năng: Copy of Book1.xlsx (Ban TNTH cung cấp).
 * ===================================================================== */
export interface PermCatalogGroup {
  module: string;
  hint: string;
  codes: string[];
}

export const PERM_CATALOG: PermCatalogGroup[] = [
  {
    module: "Hoạt động & Nhiệm vụ",
    hint: "Quản lý hoạt động Đoàn, giao nhiệm vụ/chỉ tiêu và xác nhận kết quả",
    codes: ["activity.view", "activity.create", "activity.review", "task.assign", "task.update", "task.review"],
  },
  {
    module: "Thi đua & Xếp hạng",
    hint: "Chấm điểm thi đua, lập/quản lý báo cáo, chốt kỳ xếp hạng",
    codes: ["score.view", "score.manage", "report.create", "report.manage", "ranking.manage"],
  },
  {
    module: "Truyền thông & Xuất bản",
    hint: "Tin tức, xuất bản bài, văn bản, tài nguyên",
    codes: ["post.manage", "post.publish", "document.issue", "document.view", "resource.manage", "resource.view"],
  },
  {
    module: "Diễn đàn & Cộng đồng",
    hint: "Diễn đàn ẩn danh, dự án tình nguyện vì cộng đồng, duyệt đóng góp của Đoàn viên",
    codes: ["forum.interact", "forum.manage", "project.manage", "contribution.review"],
  },
  {
    module: "Phản ánh, kiến nghị của Học sinh THPT",
    hint: "Xem thông tin chi tiết, trả lời và xử lý phản ánh/kiến nghị",
    codes: ["feedback.view", "feedback.reply", "feedback.manage"],
  },
  {
    module: "Học sinh 3 tốt",
    hint: "Xem, thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt",
    codes: ["hs3t.view", "hs3t.review"],
  },
  {
    module: "Thi trực tuyến",
    hint: "Tạo đề thi và xem kết quả thi trực tuyến",
    codes: ["quiz.manage", "quiz.result"],
  },
  {
    module: "Hệ thống",
    hint: "Cây đơn vị tổ chức, tài khoản, phân quyền, cấu hình",
    codes: ["system.orgtree.view", "system.account.manage", "system.settings"],
  },
];

/** Tên hiển thị của 1 mã quyền (tra từ permissionsList) */
export const permNameOf = (code: string) =>
  permissionsList.find((p) => p.code === code)?.name ?? code;

/**
 * Gợi ý quyền theo chức danh (Copy of Book1.xlsx) — CHỈ dùng để NÚT "Áp dụng gợi ý"
 * prefill form phân quyền, KHÔNG tự gán: chức danh là thẻ tên động, quyền do cấp trên tick.
 */
export const PERM_SUGGESTIONS: Record<string, string[]> = {
  "Bí thư thứ nhất Trung ương Đoàn": ["*"],
  "Bí thư Thường trực Trung ương Đoàn": ["*"],
  "Bí thư Ban Bí thư": ["*"],
  "Phó Trưởng Ban Công tác Thanh thiếu nhi phụ trách Web": ["*"],
  "Chuyên viên phụ trách chính Web": ["*"],
  "Trưởng Ban Biên tập": ["*"],
  "Phó Trưởng Ban Biên tập": ["*"],
  "Trưởng Ban Công tác Thanh thiếu nhi": ["activity.view", "activity.review", "task.assign", "task.review", "score.manage", "report.manage", "ranking.manage", "document.issue", "feedback.manage", "resource.manage", "quiz.result", "system.orgtree.view"],
  "Trưởng Ban Công tác Đoàn": ["activity.view", "activity.review", "task.assign", "task.review", "score.manage", "report.manage", "ranking.manage", "document.issue", "feedback.manage", "resource.manage", "quiz.result", "system.orgtree.view"],
  "Phó Trưởng Ban Công tác Thanh thiếu nhi": ["activity.view", "activity.review", "task.assign", "task.review", "score.manage", "report.manage", "ranking.manage", "document.issue", "feedback.manage", "resource.manage", "quiz.result", "system.orgtree.view"],
  "Phó Trưởng Ban Công tác Đoàn phụ trách công tác kiểm tra": ["forum.manage", "forum.interact", "score.manage", "post.manage", "post.publish", "feedback.view", "feedback.reply", "report.manage", "ranking.manage"],
  "Chuyên viên phụ trách công tác kiểm tra": ["feedback.view", "feedback.reply"],
  "Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt": ["hs3t.view", "hs3t.review"],
  "Thường trực Web": ["activity.view", "activity.review", "task.assign", "task.update", "task.review", "score.view", "report.manage", "post.manage", "post.publish", "document.issue", "document.view", "resource.manage", "feedback.view", "hs3t.view", "quiz.manage", "quiz.result", "forum.manage", "forum.interact", "project.manage", "contribution.review", "system.orgtree.view"],
  "CTV phụ trách chuyên mục Tin tức": ["post.manage", "post.publish", "forum.interact"],
  'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"': ["project.manage", "forum.interact"],
  'CTV hỗ trợ xét "Học sinh 3 tốt"': ["hs3t.view", "hs3t.review"],
  "Chuyên gia, nhà khoa học đồng hành Web": ["feedback.reply", "forum.interact"],
};
