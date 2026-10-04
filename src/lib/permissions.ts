import { ROLE_PERMISSIONS } from "@/types";
import { chucDanhQuyenList } from "@/data/chuc-danh-quyen";

/** Đối tượng xét quyền: tài khoản đang đăng nhập hoặc form tạo tài khoản */
export interface PermissionSubject {
  role: string;
  contactPosition?: string;
}

/** Tìm cấu hình chức danh khớp contactPosition (bỏ qua chênh lệch khoảng trắng) */
export function chucDanhOf(position?: string) {
  const p = position?.trim().replace(/\s+/g, " ");
  if (!p) return undefined;
  return chucDanhQuyenList.find((c) => c.ten.replace(/\s+/g, " ") === p);
}

/**
 * Quyền hiệu lực của một tài khoản:
 * - Tài khoản THUỘC QUYỀN TW (role QUAN_TRI_TW) mà contactPosition khớp bảng
 *   "Phân quyền theo chức danh TW" → CHỈ có đúng quyền đó (toanQuyen → "*", ngược lại → danh sách cụ thể).
 * - Còn lại (kể cả tài khoản cơ sở vô tình ghi trùng tên chức danh) → quyền theo vai trò đơn vị.
 * Nguyên tắc: đơn vị cơ sở (tỉnh / xã-phường / trường) dùng 01 tài khoản dùng chung,
 * CHỈ TW mới được gán chức danh cho tài khoản cán bộ của mình.
 */
export function effectivePermissions(subject: PermissionSubject): string[] {
  if (subject.role === "QUAN_TRI_TW") {
    const cd = chucDanhOf(subject.contactPosition);
    if (cd) return cd.toanQuyen ? ["*"] : cd.quyen.map((q) => q.code);
  }
  return ROLE_PERMISSIONS[subject.role] ?? [];
}

export const hasPerm = (perms: string[], code: string) =>
  perms.includes("*") || perms.includes(code);
