import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions, hasPerm, permNameOf } from "@/lib/permissions";
import { accountScopeDenial } from "@/lib/server/account-scope";
import { writeAuditLogs } from "@/lib/server/audit";
import { clientIpOf } from "@/lib/server/client-ip";
import { permissionsList } from "@/data/org-units";
import { ROLE_PERMISSIONS } from "@/types";

export const runtime = "nodejs";

/**
 * Quyền RIÊNG của 1 tài khoản (bảng account_permissions):
 * - GET: xem các quyền được gán.
 * - PUT: cấp trên phân quyền trực tiếp — tick mục nào xem mục đó (luật ở grantScopeDenial + PUT).
 *   Danh sách rỗng = xoá hết quyền riêng → trở lại quyền mặc định theo vai trò.
 */

async function callerPerms(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session || !dbEnabled()) return null;
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  return { session, perms };
}

type Caller = NonNullable<Awaited<ReturnType<typeof callerPerms>>>;
interface TargetAccount {
  id: number;
  org_unit_id: number;
  role_code: string;
  contact_position: string | null;
}

async function loadTarget(accountId: number): Promise<TargetAccount | undefined> {
  const rows = await query<TargetAccount>(
    "SELECT id, org_unit_id, role_code, contact_position FROM accounts WHERE id = $1 AND deleted_at IS NULL",
    [accountId],
  );
  return rows[0];
}

/**
 * Ai được xem/sửa quyền riêng của `target` (null = được, chuỗi = lý do từ chối):
 * - Có toàn quyền (`*`): mọi tài khoản, kể cả chính mình.
 * - Có `system.account.manage`: tài khoản trong phạm vi quản lý (cùng luật sửa/xoá tài khoản),
 *   KHÔNG tự phân quyền cho chính mình. Quyền được thêm/bớt còn bị giới hạn ở PUT.
 * Trước đây có `system.account.manage` là được coi như toàn quyền → tài khoản Tỉnh
 * (vai trò mặc định có quyền này) tự gán `*` cho mình.
 */
async function grantScopeDenial(ctx: Caller, target: TargetAccount): Promise<string | null> {
  if (hasPerm(ctx.perms, "*")) return null;
  if (!hasPerm(ctx.perms, "system.account.manage")) return "BẠN KHÔNG CÓ QUYỀN PHÂN QUYỀN TÀI KHOẢN";
  if (Number(target.id) === ctx.session.accountId) return "BẠN KHÔNG THỂ TỰ PHÂN QUYỀN CHO CHÍNH MÌNH";
  return accountScopeDenial(ctx.session, target, "PHÂN QUYỀN");
}

/** GET /api/accounts/[id]/permissions */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const ctx = await callerPerms(request);
  if (!ctx) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!accountId) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  // Quyền gán riêng là thông tin quản trị: chỉ xem của chính mình, hoặc của tài khoản mình
  // được phân quyền — không cho tài khoản bất kỳ dò id.
  if (ctx.session.accountId !== accountId) {
    const target = await loadTarget(accountId);
    if (!target) return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
    const denial = await grantScopeDenial(ctx, target);
    if (denial) return NextResponse.json({ ok: false, error: denial }, { status: 403 });
  }

  const rows = await query<{ perm_code: string }>(
    "SELECT perm_code FROM account_permissions WHERE account_id = $1 ORDER BY perm_code",
    [accountId],
  );
  return NextResponse.json({ ok: true, perms: rows.map((r) => r.perm_code) });
}

/** PUT /api/accounts/[id]/permissions — body { perms: string[] } */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const ctx = await callerPerms(request);
  if (!ctx) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!accountId) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { perms?: unknown } | null;
  const perms = Array.isArray(body?.perms) ? [...new Set(body.perms.map(String))] : [];
  const validCodes = new Set(permissionsList.map((p) => p.code));
  if (perms.some((p) => p !== "*" && !validCodes.has(p))) {
    return NextResponse.json({ ok: false, error: "CÓ MÃ QUYỀN KHÔNG HỢP LỆ" }, { status: 400 });
  }

  const target = await loadTarget(accountId);
  if (!target) return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
  const denial = await grantScopeDenial(ctx, target);
  if (denial) return NextResponse.json({ ok: false, error: denial }, { status: 403 });

  const current = (
    await query<{ perm_code: string }>("SELECT perm_code FROM account_permissions WHERE account_id = $1", [accountId])
  ).map((r) => r.perm_code);

  // Không có toàn quyền: chỉ được THÊM/BỚT quyền mình đang có hoặc quyền mặc định của vai trò
  // người được gán (để còn khôi phục mặc định); không bao giờ được động tới `*`.
  // So trên quyền HIỆU LỰC trước/sau (danh sách rỗng = về mặc định theo vai trò).
  if (!hasPerm(ctx.perms, "*")) {
    const subject = { role: target.role_code, contactPosition: target.contact_position ?? undefined };
    const before = new Set(effectivePermissions({ ...subject, grantedPerms: current }));
    const after = new Set(effectivePermissions({ ...subject, grantedPerms: perms }));
    const grantable = new Set([...ctx.perms, ...(ROLE_PERMISSIONS[target.role_code] ?? [])]);
    const changed = [...before].filter((p) => !after.has(p)).concat([...after].filter((p) => !before.has(p)));
    const forbidden = changed.filter((p) => p === "*" || !grantable.has(p));
    if (forbidden.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `BẠN KHÔNG ĐƯỢC THÊM/BỚT QUYỀN MÌNH KHÔNG CÓ: ${forbidden.map((p) => (p === "*" ? "Toàn quyền (*)" : permNameOf(p))).join(", ")}`,
        },
        { status: 403 },
      );
    }
  }

  await withTransaction(async (client) => {
    await client.query("DELETE FROM account_permissions WHERE account_id = $1", [accountId]);
    for (const code of perms) {
      await client.query(
        "INSERT INTO account_permissions (account_id, perm_code, granted_by_account_id) VALUES ($1, $2, $3)",
        [accountId, code, ctx.session.accountId],
      );
    }
    await writeAuditLogs(
      client,
      [
        {
          accountId: ctx.session.accountId,
          action: "ACCOUNT_PERMISSIONS_SET",
          entityType: "account_permissions",
          entityId: accountId,
          oldValues: { perms: current },
          newValues: { perms },
          ip: clientIpOf(request),
          userAgent: request.headers.get("user-agent"),
        },
      ],
      "PERMISSIONS",
    );
  });

  return NextResponse.json({ ok: true, perms });
}
