import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { inferPeriodKind } from "@/data/bao-cao-agent";
import type { ReportActivityRecord, ReportDraftContext } from "@/app/api/ai/nhap-bao-cao/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface XuatDuLieuBody {
  mode: "period" | "activity";
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string;   // YYYY-MM-DD
  periodLabel?: string;
  activityIds?: number[];
  orgUnitId?: number;
  /** mode "period": gồm cả hoạt động của các đơn vị cấp dưới (theo cây org_units) */
  gomCapDuoi?: boolean;
  clientFallbackData?: {
    orgUnits?: Array<{ id: number; name: string; orgLevel: number; path?: string }>;
    activities?: Array<{
      id: number;
      orgUnitId: number;
      title: string;
      summary?: string;
      startDate: string;
      location?: string;
      participantCount?: number;
    }>;
    tasks?: Array<{ id: number; code: string; title: string }>;
    taskAssignments?: Array<{
      id: number;
      taskId: number;
      orgUnitId: number;
      completionRate: number;
    }>;
    publishedPosts?: Array<{
      id: number;
      title: string;
      status: string;
      authorOrgUnitName?: string;
      createdAt: string;
    }>;
  };
}

function formatDateVn(dateStr?: string): string {
  if (!dateStr) return "";
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split("-");
  return d && m && y ? `${d}/${m}/${y}` : clean;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  const session = await sessionFromToken(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Phiên làm việc không hợp lệ." }, { status: 401 });
  }

  if (session.role === "DOAN_VIEN") {
    return NextResponse.json(
      { ok: false, error: "Chức năng chỉ dành cho cán bộ Đoàn quản trị." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as XuatDuLieuBody | null;
  if (!body || !body.mode) {
    return NextResponse.json(
      { ok: false, error: "Thiếu dữ liệu yêu cầu xuất (mode: 'period' | 'activity')." },
      { status: 400 }
    );
  }

  const targetOrgUnitId = body.orgUnitId ?? session.orgUnitId;

  // ── Kiểm tra phạm vi dữ liệu (scope) ──────────────────────────────────
  // QUAN_TRI_TW được xuất dữ liệu của mọi đơn vị; cán bộ khác chỉ được xuất
  // dữ liệu của đơn vị mình và các đơn vị cấp dưới trong cây org_units.
  let targetPath: string | null = null;
  if (dbEnabled()) {
    try {
      const tgtRows = await query<{ path: string }>(
        "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
        [targetOrgUnitId]
      );
      targetPath = tgtRows[0]?.path ?? null;
      if (session.role !== "QUAN_TRI_TW") {
        const ownRows = await query<{ path: string }>(
          "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
          [session.orgUnitId]
        );
        const ownPath = ownRows[0]?.path ?? null;
        if (!targetPath || !ownPath || !targetPath.startsWith(ownPath)) {
          return NextResponse.json(
            { ok: false, error: "Bạn chỉ được xuất dữ liệu của đơn vị mình và các đơn vị cấp dưới." },
            { status: 403 }
          );
        }
      }
    } catch (scopeErr) {
      console.warn("[TNTH][xuat-du-lieu] Không kiểm được phạm vi, chặn để an toàn:", scopeErr);
      return NextResponse.json(
        { ok: false, error: "Không xác định được phạm vi dữ liệu. Vui lòng thử lại sau." },
        { status: 503 }
      );
    }
  }

  let orgName = `Đơn vị #${targetOrgUnitId}`;
  let orgLevel = 4;
  let rawActivities: Array<{
    id: number;
    orgUnitId: number;
    title: string;
    summary?: string;
    startDate: string;
    location?: string;
    participantCount?: number;
    /** Tên đơn vị tổ chức (khi gồm cấp dưới) — dùng làm chủ trì */
    unitName?: string;
  }> = [];

  let taskLines: string[] = [];
  let postCount = 0;

  if (dbEnabled()) {
    try {
      // 1. Lấy thông tin đơn vị
      const unitRows = await query<{ id: number; name: string; org_level: number; path: string }>(
        "SELECT id, name, org_level, path FROM org_units WHERE id = $1 LIMIT 1",
        [targetOrgUnitId]
      );
      if (unitRows.length > 0) {
        orgName = unitRows[0].name;
        orgLevel = unitRows[0].org_level;
      }

      // 2. Lấy danh sách hoạt động theo mode
      if (body.mode === "period") {
        const start = body.periodStart ? `${body.periodStart} 00:00:00` : "1970-01-01 00:00:00";
        const end = body.periodEnd ? `${body.periodEnd} 23:59:59` : "2099-12-31 23:59:59";

        const gomCapDuoi = body.gomCapDuoi === true && !!targetPath;
        const actRows = await query<{
          id: number;
          org_unit_id: number;
          title: string;
          summary: string | null;
          start_date: string;
          location: string | null;
          participant_count: number | null;
          unit_name: string;
        }>(
          `SELECT a.id, a.org_unit_id, a.title, a.summary, a.start_date, a.location, a.participant_count, u.name AS unit_name
           FROM activities a
           JOIN org_units u ON u.id = a.org_unit_id
           WHERE (a.org_unit_id = $1 OR ($4::boolean AND u.path LIKE $5 || '%'))
             AND a.deleted_at IS NULL
             AND a.start_date >= $2
             AND a.start_date <= $3
           ORDER BY a.start_date ASC`,
          [targetOrgUnitId, start, end, gomCapDuoi, targetPath ?? ""]
        );

        rawActivities = actRows.map((r) => ({
          id: Number(r.id),
          orgUnitId: Number(r.org_unit_id),
          title: r.title,
          summary: r.summary ?? undefined,
          startDate: typeof r.start_date === "string" ? r.start_date : new Date(r.start_date).toISOString(),
          location: r.location ?? undefined,
          participantCount: r.participant_count ? Number(r.participant_count) : 0,
          unitName: r.unit_name,
        }));
      } else {
        const ids = body.activityIds ?? [];
        if (ids.length > 0) {
          const actRows = await query<{
            id: number;
            org_unit_id: number;
            title: string;
            summary: string | null;
            start_date: string;
            location: string | null;
            participant_count: number | null;
          }>(
            `SELECT id, org_unit_id, title, summary, start_date, location, participant_count
             FROM activities
             WHERE id = ANY($1::bigint[])
               AND org_unit_id = $2
               AND deleted_at IS NULL
             ORDER BY start_date ASC`,
            [ids, targetOrgUnitId]
          );

          rawActivities = actRows.map((r) => ({
            id: Number(r.id),
            orgUnitId: Number(r.org_unit_id),
            title: r.title,
            summary: r.summary ?? undefined,
            startDate: typeof r.start_date === "string" ? r.start_date : new Date(r.start_date).toISOString(),
            location: r.location ?? undefined,
            participantCount: r.participant_count ? Number(r.participant_count) : 0,
          }));
        }
      }

      // 3. Lấy tiến độ nhiệm vụ
      const asgRows = await query<{ code: string; completion_rate: number | null }>(
        `SELECT t.code, a.completion_rate 
         FROM task_assignments a 
         JOIN tasks t ON a.task_id = t.id 
         WHERE a.org_unit_id = $1`,
        [targetOrgUnitId]
      );
      taskLines = asgRows.map(
        (r) => `${r.code} đạt ${(Number(r.completion_rate) || 0).toFixed(1)}%`
      );

      // 4. Lấy số tin bài xuất bản của đơn vị (theo cây đơn vị) — không đếm toàn cổng
      if (targetPath) {
        const postRows = await query<{ count: string }>(
          `SELECT count(*)::text AS count
           FROM published_posts p
           JOIN org_units u ON u.id = p.author_org_unit_id
           WHERE p.status = 'PUBLISHED' AND u.path LIKE $1`,
          [`${targetPath}%`]
        );
        postCount = postRows.length > 0 ? parseInt(postRows[0].count, 10) : 0;
      }
    } catch (dbErr) {
      console.warn("[TNTH][xuat-du-lieu] DB query error, falling back:", dbErr);
    }
  }

  // Fallback từ client fallback data nếu DB chưa có bản ghi hoặc DB tắt
  if (rawActivities.length === 0 && body.clientFallbackData?.activities) {
    const fb = body.clientFallbackData;
    const fbActs = fb.activities || [];
    const unit = fb.orgUnits?.find((u) => u.id === targetOrgUnitId);
    if (unit) {
      orgName = unit.name;
      orgLevel = unit.orgLevel;
    }

    if (body.mode === "period") {
      const start = body.periodStart || "1970-01-01";
      const end = body.periodEnd || "2099-12-31";
      rawActivities = fbActs.filter(
        (a) =>
          a.orgUnitId === targetOrgUnitId &&
          a.startDate.slice(0, 10) >= start &&
          a.startDate.slice(0, 10) <= end
      );
    } else {
      const ids = new Set(body.activityIds || []);
      rawActivities = fbActs.filter((a) => ids.has(a.id));
    }

    if (fb.taskAssignments && fb.tasks) {
      const asgs = fb.taskAssignments.filter((a) => a.orgUnitId === targetOrgUnitId);
      taskLines = asgs.map((a) => {
        const code = fb.tasks?.find((t) => t.id === a.taskId)?.code ?? "?";
        return `${code} đạt ${a.completionRate.toFixed(1)}%`;
      });
    }

    if (fb.publishedPosts) {
      postCount = fb.publishedPosts.filter(
        (p) => p.status === "PUBLISHED" && p.authorOrgUnitName === orgName
      ).length;
    }
  }

  const cap =
    orgLevel === 1 ? "tw" : orgLevel === 2 ? "tinh" : orgLevel === 3 ? "xa" : "truong";

  const totalParticipants = rawActivities.reduce(
    (acc, a) => acc + (a.participantCount || 0),
    0
  );

  // Định dạng các bản ghi hoạt động theo chuẩn mục IX Đặc tả huấn luyện AI agent
  const reportActivityRecords: ReportActivityRecord[] = rawActivities.map((a) => ({
    id: a.id,
    ten: a.title,
    ngay: formatDateVn(a.startDate),
    dia_diem: a.location || undefined,
    chu_tri: a.unitName || orgName,
    mo_ta: (a.summary || a.title).slice(0, 600),
    so_lieu: a.participantCount
      ? [
          {
            chi_so: "Lượt đoàn viên, thanh niên tham gia",
            gia_tri: a.participantCount,
            don_vi: "lượt",
            loai: "ket_qua",
          },
        ]
      : [],
    nguon: [`Bản ghi hoạt động trên hệ thống TNTH (mã #${a.id})`],
  }));

  const periodLabel =
    body.periodLabel ||
    (body.periodStart && body.periodEnd
      ? `Giai đoạn từ ${formatDateVn(body.periodStart)} đến ${formatDateVn(body.periodEnd)}`
      : "Kỳ báo cáo hệ thống");

  const reportDraftContext: ReportDraftContext = {
    orgUnitName: orgName,
    cap,
    period: periodLabel,
    periodKind: inferPeriodKind(periodLabel, body.periodStart, body.periodEnd),
    periodStart: formatDateVn(body.periodStart),
    periodEnd: formatDateVn(body.periodEnd),
    activityCount: rawActivities.length,
    participantCount: totalParticipants,
    taskLines,
    postCount,
    activities: reportActivityRecords,
  };

  return NextResponse.json({
    ok: true,
    metadata: {
      exportedAt: new Date().toISOString(),
      mode: body.mode,
      orgUnitId: targetOrgUnitId,
      orgUnitName: orgName,
      activityCount: rawActivities.length,
      participantCount: totalParticipants,
    },
    contextForAi: reportDraftContext,
    rawActivities,
  });
}
