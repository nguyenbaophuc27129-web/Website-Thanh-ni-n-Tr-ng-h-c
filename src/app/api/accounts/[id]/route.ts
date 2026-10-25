import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, hashPassword, type RoleCode } from "@/lib/server/auth";

export const runtime = "nodejs";

const ALLOWED_ADMIN_ROLES: RoleCode[] = [
  "QUAN_TRI_TW",
  "QUAN_TRI_TINH",
  "QUAN_TRI_CAP3",
];

type Session = NonNullable<Awaited<ReturnType<typeof sessionFromToken>>>;
interface TargetAccount {
  id: number;
  role_code: string;
  org_unit_id: number;
  username: string;
}

/** Kiểm tra phân cấp khi tác động lên tài khoản NGƯỜI KHÁC — dùng chung cho sửa (PATCH) và xoá (DELETE).
 *  Trả về response lỗi nếu không đủ thẩm quyền, null nếu được phép. */
async function checkManageScope(
  session: Session,
  target: TargetAccount,
  verb: "THAY ĐỔI" | "XÓA",
): Promise<NextResponse | null> {
  if (!ALLOWED_ADMIN_ROLES.includes(session.role as RoleCode)) {
    return NextResponse.json(
      { ok: false, error: `BẠN KHÔNG CÓ QUYỀN ${verb} TÀI KHOẢN KHÁC` },
      { status: 403 },
    );
  }
  // Chỉ QUAN_TRI_TW mới được tác động lên tài khoản QUAN_TRI_TW khác
  if (session.role === "QUAN_TRI_TW") return null;
  if (target.role_code === "QUAN_TRI_TW") {
    return NextResponse.json(
      { ok: false, error: `BẠN KHÔNG CÓ QUYỀN ${verb} TÀI KHOẢN CẤP TRUNG ƯƠNG` },
      { status: 403 },
    );
  }
  // Cấp tỉnh và cấp 3 chỉ được tác động tài khoản thuộc phạm vi cây đơn vị của mình
  if (session.role === "QUAN_TRI_CAP3" && target.role_code === "QUAN_TRI_TINH") {
    return NextResponse.json(
      { ok: false, error: `QUẢN TRỊ CẤP 3 KHÔNG THỂ ${verb} TÀI KHOẢN CẤP TỈNH` },
      { status: 403 },
    );
  }
  const callerUnits = await query<{ path: string }>(
    "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
    [session.orgUnitId],
  );
  const targetUnits = await query<{ path: string }>(
    "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
    [target.org_unit_id],
  );
  const callerPath = callerUnits[0]?.path;
  const targetPath = targetUnits[0]?.path;
  if (
    !callerPath ||
    !targetPath ||
    (!targetPath.startsWith(callerPath) && target.org_unit_id !== session.orgUnitId)
  ) {
    return NextResponse.json(
      { ok: false, error: "TÀI KHOẢN NẰM NGOÀI PHẠM VI QUẢN LÝ CỦA BẠN" },
      { status: 403 },
    );
  }
  return null;
}

/** PATCH /api/accounts/[id] — đổi trạng thái (status) hoặc sửa thông tin
 *  (contactPerson/email/phone/contactPosition/chucDanh/className).
 *  Người dùng được quyền sửa thông tin tài khoản của chính mình. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const session = token ? await sessionFromToken(token) : null;
    if (!session) {
      return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = Number(id);
    const isSelf = session.accountId === accountId;

    // Người dùng được quyền sửa thông tin của chính mình;
    // Sửa tài khoản người khác đòi hỏi vai trò quản trị.
    if (!isSelf && !ALLOWED_ADMIN_ROLES.includes(session.role as RoleCode)) {
      return NextResponse.json(
        { ok: false, error: "BẠN KHÔNG CÓ QUYỀN THAY ĐỔI TÀI KHOẢN KHÁC" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          status?: string;
          contactPerson?: string;
          email?: string;
          phone?: string;
          contactPosition?: string;
          chucDanh?: string;
          className?: string;
          password?: string;
        }
      | null;
    if (!accountId || !body) {
      return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
    }
    const status = String(body.status ?? "");
    const hasStatus = ["PENDING", "ACTIVE", "LOCKED", "DISABLED"].includes(status);
    const hasPassword = typeof body.password === "string" && body.password.trim().length > 0;
    if (hasPassword && body.password!.trim().length < 6) {
      return NextResponse.json({ ok: false, error: "MẬT KHẨU CẦN CÓ ÍT NHẤT 6 KÝ TỰ" }, { status: 400 });
    }
    const hasInfo =
      [body.contactPerson, body.email, body.phone, body.contactPosition, body.chucDanh, body.className].some(
        (v) => typeof v === "string",
      );
    if (!hasStatus && !hasInfo && !hasPassword) {
      return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
    }

    // Người dùng thông thường không thể tự thay đổi trạng thái tài khoản của chính mình;
    // Riêng quản trị viên Trung ương (QUAN_TRI_TW) được phép thay đổi trạng thái của chính mình
    if (hasStatus && isSelf && session.role !== "QUAN_TRI_TW") {
      return NextResponse.json(
        { ok: false, error: "KHÔNG THỂ TỰ THAY ĐỔI TRẠNG THÁI TÀI KHOẢN CỦA CHÍNH MÌNH" },
        { status: 400 },
      );
    }

    const targetAccounts = await query<TargetAccount>(
      "SELECT id, role_code, org_unit_id, username FROM accounts WHERE id = $1 AND deleted_at IS NULL",
      [accountId],
    );
    const target = targetAccounts[0];
    if (!target) {
      return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
    }

    // Tài khoản gốc Trung ương (id=1, tw.admin) không thể bị khóa bởi tài khoản khác
    if (hasStatus && target.id === 1 && (status === "LOCKED" || status === "DISABLED") && session.role !== "QUAN_TRI_TW") {
      return NextResponse.json(
        { ok: false, error: "KHÔNG THỂ KHÓA TÀI KHOẢN QUẢN TRỊ TRUNG ƯƠNG TỐI CAO" },
        { status: 403 },
      );
    }

    // Khi sửa tài khoản người khác: kiểm tra phân cấp quản lý
    if (!isSelf) {
      const denied = await checkManageScope(session, target, "THAY ĐỔI");
      if (denied) return denied;
    }

    if (hasInfo) {
      const pairs: [string, unknown][] = [];
      if (typeof body.contactPerson === "string") pairs.push(["contact_person", body.contactPerson.trim() || target.username]);
      if (typeof body.email === "string" && body.email.trim()) pairs.push(["email", body.email.trim()]);
      if (typeof body.phone === "string") pairs.push(["phone", body.phone.trim() || null]);
      if (typeof body.contactPosition === "string") pairs.push(["contact_position", body.contactPosition.trim() || null]);
      if (typeof body.chucDanh === "string") pairs.push(["chuc_danh", body.chucDanh.trim() || null]);
      if (typeof body.className === "string") pairs.push(["class_name", body.className.trim() || null]);
      if (pairs.length > 0) {
        const params: unknown[] = pairs.map(([, v]) => v);
        params.push(accountId);
        await query(
          `UPDATE accounts SET ${pairs.map(([c], i) => `${c} = $${i + 1}`).join(", ")}, updated_at = now()
           WHERE id = $${params.length} AND deleted_at IS NULL`,
          params,
        );
      }
    }

    if (hasStatus) {
      await query(
        `UPDATE accounts SET status = $2, locked_until = NULL, failed_login_count = 0, updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
        [accountId, status],
      );
      // Khoá/vô hiệu → thu hồi mọi phiên đăng nhập đang chạy
      if (status === "LOCKED" || status === "DISABLED") {
        await query(
          "UPDATE auth_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL",
          [accountId],
        );
      }
    }

    if (hasPassword) {
      const passwordHash = await hashPassword(body.password!.trim());
      await query(
        `UPDATE accounts SET password_hash = $2, password_changed_at = now(), updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
        [accountId, passwordHash],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ACCOUNT_UPDATE_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi cập nhật tài khoản:", message);
    return NextResponse.json({ ok: false, error: "ACCOUNT_UPDATE_FAILED" }, { status: 500 });
  }
}

/** DELETE /api/accounts/[id] — Đoàn cấp trên xóa tài khoản của cấp dưới */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const session = token ? await sessionFromToken(token) : null;
    if (!session) {
      return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = Number(id);
    if (!accountId) {
      return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
    }

    // Không thể tự xóa chính mình
    if (session.accountId === accountId) {
      return NextResponse.json({ ok: false, error: "BẠN KHÔNG THỂ TỰ XÓA TÀI KHOẢN CỦA CHÍNH MÌNH" }, { status: 400 });
    }

    // Tài khoản gốc TW (id = 1, tw.admin) không thể bị xóa
    if (accountId === 1) {
      return NextResponse.json({ ok: false, error: "KHÔNG THỂ XÓA TÀI KHOẢN QUẢN TRỊ TRUNG ƯƠNG TỐI CAO" }, { status: 403 });
    }

    const targetAccounts = await query<TargetAccount>(
      "SELECT id, role_code, org_unit_id, username FROM accounts WHERE id = $1 AND deleted_at IS NULL",
      [accountId],
    );
    const target = targetAccounts[0];
    if (!target) {
      return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
    }

    // Kiểm tra thẩm quyền đoàn cấp trên: phải là quản trị và tài khoản nằm trong phạm vi quản lý
    const denied = await checkManageScope(session, target, "XÓA");
    if (denied) return denied;

    // Xóa mềm: đánh dấu deleted_at = now() và thu hồi các phiên đăng nhập đang hoạt động
    await query(
      "UPDATE accounts SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL",
      [accountId],
    );
    await query(
      "UPDATE auth_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL",
      [accountId],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ACCOUNT_DELETE_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi xóa tài khoản:", message);
    return NextResponse.json({ ok: false, error: "ACCOUNT_DELETE_FAILED" }, { status: 500 });
  }
}
