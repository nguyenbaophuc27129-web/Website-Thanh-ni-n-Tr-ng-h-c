import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  dataUrlGuard,
  moderateStoryText,
  NOMINATION_SELECT,
  toNominationDto,
  type NominationRow,
} from "@/lib/server/de-cu";
import { NOMINATION_FIELDS } from "@/lib/de-cu";
import { MediaError, storeImageDataUrl } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FULL_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const THUMB_EVIDENCE_MAX_BYTES = 800 * 1024; // 800KB
const ALLOWED_SUBMIT_ROLES = ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"];

async function sessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await sessionFromToken(token) : null;
}

/**
 * GET /api/de-cu — danh sách nhân tài APPROVED (công khai) hoặc chi tiết ?id=
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const id = Number(sp.get("id")) || 0;
  const field = sp.get("field")?.trim() || "";
  const orgUnitId = Number(sp.get("orgUnitId")) || 0;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 12));
  const offset = (page - 1) * limit;

  if (!dbEnabled()) {
    return NextResponse.json({
      ok: true,
      nominations: [],
      total: 0,
      totalPages: 1,
      page: 1,
    });
  }

  try {
    // Chi tiết 1 đề cử
    if (id > 0) {
      const rows = await query<NominationRow>(
        `${NOMINATION_SELECT} WHERE n.id = $1 LIMIT 1`,
        [id]
      );
      if (!rows[0]) {
        return NextResponse.json({ ok: false, error: "KHÔNG_TÌM_THẤY" }, { status: 404 });
      }
      const session = await sessionOf(request);
      const isOwner = session && Number(rows[0].submitter_account_id) === session.accountId;
      const isAdmin = session && ALLOWED_SUBMIT_ROLES.includes(session.role);
      // Chỉ hiển thị APPROVED cho khách; chủ bài hoặc admin mới được xem PENDING/REJECTED
      if (rows[0].status !== "APPROVED" && !isOwner && !isAdmin) {
        return NextResponse.json({ ok: false, error: "HỒ_SƠ_CHƯA_ĐƯỢC_DUYỆT" }, { status: 403 });
      }
      return NextResponse.json({
        ok: true,
        nomination: toNominationDto(rows[0], { withFullEvidence: true }),
      });
    }

    // Danh sách công khai (chỉ APPROVED)
    const conditions = ["n.status = 'APPROVED'"];
    const params: unknown[] = [];

    if (field) {
      params.push(field);
      conditions.push(`n.field = $${params.length}`);
    }

    if (orgUnitId > 0) {
      params.push(orgUnitId);
      conditions.push(`n.org_unit_id = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const countRows = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM nominations n WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const rows = await query<NominationRow>(
      `${NOMINATION_SELECT} WHERE ${whereClause} ORDER BY n.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    return NextResponse.json({
      ok: true,
      nominations: rows.map((r) => toNominationDto(r, { withFullEvidence: false })),
      total,
      totalPages,
      page,
    });
  } catch (e) {
    console.warn("[DE_CU] Lỗi truy vấn:", (e as Error).message);
    return NextResponse.json({
      ok: true,
      nominations: [],
      total: 0,
      totalPages: 1,
      page: 1,
      error: (e as Error).message,
    });
  }
}

/**
 * POST /api/de-cu — Cán bộ/Đoàn trường nộp đề cử gương mặt nhân tài
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }

  const session = await sessionOf(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
  }

  if (session.role === "DOAN_VIEN" || !ALLOWED_SUBMIT_ROLES.includes(session.role)) {
    return NextResponse.json(
      { ok: false, error: "CHỈ TỔ CHỨC ĐOÀN CÁC CẤP MỚI ĐƯỢC ĐỀ CỬ NHÂN TÀI" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    nomineeName?: string;
    nomineePosition?: string;
    orgUnitId?: number;
    field?: string;
    quote?: string;
    achievements?: string;
    evidenceDataUrl?: string;
    evidenceThumbDataUrl?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
  }

  const nomineeName = (body.nomineeName ?? "").trim();
  const nomineePosition = (body.nomineePosition ?? "").trim() || null;
  const orgUnitId = Number(body.orgUnitId) || 0;
  const field = (body.field ?? "").trim();
  const quote = (body.quote ?? "").trim() || null;
  const achievements = (body.achievements ?? "").trim();
  const evidenceDataUrl = body.evidenceDataUrl ?? "";
  const evidenceThumbDataUrl = body.evidenceThumbDataUrl ?? "";

  if (nomineeName.length < 2 || nomineeName.length > 120) {
    return NextResponse.json({ ok: false, error: "HỌ TÊN NGƯỜI ĐƯỢC ĐỀ CỬ TỪ 2 ĐẾN 120 KÝ TỰ" }, { status: 400 });
  }

  if (!NOMINATION_FIELDS.includes(field as (typeof NOMINATION_FIELDS)[number])) {
    return NextResponse.json({ ok: false, error: "LĨNH VỰC ĐỀ CỬ KHÔNG HỢP LỆ" }, { status: 400 });
  }

  if (quote && quote.length > 300) {
    return NextResponse.json({ ok: false, error: "CHÂM NGÔN / TRÍCH DẪN TỐI ĐA 300 KÝ TỰ" }, { status: 400 });
  }

  if (achievements.length < 30 || achievements.length > 4000) {
    return NextResponse.json({ ok: false, error: "THÀNH TÍCH ĐỀ CỬ TỪ 30 ĐẾN 4000 KÝ TỰ" }, { status: 400 });
  }

  if (orgUnitId <= 0) {
    return NextResponse.json({ ok: false, error: "VUI LÒNG CHỌN ĐƠN VỊ / TRƯỜNG HỌC" }, { status: 400 });
  }

  // Đơn vị được đề cử phải là trường cấp 4
  const schoolRows = await query<{ id: string; org_level: number }>(
    "SELECT id, org_level FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
    [orgUnitId]
  );
  if (!schoolRows[0] || Number(schoolRows[0].org_level) !== 4) {
    return NextResponse.json({ ok: false, error: "ĐƠN VỊ ĐỀ CỬ PHẢI LÀ ĐƠN VỊ TRƯỜNG HỌC (CẤP 4)" }, { status: 400 });
  }

  // Kiểm tra ảnh minh chứng
  if (!dataUrlGuard(evidenceDataUrl, FULL_EVIDENCE_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "ẢNH MINH CHỨNG PHẢI ĐÚNG ĐỊNH DẠNG JPEG/PNG/WEBP (TỐI ĐA 5MB)" }, { status: 400 });
  }

  if (!dataUrlGuard(evidenceThumbDataUrl, THUMB_EVIDENCE_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "ẢNH THUMB MINH CHỨNG KHÔNG HỢP LỆ (TỐI ĐA 800KB)" }, { status: 400 });
  }

  // Kiểm duyệt nội dung bằng rule + AI
  const modText = `${achievements}\n${nomineeName}${quote ? "\n" + quote : ""}`;
  const modResult = await moderateStoryText(modText);

  // Ảnh minh chứng lưu thành tệp trên máy chủ (/uploads/binh-chon/...) — DB chỉ giữ đường dẫn
  let evidenceUrl: string;
  let evidenceThumbUrl: string;
  try {
    evidenceUrl = await storeImageDataUrl(evidenceDataUrl, "binh-chon", session.accountId);
    evidenceThumbUrl = await storeImageDataUrl(evidenceThumbDataUrl, "binh-chon", session.accountId);
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ ok: false, error: `ẢNH MINH CHỨNG KHÔNG HỢP LỆ: ${err.message}` }, { status: 400 });
    }
    console.error("[DE_CU] Lỗi lưu ảnh:", err);
    return NextResponse.json({ ok: false, error: "LUU_ANH_THAT_BAI" }, { status: 500 });
  }

  try {
    const insertRows = await query<{ id: string }>(
      `INSERT INTO nominations (
        nominee_name, nominee_position, org_unit_id, field, quote,
        achievements, evidence_data_url, evidence_thumb_data_url,
        submitter_account_id, ai_verdict, ai_reason, ai_model,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
      RETURNING id`,
      [
        nomineeName,
        nomineePosition,
        orgUnitId,
        field,
        quote,
        achievements,
        evidenceUrl,
        evidenceThumbUrl,
        session.accountId,
        modResult.verdict,
        modResult.reason ?? null,
        modResult.model ?? null,
      ]
    );

    return NextResponse.json({
      ok: true,
      id: Number(insertRows[0].id),
      aiVerdict: modResult.verdict,
    });
  } catch (e) {
    console.error("[DE_CU] Lỗi ghi DB:", e);
    return NextResponse.json({ ok: false, error: "GHI_DB_THAT_BAI" }, { status: 500 });
  }
}
