import { query } from "@/lib/db";
import { ACCOUNT_ADMIN_ROLES } from "@/lib/permissions";

/**
 * Thẩm quyền đoàn cấp trên khi tác động lên tài khoản NGƯỜI KHÁC — dùng chung cho sửa/xoá
 * (/api/accounts/[id]) và phân quyền (/api/accounts/[id]/permissions).
 * Trả về thông điệp lỗi nếu không đủ thẩm quyền, null nếu được phép.
 */
export async function accountScopeDenial(
  actor: { role: string; orgUnitId: number },
  target: { role_code: string; org_unit_id: number },
  verb: string,
): Promise<string | null> {
  if (!ACCOUNT_ADMIN_ROLES.includes(actor.role)) return `BẠN KHÔNG CÓ QUYỀN ${verb} TÀI KHOẢN KHÁC`;
  // Chỉ QUAN_TRI_TW mới được tác động lên tài khoản QUAN_TRI_TW khác
  if (actor.role === "QUAN_TRI_TW") return null;
  if (target.role_code === "QUAN_TRI_TW") return `BẠN KHÔNG CÓ QUYỀN ${verb} TÀI KHOẢN CẤP TRUNG ƯƠNG`;
  if (actor.role === "QUAN_TRI_CAP3" && target.role_code === "QUAN_TRI_TINH") {
    return `QUẢN TRỊ CẤP 3 KHÔNG THỂ ${verb} TÀI KHOẢN CẤP TỈNH`;
  }
  // Cấp tỉnh và cấp 3 chỉ được tác động tài khoản thuộc cây đơn vị của mình (path dạng /1/100/)
  if (Number(target.org_unit_id) === Number(actor.orgUnitId)) return null;
  const rows = await query<{ id: number; path: string }>(
    "SELECT id, path FROM org_units WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL",
    [[actor.orgUnitId, target.org_unit_id]],
  );
  const callerPath = rows.find((r) => Number(r.id) === Number(actor.orgUnitId))?.path;
  const targetPath = rows.find((r) => Number(r.id) === Number(target.org_unit_id))?.path;
  if (!callerPath || !targetPath || !targetPath.startsWith(callerPath)) {
    return "TÀI KHOẢN NẰM NGOÀI PHẠM VI QUẢN LÝ CỦA BẠN";
  }
  return null;
}
