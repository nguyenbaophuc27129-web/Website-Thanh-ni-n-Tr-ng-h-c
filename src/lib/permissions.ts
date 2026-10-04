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
 * - contactPosition khớp bảng "Phân quyền theo chức danh TW" → CHỈ có đúng quyền đó
 *   (toanQuyen = true → "*", false → danh sách quyền cụ thể).
 * - Không khớp chức danh nào → quyền theo vai trò đơn vị (ROLE_PERMISSIONS).
 * Áp dụng cho mọi nguồn tài khoản: đăng ký công khai, tạo thủ công, nhập từ file.
 */
export function effectivePermissions(subject: PermissionSubject): string[] {
  const cd = chucDanhOf(subject.contactPosition);
  if (cd) return cd.toanQuyen ? ["*"] : cd.quyen.map((q) => q.code);
  return ROLE_PERMISSIONS[subject.role] ?? [];
}

export const hasPerm = (perms: string[], code: string) =>
  perms.includes("*") || perms.includes(code);
