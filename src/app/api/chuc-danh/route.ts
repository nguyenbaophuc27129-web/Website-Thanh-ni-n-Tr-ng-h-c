import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions, hasPerm } from "@/lib/permissions";

export const runtime = "nodejs";

/**
 * Danh mục chức danh ĐỘNG (nametag) — thêm/bớt được, KHÔNG gắn quyền cứng.
 * Quyền thật gán riêng từng tài khoản qua /api/accounts/[id]/permissions.
 */

interface ChucDanhRow {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const toDto = (r: ChucDanhRow) => ({
  id: Number(r.id),
  name: r.name,
  description: r.description ?? "",
  isActive: r.is_active,
  displayOrder: Number(r.display_order),
});

async function fullAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) return null;
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  return hasPerm(perms, "*") ? session : null;
}

/** GET /api/chuc-danh — danh sách chức danh (đăng nhập) */
export async function GET(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const rows = await query<ChucDanhRow>(
    "SELECT id, name, description, is_active, display_order FROM chuc_danh ORDER BY is_active DESC, display_order, id",
  );
  return NextResponse.json({ ok: true, items: rows.map(toDto) });
}

/** POST /api/chuc-danh — thêm chức danh mới (chỉ TW toàn quyền) */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const admin = await fullAdmin(request);
  if (!admin) return NextResponse.json({ ok: false, error: "CHỈ QUẢN TRỊ TW TOÀN QUYỀN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { name?: string; description?: string } | null;
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) return NextResponse.json({ ok: false, error: "NHẬP TÊN CHỨC DANH" }, { status: 400 });

  const dup = await query<{ id: number }>("SELECT id FROM chuc_danh WHERE lower(name) = lower($1) LIMIT 1", [name]);
  if (dup[0]) return NextResponse.json({ ok: false, error: "CHỨC DANH ĐÃ TỒN TẠI" }, { status: 409 });

  const maxOrder = await query<{ m: number | string }>("SELECT COALESCE(max(display_order), 0) AS m FROM chuc_danh");
  const rows = await query<{ id: number }>(
    "INSERT INTO chuc_danh (name, description, display_order) VALUES ($1, $2, $3) RETURNING id",
    [name, body?.description?.trim() || null, Number(maxOrder[0]?.m ?? 0) + 1],
  );
  return NextResponse.json({ ok: true, id: Number(rows[0].id) });
}

/** PATCH /api/chuc-danh — sửa tên/mô tả/ngừng dùng (?id=) */
export async function PATCH(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const admin = await fullAdmin(request);
  if (!admin) return NextResponse.json({ ok: false, error: "CHỈ QUẢN TRỊ TW TOÀN QUYỀN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as
    | { id?: number; name?: string; description?: string; isActive?: boolean }
    | null;
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const pairs: [string, unknown][] = [];
  if (typeof body?.name === "string" && body.name.trim()) {
    pairs.push(["name", body.name.trim().replace(/\s+/g, " ")]);
  }
  if (typeof body?.description === "string") {
    pairs.push(["description", body.description.trim() || null]);
  }
  if (typeof body?.isActive === "boolean") {
    pairs.push(["is_active", body.isActive]);
  }
  if (pairs.length === 0) return NextResponse.json({ ok: false, error: "KHÔNG CÓ GÌ ĐỂ CẬP NHẬT" }, { status: 400 });

  const params: unknown[] = pairs.map(([, v]) => v);
  params.push(id);
  try {
    const rows = await query<{ id: number }>(
      `UPDATE chuc_danh SET ${pairs.map(([c], i) => `${c} = $${i + 1}`).join(", ")}, updated_at = now()
       WHERE id = $${params.length} RETURNING id`,
      params,
    );
    if (!rows[0]) return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "TÊN CHỨC DANH BỊ TRÙNG" }, { status: 409 });
  }
}

/** DELETE /api/chuc-danh?id= — xoá khi KHÔNG còn tài khoản nào đang dùng */
export async function DELETE(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const admin = await fullAdmin(request);
  if (!admin) return NextResponse.json({ ok: false, error: "CHỈ QUẢN TRỊ TW TOÀN QUYỀN" }, { status: 403 });

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const row = await query<{ name: string }>("SELECT name FROM chuc_danh WHERE id = $1", [id]);
  if (!row[0]) return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY" }, { status: 404 });

  const used = await query<{ c: number | string }>(
    "SELECT count(*) AS c FROM accounts WHERE chuc_danh = $1 AND deleted_at IS NULL",
    [row[0].name],
  );
  if (Number(used[0]?.c ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, error: "ĐANG CÓ TÀI KHOẢN DÙNG CHỨC DANH NÀY — HÃY NGỪNG DÙNG THAY VÌ XOÁ" },
      { status: 409 },
    );
  }
  await query("DELETE FROM chuc_danh WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
