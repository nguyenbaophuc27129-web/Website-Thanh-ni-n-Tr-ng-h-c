import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions } from "@/lib/permissions";
import {
  adminScopePaths,
  isAdminSession,
  scopeClause,
  NOMINATION_SELECT,
  toNominationDto,
  type NominationRow,
  type AdminScope,
} from "@/lib/server/de-cu";
import type { SessionDto } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminOf(request: NextRequest): Promise<{ session: SessionDto; scope: AdminScope } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session || !dbEnabled()) return null;
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  if (!isAdminSession(session, perms)) return null;
  const scope = await adminScopePaths(session);
  return { session, scope };
}

/**
 * GET /api/de-cu/quan-tri — danh sách đề cử theo phân quyền cán bộ
 */
export async function GET(request: NextRequest) {
  const admin = await adminOf(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN TRUY CẬP" }, { status: 403 });
  }

  const { scope } = admin;
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status")?.trim().toUpperCase() || "";
  const q = sp.get("q")?.trim() || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
  const offset = (page - 1) * limit;

  try {
    // 1. Đếm theo từng trạng thái theo đúng scope
    const countParams: unknown[] = [];
    const countScopeSql = scopeClause(scope, countParams, "school");
    const countRows = await query<{ status: string; c: string }>(
      `SELECT n.status, count(*) AS c
         FROM nominations n
         JOIN org_units school ON school.id = n.org_unit_id
        WHERE ${countScopeSql}
        GROUP BY n.status`,
      countParams
    );

    const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const r of countRows) {
      const c = Number(r.c);
      if (r.status === "PENDING") counts.pending = c;
      else if (r.status === "APPROVED") counts.approved = c;
      else if (r.status === "REJECTED") counts.rejected = c;
      counts.total += c;
    }

    // 2. Lấy danh sách đề cử theo bộ lọc
    const listConditions: string[] = [];
    const listParams: unknown[] = [];

    const scopeSql = scopeClause(scope, listParams, "school");
    listConditions.push(scopeSql);

    if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
      listParams.push(status);
      listConditions.push(`n.status = $${listParams.length}`);
    }

    if (q) {
      listParams.push(`%${q}%`);
      const qIdx = listParams.length;
      listConditions.push(`(n.nominee_name ILIKE $${qIdx} OR school.name ILIKE $${qIdx})`);
    }

    const whereClause = listConditions.join(" AND ");

    const totalRows = await query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM nominations n
         JOIN org_units school ON school.id = n.org_unit_id
        WHERE ${whereClause}`,
      listParams
    );
    const total = Number(totalRows[0]?.count ?? 0);

    listParams.push(limit);
    const limitIdx = listParams.length;
    listParams.push(offset);
    const offsetIdx = listParams.length;

    const rows = await query<NominationRow>(
      `${NOMINATION_SELECT}
        WHERE ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams
    );

    return NextResponse.json({
      ok: true,
      counts,
      nominations: rows.map((r) => toNominationDto(r, { withFullEvidence: true })),
      total,
      page,
      limit,
    });
  } catch (e) {
    console.warn("[DE_CU_ADMIN] Lỗi truy vấn:", (e as Error).message);
    return NextResponse.json({
      ok: false,
      error: (e as Error).message,
    }, { status: 500 });
  }
}

/**
 * PATCH /api/de-cu/quan-tri — Phê duyệt hoặc từ chối đề cử
 */
export async function PATCH(request: NextRequest) {
  const admin = await adminOf(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN TRUY CẬP" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: number;
    action?: "approve" | "reject";
    reason?: string;
  } | null;

  if (!body || !body.id || !body.action) {
    return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
  }

  const id = Number(body.id);
  const action = body.action;
  const reason = (body.reason ?? "").trim();

  if (action === "reject" && reason.length < 3) {
    return NextResponse.json({ ok: false, error: "VUI LÒNG NHẬP LÝ DO TỪ CHỐI (TỐI THIỂU 3 KÝ TỰ)" }, { status: 400 });
  }

  try {
    // Kiểm tra bản ghi tồn tại và phạm vi đơn vị
    const checkRows = await query<{ id: string; school_path: string; nominee_name: string; submitter_account_id: string | null }>(
      `SELECT n.id, school.path AS school_path, n.nominee_name, n.submitter_account_id
         FROM nominations n
         JOIN org_units school ON school.id = n.org_unit_id
        WHERE n.id = $1 LIMIT 1`,
      [id]
    );

    const record = checkRows[0];
    if (!record) {
      return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY HỒ SƠ ĐỀ CỬ" }, { status: 404 });
    }

    if (!admin.scope.all) {
      const prefix = admin.scope.pathPrefix ?? "";
      if (!record.school_path.startsWith(prefix)) {
        return NextResponse.json({ ok: false, error: "HỒ SƠ KHÔNG THUỘC PHẠM VI QUẢN LÝ" }, { status: 403 });
      }
    }

    if (action === "approve") {
      await query(
        `UPDATE nominations
            SET status = 'APPROVED',
                rejection_reason = NULL,
                reviewed_by_account_id = $1,
                reviewed_at = now(),
                updated_at = now()
          WHERE id = $2`,
        [admin.session.accountId, id]
      );
    } else {
      await query(
        `UPDATE nominations
            SET status = 'REJECTED',
                rejection_reason = $1,
                reviewed_by_account_id = $2,
                reviewed_at = now(),
                updated_at = now()
          WHERE id = $3`,
        [reason, admin.session.accountId, id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DE_CU_ADMIN] Lỗi cập nhật:", e);
    return NextResponse.json({ ok: false, error: "CẬP NHẬT THẤT BẠI" }, { status: 500 });
  }
}
