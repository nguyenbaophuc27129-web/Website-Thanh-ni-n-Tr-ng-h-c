import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  campaignOpenNow,
  dataUrlGuard,
  getActiveCampaign,
  moderateStoryText,
  UNIT_STORY_SELECT,
  toUnitStoryDto,
  type UnitStoryRow,
} from "@/lib/server/binh-chon";
import { FULL_PHOTO_MAX_BYTES, PAGE_SIZE, THUMB_PHOTO_MAX_BYTES } from "@/lib/binh-chon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await sessionFromToken(token) : null;
}

/**
 * GET /api/binh-chon-doan-truong — dữ liệu công khai (khách xem được)
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const storyId = Number(sp.get("storyId")) || 0;
  const session = await sessionOf(request);

  try {
    if (!dbEnabled()) {
      return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
    }

    const campaign = await getActiveCampaign("DOAN_TRUONG");
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });
    }

    // Chi tiết 1 hồ sơ trường
    if (storyId) {
      const rows = await query<UnitStoryRow>(
        `${UNIT_STORY_SELECT} WHERE u.id = $1 LIMIT 1`,
        [storyId]
      );
      const r = rows[0];
      if (!r) return NextResponse.json({ ok: false, error: "KHÔNG_TÌM_THẤY" }, { status: 404 });
      if (r.status !== "APPROVED") {
        const isOwner = session && Number(r.submitted_by_account_id) === session.accountId;
        const isAdmin = session && ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3"].includes(session.role);
        if (!isOwner && !isAdmin) {
          return NextResponse.json({ ok: false, error: "HỒ_SƠ_CHƯA_DUYỆT" }, { status: 403 });
        }
      }
      return NextResponse.json({
        ok: true,
        story: toUnitStoryDto(r, { withPhoto: true }),
      });
    }

    // Danh sách & Thống kê
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || PAGE_SIZE));
    const offset = (page - 1) * limit;
    const qText = sp.get("q")?.trim() || "";
    const provinceId = Number(sp.get("provinceId")) || 0;
    const sort = sp.get("sort") === "new" ? "new" : "hot";

    const conds: string[] = ["u.campaign_id = $1", "u.status = 'APPROVED'"];
    const params: unknown[] = [campaign.id];

    if (qText) {
      params.push(`%${qText}%`);
      const idx = params.length;
      conds.push(`(u.title ILIKE $${idx} OR school.name ILIKE $${idx})`);
    }

    if (provinceId > 0) {
      params.push(`%/1/${provinceId}/%`);
      conds.push(`school.path LIKE $${params.length}`);
    }

    const whereSql = conds.join(" AND ");

    // Đếm tổng hồ sơ + tổng phiếu
    const statRows = await query<{ approved_stories: string; total_votes: string }>(
      `SELECT count(*)::text AS approved_stories,
              COALESCE(sum(vote_count), 0)::text AS total_votes
         FROM unit_stories
        WHERE campaign_id = $1 AND status = 'APPROVED'`,
      [campaign.id]
    );

    const stats = {
      approvedStories: Number(statRows[0]?.approved_stories ?? 0),
      totalVotes: Number(statRows[0]?.total_votes ?? 0),
    };

    const countRows = await query<{ c: string }>(
      `SELECT count(*)::text c FROM unit_stories u JOIN org_units school ON school.id = u.org_unit_id WHERE ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.c ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const orderSql = sort === "new" ? "u.approved_at DESC NULLS LAST, u.id DESC" : "u.vote_count DESC, u.approved_at ASC";

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const rows = await query<UnitStoryRow>(
      `${UNIT_STORY_SELECT} WHERE ${whereSql} ORDER BY ${orderSql} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    // Phiếu của session hiện tại
    let myVoteStoryId: number | null = null;
    let myUnitStory: ReturnType<typeof toUnitStoryDto> | null = null;

    if (session) {
      const voteRows = await query<{ unit_story_id: string }>(
        "SELECT unit_story_id FROM unit_votes WHERE campaign_id = $1 AND voter_account_id = $2 LIMIT 1",
        [campaign.id, session.accountId]
      );
      if (voteRows[0]) myVoteStoryId = Number(voteRows[0].unit_story_id);

      // Nếu là tài khoản trường, tìm hồ sơ trường mình
      if (session.role === "DON_VI" && session.orgUnitId) {
        const myRows = await query<UnitStoryRow>(
          `${UNIT_STORY_SELECT} WHERE u.campaign_id = $1 AND u.org_unit_id = $2 LIMIT 1`,
          [campaign.id, session.orgUnitId]
        );
        if (myRows[0]) myUnitStory = toUnitStoryDto(myRows[0], { withPhoto: true });
      }
    }

    return NextResponse.json({
      ok: true,
      campaign,
      stats,
      stories: rows.map((r) => toUnitStoryDto(r)),
      page,
      totalPages,
      total,
      myVoteStoryId,
      myUnitStory,
    });
  } catch (e) {
    console.warn("[BINH_CHON_DOAN_TRUONG] Lỗi:", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
}

/**
 * POST /api/binh-chon-doan-truong — nộp hồ sơ Đoàn trường (chỉ role DON_VI cấp 4)
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });

  const session = await sessionOf(request);
  if (!session) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  if (session.role !== "DON_VI") {
    return NextResponse.json({ ok: false, error: "CHỈ TÀI KHOẢN ĐOÀN TRƯỜNG MỚI ĐƯỢC NỘP HỒ SƠ" }, { status: 403 });
  }

  const campaign = await getActiveCampaign("DOAN_TRUONG");
  if (!campaign) return NextResponse.json({ ok: false, error: "CHƯA CÓ CHIẾN DỊCH" }, { status: 404 });

  if (!campaignOpenNow(campaign)) {
    return NextResponse.json({ ok: false, error: "CỔNG BÌNH CHỌN ĐOÀN TRƯỜNG ĐANG ĐÓNG" }, { status: 400 });
  }

  // Kiểm tra đơn vị của tài khoản có phải trường cấp 4
  const schoolRows = await query<{ org_level: number }>(
    "SELECT org_level FROM org_units WHERE id = $1 AND deleted_at IS NULL",
    [session.orgUnitId]
  );
  if (!schoolRows[0] || Number(schoolRows[0].org_level) !== 4) {
    return NextResponse.json({ ok: false, error: "ĐƠN VỊ CỦA BẠN KHÔNG PHẢI LÀ ĐOÀN TRƯỜNG CẤP CƠ SỞ" }, { status: 400 });
  }

  // Kiểm tra xem trường đã nộp hồ sơ chưa
  const existingRows = await query<{ id: string }>(
    "SELECT id FROM unit_stories WHERE campaign_id = $1 AND org_unit_id = $2 LIMIT 1",
    [campaign.id, session.orgUnitId]
  );
  if (existingRows.length > 0) {
    return NextResponse.json({ ok: false, error: "TRƯỜNG BẠN ĐÃ NỘP HỒ SƠ THAM GIA RỒI" }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    intro?: string;
    achievements?: string;
    photoDataUrl?: string;
    photoThumbDataUrl?: string;
  } | null;

  if (!body) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const title = (body.title ?? "").trim();
  const intro = (body.intro ?? "").trim();
  const achievements = (body.achievements ?? "").trim() || null;
  const photoDataUrl = body.photoDataUrl ?? "";
  const photoThumbDataUrl = body.photoThumbDataUrl ?? "";

  if (title.length < 2 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "TIÊU ĐỀ HỒ SƠ TỪ 2 ĐẾN 200 KÝ TỰ" }, { status: 400 });
  }

  if (intro.length < 30 || intro.length > 2000) {
    return NextResponse.json({ ok: false, error: "LỜI GIỚI THIỆU TỪ 30 ĐẾN 2000 KÝ TỰ" }, { status: 400 });
  }

  if (!dataUrlGuard(photoDataUrl, FULL_PHOTO_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "ẢNH HỒ SƠ PHẢI ĐÚNG ĐỊNH DẠNG (TỐI ĐA 2MB)" }, { status: 400 });
  }

  if (!dataUrlGuard(photoThumbDataUrl, THUMB_PHOTO_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "ẢNH THUMB KHÔNG HỢP LỆ (TỐI ĐA 400KB)" }, { status: 400 });
  }

  // Kiểm duyệt nội dung
  const modResult = await moderateStoryText(`${title}\n${intro}\n${achievements ?? ""}`);

  try {
    const insertRows = await query<{ id: string }>(
      `INSERT INTO unit_stories (
        campaign_id, org_unit_id, submitted_by_account_id,
        title, intro, achievements,
        photo_data_url, photo_thumb_data_url,
        ai_verdict, ai_reason, ai_model,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
      RETURNING id`,
      [
        campaign.id,
        session.orgUnitId,
        session.accountId,
        title,
        intro,
        achievements,
        photoDataUrl,
        photoThumbDataUrl,
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
    console.error("[BINH_CHON_DOAN_TRUONG] Lỗi ghi DB:", e);
    return NextResponse.json({ ok: false, error: "GHI_DB_THAT_BAI" }, { status: 500 });
  }
}

/**
 * DELETE /api/binh-chon-doan-truong — rút bài của trường mình đang PENDING
 */
export async function DELETE(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });

  const session = await sessionOf(request);
  if (!session || session.role !== "DON_VI") {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN" }, { status: 403 });
  }

  const campaign = await getActiveCampaign("DOAN_TRUONG");
  if (!campaign) return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });

  const del = await query<{ id: string }>(
    "DELETE FROM unit_stories WHERE campaign_id = $1 AND org_unit_id = $2 AND status = 'PENDING' RETURNING id",
    [campaign.id, session.orgUnitId]
  );

  if (del.length === 0) {
    return NextResponse.json({ ok: false, error: "Không có hồ sơ nào đang chờ duyệt để rút." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
