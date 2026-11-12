import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import {
  adminScopePaths,
  getActiveCampaign,
  isAdminSession,
  scopeClause,
  STORY_SELECT,
  toStoryDto,
  UNIT_STORY_SELECT,
  toUnitStoryDto,
  type UnitStoryRow,
  type AdminScope,
} from "@/lib/server/binh-chon";
import type { SessionDto } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminOf(request: NextRequest): Promise<{ session: SessionDto; scope: AdminScope; canReview: boolean } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session || !dbEnabled()) return null;
  const perms = effectivePermissions({ role: session.role, contactPosition: session.contactPosition, grantedPerms: session.grantedPerms });
  if (!isAdminSession(session, perms)) return null;
  const canReview =
    ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"].includes(session.role) ||
    hasPerm(perms, "*") ||
    hasPerm(perms, "hs3t.review");
  const scope = await adminScopePaths(session);
  return { session, scope, canReview };
}

/** GET /api/binh-chon/quan-tri — bài theo scope + đếm theo trạng thái + thống kê aggregate (?kind=HS3T|DOAN_TRUONG) */
export async function GET(request: NextRequest) {
  const admin = await adminOf(request);
  if (!admin) return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN XEM" }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") === "DOAN_TRUONG" ? "DOAN_TRUONG" : "HS3T";
  const campaign = await getActiveCampaign(kind);
  if (!campaign) return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });
  const { scope } = admin;

  if (kind === "DOAN_TRUONG") {
    const countParams: unknown[] = [campaign.id];
    const countScopeSql = scopeClause(scope, countParams);

    const countRows = await query<{ status: string; c: string }>(
      `SELECT u.status, count(*) c
         FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id
        WHERE u.campaign_id = $1 AND ${countScopeSql} GROUP BY u.status`,
      countParams
    );
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<"PENDING" | "APPROVED" | "REJECTED", number>;
    for (const r of countRows) counts[r.status as keyof typeof counts] = Number(r.c);

    const storyParams: unknown[] = [campaign.id];
    const storyScopeSql = scopeClause(scope, storyParams);
    const rows = await query<UnitStoryRow>(
      `${UNIT_STORY_SELECT} WHERE u.campaign_id = $1 AND ${storyScopeSql} ORDER BY u.created_at DESC LIMIT 500`,
      storyParams
    );

    const statParams: unknown[] = [campaign.id];
    const statScopeSql = scopeClause(scope, statParams);
    const voterParams: unknown[] = [campaign.id];
    const voterScopeSql = scopeClause(scope, voterParams, "sc2");

    const [totals, voters, top, byProvince] = await Promise.all([
      query<{ total_votes: string | null }>(
        `SELECT sum(u.vote_count) total_votes
           FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id
          WHERE u.campaign_id = $1 AND u.status = 'APPROVED' AND ${statScopeSql}`,
        statParams
      ),
      query<{ c: string }>(
        `SELECT count(DISTINCT v.voter_account_id) c
           FROM unit_votes v
           JOIN unit_stories u2 ON u2.id = v.unit_story_id AND u2.status = 'APPROVED'
           JOIN org_units sc2 ON sc2.id = u2.org_unit_id
          WHERE u2.campaign_id = $1 AND ${voterScopeSql}`,
        voterParams
      ),
      query<{ id: number | string; title: string; school_name: string | null; vote_count: number | string }>(
        `SELECT u.id, u.title, school.name school_name, u.vote_count
           FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id
          WHERE u.campaign_id = $1 AND u.status = 'APPROVED' AND ${statScopeSql}
          ORDER BY u.vote_count DESC, u.approved_at ASC LIMIT 5`,
        statParams
      ),
      query<{ province_name: string | null; stories: string; votes: string | null }>(
        `SELECT COALESCE(prov.name, 'Khác') province_name, count(*) stories, sum(u.vote_count) votes
           FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id
           LEFT JOIN LATERAL (
             SELECT au.name FROM org_units pu
               JOIN admin_units au ON au.id = pu.admin_unit_id
              WHERE pu.id = CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint ELSE NULL END
              LIMIT 1
           ) prov ON true
          WHERE u.campaign_id = $1 AND u.status = 'APPROVED' AND ${statScopeSql}
          GROUP BY 1 ORDER BY sum(u.vote_count) DESC NULLS LAST, count(*) DESC LIMIT 40`,
        statParams
      ),
    ]);

    return NextResponse.json({
      ok: true,
      campaign,
      counts,
      stories: rows.map((r) => toUnitStoryDto(r)),
      stats: {
        totalVotes: Number(totals[0]?.total_votes ?? 0),
        voterAccounts: Number(voters[0]?.c ?? 0),
        topStories: top.map((r) => ({ id: Number(r.id), studentName: r.title, schoolName: r.school_name ?? "", votes: Number(r.vote_count) })),
        bySchool: [],
        byProvince: byProvince.map((r) => ({ provinceName: r.province_name ?? "Khác", stories: Number(r.stories), votes: Number(r.votes ?? 0) })),
      },
    });
  }

  // HS3T query mặc định
  const countParams: unknown[] = [campaign.id];
  const countScopeSql = scopeClause(scope, countParams);

  const countRows = await query<{ status: string; c: string }>(
    `SELECT s.status, count(*) c
       FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id
      WHERE s.campaign_id = $1 AND ${countScopeSql} GROUP BY s.status`,
    countParams
  );
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<"PENDING" | "APPROVED" | "REJECTED", number>;
  for (const r of countRows) counts[r.status as keyof typeof counts] = Number(r.c);

  const storyParams: unknown[] = [campaign.id];
  const storyScopeSql = scopeClause(scope, storyParams);
  const rows = await query<Parameters<typeof toStoryDto>[0]>(
    `${STORY_SELECT} WHERE s.campaign_id = $1 AND ${storyScopeSql} ORDER BY s.created_at DESC LIMIT 500`,
    storyParams
  );

  const statParams: unknown[] = [campaign.id];
  const statScopeSql = scopeClause(scope, statParams);
  const voterParams: unknown[] = [campaign.id];
  const voterScopeSql = scopeClause(scope, voterParams, "sc2");
  const [totals, voters, top, bySchool, byProvince] = await Promise.all([
    query<{ total_votes: string | null }>(
      `SELECT sum(s.vote_count) total_votes
         FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id
        WHERE s.campaign_id = $1 AND s.status = 'APPROVED' AND ${statScopeSql}`,
      statParams
    ),
    query<{ c: string }>(
      `SELECT count(DISTINCT v.voter_account_id) c
         FROM hs3t_votes v
         JOIN hs3t_stories s2 ON s2.id = v.story_id AND s2.status = 'APPROVED'
         LEFT JOIN org_units sc2 ON sc2.id = s2.school_org_unit_id
        WHERE s2.campaign_id = $1 AND ${voterScopeSql}`,
      voterParams
    ),
    query<{ id: number | string; student_name: string; school_name: string | null; vote_count: number | string }>(
      `SELECT s.id, s.student_name, COALESCE(s.org_display_name, school.name) school_name, s.vote_count
         FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id
        WHERE s.campaign_id = $1 AND s.status = 'APPROVED' AND ${statScopeSql}
        ORDER BY s.vote_count DESC, s.approved_at ASC LIMIT 5`,
      statParams
    ),
    query<{ school_name: string | null; stories: string; votes: string | null }>(
      `SELECT COALESCE(school.name, s.org_display_name) school_name, count(*) stories, sum(s.vote_count) votes
         FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id
        WHERE s.campaign_id = $1 AND s.status = 'APPROVED' AND ${statScopeSql}
        GROUP BY 1 ORDER BY sum(s.vote_count) DESC NULLS LAST, count(*) DESC LIMIT 20`,
      statParams
    ),
    query<{ province_name: string | null; stories: string; votes: string | null }>(
      `SELECT COALESCE(prov.name, 'Khác') province_name, count(*) stories, sum(s.vote_count) votes
         FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id
         LEFT JOIN LATERAL (
           SELECT au.name FROM org_units pu
             JOIN admin_units au ON au.id = pu.admin_unit_id
            WHERE pu.id = CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint ELSE NULL END
            LIMIT 1
         ) prov ON true
        WHERE s.campaign_id = $1 AND s.status = 'APPROVED' AND ${statScopeSql}
        GROUP BY 1 ORDER BY sum(s.vote_count) DESC NULLS LAST, count(*) DESC LIMIT 40`,
      statParams
    ),
  ]);

  return NextResponse.json({
    ok: true,
    campaign,
    counts,
    stories: rows.map((r) => toStoryDto(r, { withEmail: true })),
    stats: {
      totalVotes: Number(totals[0]?.total_votes ?? 0),
      voterAccounts: Number(voters[0]?.c ?? 0),
      topStories: top.map((r) => ({ id: Number(r.id), studentName: r.student_name, schoolName: r.school_name ?? "", votes: Number(r.vote_count) })),
      bySchool: bySchool.map((r) => ({ schoolName: r.school_name ?? "", stories: Number(r.stories), votes: Number(r.votes ?? 0) })),
      byProvince: byProvince.map((r) => ({ provinceName: r.province_name ?? "Khác", stories: Number(r.stories), votes: Number(r.votes ?? 0) })),
    },
  });
}

/** PATCH /api/binh-chon/quan-tri — { action: approve | reject | delete | campaign, …, kind? } */
export async function PATCH(request: NextRequest) {
  const admin = await adminOf(request);
  if (!admin) return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as
    | { action?: string; id?: number; reason?: string; honorLevel?: string; kind?: "HS3T" | "DOAN_TRUONG"; title?: string; startsAt?: string; endsAt?: string; status?: string; giftNote?: string }
    | null;
  const kind = body?.kind === "DOAN_TRUONG" ? "DOAN_TRUONG" : "HS3T";
  const campaign = await getActiveCampaign(kind);
  if (!campaign) return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });

  // ═══ Duyệt / từ chối bài ═══
  if (body?.action === "approve" || body?.action === "reject") {
    if (!admin.canReview) return NextResponse.json({ ok: false, error: "Bạn không có quyền duyệt bài." }, { status: 403 });
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Thiếu mã bài." }, { status: 400 });

    if (kind === "DOAN_TRUONG") {
      const rows = await query<{ path: string }>(
        `SELECT school.path FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id WHERE u.id = $1 LIMIT 1`,
        [id]
      );
      const row = rows[0];
      if (!row) return NextResponse.json({ ok: false, error: "Hồ sơ không tồn tại." }, { status: 404 });
      if (!admin.scope.all && !row.path.startsWith(admin.scope.pathPrefix ?? "\u0000")) {
        return NextResponse.json({ ok: false, error: "Hồ sơ này ngoài phạm vi đơn vị của bạn." }, { status: 403 });
      }

      if (body.action === "approve") {
        await query(
          `UPDATE unit_stories
              SET status = 'APPROVED', approved_by_account_id = $1, approved_at = now(),
                  rejection_reason = NULL, updated_at = now()
            WHERE id = $2`,
          [admin.session.accountId, id]
        );
        return NextResponse.json({ ok: true });
      }

      const reason = body.reason?.trim() ?? "";
      if (reason.length < 3) return NextResponse.json({ ok: false, error: "Vui lòng nhập lý do từ chối (tối thiểu 3 ký tự)." }, { status: 400 });
      await withTransaction(async (tx) => {
        await tx.query("DELETE FROM unit_votes WHERE unit_story_id = $1", [id]);
        await tx.query(
          `UPDATE unit_stories
              SET status = 'REJECTED', rejection_reason = $1, vote_count = 0,
                  approved_by_account_id = NULL, approved_at = NULL, updated_at = now()
            WHERE id = $2`,
          [reason, id]
        );
      });
      return NextResponse.json({ ok: true });
    }

    // HS3T duyệt / từ chối
    const rows = await query<{ path: string | null }>(
      `SELECT school.path FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "Bài không tồn tại." }, { status: 404 });
    // Bài gửi bằng Gmail không gắn trường (path NULL) → chỉ Quản trị TW (scope.all) duyệt/xoá
    if (!admin.scope.all && !(row.path ?? "").startsWith(admin.scope.pathPrefix ?? "\u0000")) {
      return NextResponse.json({ ok: false, error: "Bài này ngoài phạm vi đơn vị của bạn." }, { status: 403 });
    }

    if (body.action === "approve") {
      const honor = ["TRUONG", "TINH", "TW_DE_CU"].includes(body.honorLevel ?? "") ? body.honorLevel! : null;
      const sets: string[] = ["status = 'APPROVED'", "approved_by_account_id = $1", "approved_at = now()", "rejection_reason = NULL", "updated_at = now()"];
      const params: unknown[] = [admin.session.accountId];
      if (honor) {
        params.push(honor);
        sets.push(`honor_level = $${params.length}`);
      }
      params.push(id);
      await query(`UPDATE hs3t_stories SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
      return NextResponse.json({ ok: true });
    }

    const reason = body.reason?.trim() ?? "";
    if (reason.length < 3) return NextResponse.json({ ok: false, error: "Vui lòng nhập lý do từ chối (tối thiểu 3 ký tự)." }, { status: 400 });
    await withTransaction(async (tx) => {
      await tx.query("DELETE FROM hs3t_votes WHERE story_id = $1", [id]);
      await tx.query(
        `UPDATE hs3t_stories
            SET status = 'REJECTED', rejection_reason = $1, vote_count = 0,
                approved_by_account_id = NULL, approved_at = NULL, updated_at = now()
          WHERE id = $2`,
        [reason, id]
      );
    });
    return NextResponse.json({ ok: true });
  }

  // ═══ Đổi bảng dự thi (honor_level) cho bài đã duyệt — HS3T ═══
  if (body?.action === "honor") {
    if (kind !== "HS3T") return NextResponse.json({ ok: false, error: "Chỉ áp dụng cho bình chọn HS3T." }, { status: 400 });
    if (!admin.canReview) return NextResponse.json({ ok: false, error: "Bạn không có quyền sửa bài." }, { status: 403 });
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Thiếu mã bài." }, { status: 400 });
    const honor = ["TRUONG", "TINH", "TW_DE_CU"].includes(body.honorLevel ?? "") ? body.honorLevel! : null;
    if (!honor) return NextResponse.json({ ok: false, error: "Danh hiệu không hợp lệ." }, { status: 400 });

    const rows = await query<{ path: string | null }>(
      `SELECT school.path FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "Bài không tồn tại." }, { status: 404 });
    if (!admin.scope.all && !(row.path ?? "").startsWith(admin.scope.pathPrefix ?? "\u0000")) {
      return NextResponse.json({ ok: false, error: "Bài này ngoài phạm vi đơn vị của bạn." }, { status: 403 });
    }

    // Chỉ bài APPROVED mới đổi qua action này (PENDING thì duyệt là ghi luôn; REJECTED phải gửi lại)
    await query(
      `UPDATE hs3t_stories SET honor_level = $1, updated_at = now() WHERE id = $2 AND status = 'APPROVED'`,
      [honor, id]
    );
    return NextResponse.json({ ok: true });
  }

  // ═══ Xóa hẳn bài (hủy đăng bài) ═══
  if (body?.action === "delete") {
    if (!admin.canReview) return NextResponse.json({ ok: false, error: "Bạn không có quyền xóa bài." }, { status: 403 });
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Thiếu mã bài." }, { status: 400 });

    if (kind === "DOAN_TRUONG") {
      const rows = await query<{ path: string }>(
        `SELECT school.path FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id WHERE u.id = $1 LIMIT 1`,
        [id]
      );
      const row = rows[0];
      if (!row) return NextResponse.json({ ok: false, error: "Hồ sơ không tồn tại." }, { status: 404 });
      if (!admin.scope.all && !row.path.startsWith(admin.scope.pathPrefix ?? "\u0000")) {
        return NextResponse.json({ ok: false, error: "Hồ sơ này ngoài phạm vi đơn vị của bạn." }, { status: 403 });
      }

      await withTransaction(async (tx) => {
        await tx.query("DELETE FROM unit_votes WHERE unit_story_id = $1", [id]);
        await tx.query("DELETE FROM unit_stories WHERE id = $1", [id]);
      });
      return NextResponse.json({ ok: true });
    }

    const rows = await query<{ path: string | null }>(
      `SELECT school.path FROM hs3t_stories s LEFT JOIN org_units school ON school.id = s.school_org_unit_id WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "Bài không tồn tại." }, { status: 404 });
    // Bài gửi bằng Gmail không gắn trường (path NULL) → chỉ Quản trị TW (scope.all) duyệt/xoá
    if (!admin.scope.all && !(row.path ?? "").startsWith(admin.scope.pathPrefix ?? "\u0000")) {
      return NextResponse.json({ ok: false, error: "Bài này ngoài phạm vi đơn vị của bạn." }, { status: 403 });
    }

    await withTransaction(async (tx) => {
      await tx.query("DELETE FROM hs3t_votes WHERE story_id = $1", [id]);
      await tx.query("DELETE FROM hs3t_stories WHERE id = $1", [id]);
    });
    return NextResponse.json({ ok: true });
  }

  // ═══ Sửa chiến dịch — chỉ TW ═══
  if (body?.action === "campaign") {
    if (admin.session.role !== "QUAN_TRI_TW") {
      return NextResponse.json({ ok: false, error: "Chỉ cán bộ Trung ương mới được sửa chiến dịch." }, { status: 403 });
    }
    const cur = await getActiveCampaign(kind);
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (body.title?.trim()) push("title", body.title.trim().slice(0, 200));
    if (body.giftNote !== undefined) push("gift_note", body.giftNote?.trim() || null);
    if (body.status && ["DRAFT", "LIVE", "ENDED"].includes(body.status)) push("status", body.status);
    const starts = body.startsAt ? new Date(body.startsAt) : null;
    const ends = body.endsAt ? new Date(body.endsAt) : null;
    if (starts && !Number.isNaN(starts.getTime())) push("starts_at", starts);
    if (ends && !Number.isNaN(ends.getTime())) push("ends_at", ends);

    const finalStart = starts && !Number.isNaN(starts.getTime()) ? starts.getTime() : new Date(cur?.startsAt ?? 0).getTime();
    const finalEnd = ends && !Number.isNaN(ends.getTime()) ? ends.getTime() : new Date(cur?.endsAt ?? 0).getTime();
    if (finalEnd <= finalStart) {
      return NextResponse.json({ ok: false, error: "Thời gian kết thúc phải sau thời gian bắt đầu." }, { status: 400 });
    }

    if (sets.length === 0) return NextResponse.json({ ok: true });
    params.push(campaign.id);
    await query(`UPDATE vote_campaigns SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`, params);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Hành động không hợp lệ." }, { status: 400 });
}
