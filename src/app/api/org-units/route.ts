import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import type { OrgBlock } from "@/types";

export const runtime = "nodejs";

const VALID_BLOCKS: OrgBlock[] = ["DAN_CU", "TRUONG_HOC", "CO_QUAN", "VU_TRANG"];

/** Tài khoản TW hoặc Tỉnh có quyền sửa cây tổ chức */
async function getOrgAdminSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) return null;
  if (session.role === "QUAN_TRI_TW") return session;
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  if (hasPerm(perms, "*") || hasPerm(perms, "system.orgtree.manage") || hasPerm(perms, "system.orgtree.view")) {
    return session;
  }
  if (session.role === "QUAN_TRI_TINH") return session;
  return null;
}

type UnitRow = {
  id: number | string;
  parent_id: number | string | null;
  code: string;
  name: string;
  short_name: string | null;
  org_level: number;
  org_block: string | null;
  address: string | null;
  is_active: boolean;
  admin_unit_name: string | null;
  school_type_name: string | null;
};

function toUnit(r: UnitRow) {
  return {
    id: Number(r.id),
    parentId: r.parent_id === null ? null : Number(r.parent_id),
    code: r.code,
    name: r.name,
    shortName: r.short_name ?? r.name,
    orgLevel: Number(r.org_level) as 1 | 2 | 3 | 4 | 5,
    block: (r.org_block as OrgBlock | null) ?? undefined,
    adminUnitName: r.admin_unit_name ?? "",
    schoolTypeName: r.school_type_name ?? undefined,
    address: r.address ?? undefined,
    isActive: r.is_active,
  };
}

/** GET /api/org-units — danh sách đơn vị đang sống + loại trường */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const rows = await query<UnitRow>(
    `SELECT o.id, o.parent_id, o.code, o.name, o.short_name, o.org_level, o.org_block,
            o.address, o.is_active, au.name AS admin_unit_name, st.name AS school_type_name
       FROM org_units o
       LEFT JOIN admin_units au ON au.id = o.admin_unit_id
       LEFT JOIN school_types st ON st.id = o.school_type_id
      WHERE o.deleted_at IS NULL
      ORDER BY o.path`
  );
  return NextResponse.json({ ok: true, units: rows.map(toUnit) });
}

/** Tìm admin_unit theo tên (không phân biệt hoa thường), chưa có thì tạo mới */
async function adminUnitIdOf(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const found = await query<{ id: number }>("SELECT id FROM admin_units WHERE lower(name) = lower($1) LIMIT 1", [trimmed]);
  if (found.length > 0) return Number(found[0].id);
  const created = await query<{ id: number }>(
    "INSERT INTO admin_units (code, name, unit_type) VALUES ($1, $2, 'PROVINCE') RETURNING id",
    [`AU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, trimmed]
  );
  return Number(created[0].id);
}

/** Mã đơn vị duy nhất từ tên (slug không dấu + hậu tố ngẫu nhiên) */
async function generateCode(name: string): Promise<string> {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 18);
  for (let i = 0; i < 10; i++) {
    const candidate = `${slug || "DV"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const dup = await query<{ id: number }>("SELECT id FROM org_units WHERE code = $1 LIMIT 1", [candidate]);
    if (dup.length === 0) return candidate;
  }
  return `DV-${Date.now().toString(36).toUpperCase()}`;
}

/** POST /api/org-units — thêm đơn vị mới: { parentId, name, orgLevel, block?, shortName?, adminUnitName?, schoolTypeName?, address? } */
export async function POST(request: NextRequest) {
  const admin = await getOrgAdminSession(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN SỬA CÂY TỔ CHỨC" }, { status: 403 });
  }
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as
    | {
        parentId?: number;
        name?: string;
        shortName?: string;
        orgLevel?: number;
        block?: string;
        adminUnitName?: string;
        schoolTypeName?: string;
        address?: string;
      }
    | null;
  const name = body?.name?.trim() ?? "";
  const parentId = Number(body?.parentId);
  const orgLevel = Number(body?.orgLevel);
  if (!name || !Number.isInteger(parentId) || ![2, 3, 4, 5].includes(orgLevel)) {
    return NextResponse.json({ ok: false, error: "Thiếu tên, đơn vị cấp trên hoặc cấp tổ chức." }, { status: 400 });
  }
  const block = VALID_BLOCKS.includes(body?.block as OrgBlock) ? (body?.block as OrgBlock) : null;

  const parents = await query<{ id: number; org_level: number; path: string; depth: number }>(
    "SELECT id, org_level, path, depth FROM org_units WHERE id = $1 AND deleted_at IS NULL",
    [parentId]
  );
  const parent = parents[0];
  if (!parent) return NextResponse.json({ ok: false, error: "Đơn vị cấp trên không tồn tại." }, { status: 400 });
  if (orgLevel <= Number(parent.org_level)) {
    return NextResponse.json({ ok: false, error: "Cấp tổ chức mới phải THẤP hơn đơn vị cấp trên." }, { status: 400 });
  }

  // Tỉnh Đoàn chỉ được tạo cấp dưới trong phạm vi tỉnh mình
  if (admin.role === "QUAN_TRI_TINH") {
    if (parentId !== admin.orgUnitId && !parent.path.startsWith(`/1/${admin.orgUnitId}/`)) {
      return NextResponse.json({ ok: false, error: "Bạn chỉ được tạo đơn vị cấp dưới trong địa bàn tỉnh của mình." }, { status: 403 });
    }
  }

  try {
    const adminUnitId = body?.adminUnitName ? await adminUnitIdOf(body.adminUnitName) : null;
    let schoolTypeId: number | null = null;
    if (orgLevel === 4 && body?.schoolTypeName?.trim()) {
      const st = await query<{ id: number }>("SELECT id FROM school_types WHERE lower(name) = lower($1) LIMIT 1", [body.schoolTypeName.trim()]);
      schoolTypeId = st.length > 0 ? Number(st[0].id) : null;
      if (schoolTypeId === null) {
        return NextResponse.json({ ok: false, error: `Loại trường "${body.schoolTypeName.trim()}" không có trong danh mục.` }, { status: 400 });
      }
    }
    const code = await generateCode(name);
    const inserted = await query<{ id: number }>(
      `INSERT INTO org_units (parent_id, code, name, short_name, org_level, path, depth, admin_unit_id, school_type_id, org_block, address, is_active)
       VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8, $9, $10, true) RETURNING id`,
      [
        parentId,
        code,
        name,
        body?.shortName?.trim() || name,
        orgLevel,
        Number(parent.depth) + 1,
        adminUnitId,
        schoolTypeId,
        block,
        body?.address?.trim() || null,
      ]
    );
    const newId = Number(inserted[0].id);
    await query("UPDATE org_units SET path = $1 WHERE id = $2", [`${parent.path}${newId}/`, newId]);
    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "CREATE_FAILED";
    console.warn("[TNTH][ORG] Tạo đơn vị lỗi:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PATCH /api/org-units — sửa thông tin: { id, name?, shortName?, block?, adminUnitName?, schoolTypeName?, address?, isActive? } */
export async function PATCH(request: NextRequest) {
  const admin = await getOrgAdminSession(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN SỬA CÂY TỔ CHỨC" }, { status: 403 });
  }
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as
    | {
        id?: number;
        name?: string;
        shortName?: string;
        block?: string | null;
        adminUnitName?: string | null;
        schoolTypeName?: string | null;
        address?: string | null;
        isActive?: boolean;
      }
    | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Thiếu mã đơn vị." }, { status: 400 });

  const units = await query<{ id: number; org_level: number; path: string }>(
    "SELECT id, org_level, path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  const unit = units[0];
  if (!unit) return NextResponse.json({ ok: false, error: "Đơn vị không tồn tại." }, { status: 404 });

  // Tỉnh Đoàn chỉ được sửa đơn vị trong tỉnh mình
  if (admin.role === "QUAN_TRI_TINH") {
    if (id !== admin.orgUnitId && !unit.path.startsWith(`/1/${admin.orgUnitId}/`)) {
      return NextResponse.json({ ok: false, error: "Bạn chỉ được chỉnh sửa đơn vị trong địa bàn tỉnh của mình." }, { status: 403 });
    }
  }

  try {
    const sets: string[] = [];
    const values: unknown[] = [];
    const push = (col: string, val: unknown) => {
      values.push(val);
      sets.push(`${col} = $${values.length}`);
    };
    if (body?.name?.trim()) push("name", body.name.trim());
    if (typeof body?.shortName === "string" && body.shortName.trim()) push("short_name", body.shortName.trim());
    if (body?.block !== undefined) push("org_block", VALID_BLOCKS.includes(body.block as OrgBlock) ? body.block : null);
    if (body?.adminUnitName !== undefined) push("admin_unit_id", body.adminUnitName ? await adminUnitIdOf(body.adminUnitName) : null);
    if (body?.schoolTypeName !== undefined) {
      let schoolTypeId: number | null = null;
      if (Number(unit.org_level) === 4 && body.schoolTypeName?.trim()) {
        const st = await query<{ id: number }>("SELECT id FROM school_types WHERE lower(name) = lower($1) LIMIT 1", [body.schoolTypeName.trim()]);
        schoolTypeId = st.length > 0 ? Number(st[0].id) : null;
        if (schoolTypeId === null) {
          return NextResponse.json({ ok: false, error: `Loại trường "${body.schoolTypeName.trim()}" không có trong danh mục.` }, { status: 400 });
        }
      }
      push("school_type_id", schoolTypeId);
    }
    if (body?.address !== undefined) push("address", body.address?.trim() || null);
    if (body?.isActive !== undefined) push("is_active", body.isActive);
    if (sets.length === 0) return NextResponse.json({ ok: true });
    values.push(id);
    await query(`UPDATE org_units SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length}`, values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UPDATE_FAILED";
    console.warn("[TNTH][ORG] Sửa đơn vị lỗi:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** DELETE /api/org-units?id=N — xoá đơn vị (soft delete); chặn khi còn đơn vị con hoặc còn tài khoản */
export async function DELETE(request: NextRequest) {
  const admin = await getOrgAdminSession(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN SỬA CÂY TỔ CHỨC" }, { status: 403 });
  }
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id === 1) {
    return NextResponse.json({ ok: false, error: "Mã đơn vị không hợp lệ." }, { status: 400 });
  }

  // Tỉnh Đoàn chỉ được xoá đơn vị cấp dưới trong tỉnh mình
  if (admin.role === "QUAN_TRI_TINH") {
    const units = await query<{ path: string }>("SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (!units[0] || !units[0].path.startsWith(`/1/${admin.orgUnitId}/`)) {
      return NextResponse.json({ ok: false, error: "Bạn chỉ được xoá đơn vị cấp dưới trong địa bàn tỉnh của mình." }, { status: 403 });
    }
  }

  const children = await query<{ c: string }>("SELECT count(*) c FROM org_units WHERE parent_id = $1 AND deleted_at IS NULL", [id]);
  if (Number(children[0].c) > 0) {
    return NextResponse.json({ ok: false, error: "Đơn vị còn cấp dưới trực tiếp — phải xoá (hoặc chuyển) các đơn vị con trước." }, { status: 409 });
  }
  const accounts = await query<{ c: string }>("SELECT count(*) c FROM accounts WHERE org_unit_id = $1 AND deleted_at IS NULL", [id]);
  if (Number(accounts[0].c) > 0) {
    return NextResponse.json({ ok: false, error: "Đơn vị còn tài khoản đang gắn vào — chuyển tài khoản sang đơn vị khác trước khi xoá." }, { status: 409 });
  }
  await query("UPDATE org_units SET deleted_at = now(), is_active = false, updated_at = now() WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
