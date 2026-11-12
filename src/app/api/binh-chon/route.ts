import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  campaignOpenNow,
  dataUrlGuard,
  getActiveCampaign,
  moderateStoryText,
  STORY_SELECT,
  toStoryDto,
} from "@/lib/server/binh-chon";
import { verifyGoogleCredential } from "@/lib/server/google-verify";
import { FULL_PHOTO_MAX_BYTES, PAGE_SIZE, THUMB_PHOTO_MAX_BYTES } from "@/lib/binh-chon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HONOR_GROUPS = ["TRUONG", "TINH", "TW_DE_CU"] as const;

async function sessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await sessionFromToken(token) : null;
}

/**
 * GET /api/binh-chon — dữ liệu công khai (khách xem được).
 * ?withBoard=1 → trả thêm topByHonor: top 5 bài APPROVED mỗi nhóm danh hiệu theo phiếu.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const storyId = Number(sp.get("storyId")) || 0;
  const withBoard = sp.get("withBoard") === "1";
  const session = await sessionOf(request);

  try {
    if (!dbEnabled()) {
      return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
    }

    const campaign = await getActiveCampaign("HS3T");
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });
    }

    if (storyId) {
      const rows = await query<Parameters<typeof toStoryDto>[0]>(
        `${STORY_SELECT} WHERE s.id = $1 AND s.status = 'APPROVED' LIMIT 1`,
        [storyId]
      );
      if (rows[0]) {
        return NextResponse.json({ ok: true, campaign, story: toStoryDto(rows[0], { withPhoto: true }) });
      }
      return NextResponse.json({ ok: false, error: "NO_STORY" }, { status: 404 });
    }

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const sort = sp.get("sort") === "new" ? "new" : "hot";
    const q = sp.get("q")?.trim() ?? "";
    const provinceId = Number(sp.get("provinceId")) || 0;
    const honorParam = sp.get("honorLevel") ?? "";

    const where: string[] = ["s.status = 'APPROVED'", "s.campaign_id = $1"];
    const params: unknown[] = [campaign.id];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(s.student_name ILIKE $${params.length} OR school.name ILIKE $${params.length})`);
    }
    if (provinceId) {
      params.push(provinceId);
      where.push(`CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint END = $${params.length}`);
    }
    if (["TRUONG", "TINH", "TW_DE_CU"].includes(honorParam)) {
      params.push(honorParam);
      where.push(`COALESCE(s.honor_level, 'TRUONG') = $${params.length}`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const orderBy = sort === "hot" ? "s.vote_count DESC, s.approved_at ASC" : "s.approved_at DESC";

    const countRows = await query<{ c: string; v: string | null }>(
      `SELECT count(*) c, sum(s.vote_count) v FROM hs3t_stories s JOIN org_units school ON school.id = s.school_org_unit_id ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.c ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;
    const rows = await query<Parameters<typeof toStoryDto>[0]>(
      `${STORY_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    let myVoteStoryId: number | null = null;
    let myVotedStoryIds: number[] = [];
    let myStory = null as ReturnType<typeof toStoryDto> | null;
    // Định danh phiếu của tôi: tài khoản hệ thống HOẶC Gmail đã xác thực (cookie sau khi bình chọn)
    const voteEmailCookie = request.cookies.get("tnth_vote_email")?.value ?? "";
    const voteIdentity: { accountId?: number; email?: string } = {};
    if (session) voteIdentity.accountId = session.accountId;
    else if (voteEmailCookie) voteIdentity.email = voteEmailCookie;
    if (voteIdentity.accountId || voteIdentity.email) {
      const voteRows = await query<{ story_id: number | string }>(
        `SELECT story_id FROM hs3t_votes
          WHERE campaign_id = $1 AND is_valid
            AND (($2::bigint IS NOT NULL AND voter_account_id = $2) OR ($3::text IS NOT NULL AND lower(voter_email) = lower($3)))`,
        [campaign.id, voteIdentity.accountId ?? null, voteIdentity.email ?? null]
      );
      myVotedStoryIds = voteRows.map((r) => Number(r.story_id));
      myVoteStoryId = myVotedStoryIds.length ? myVotedStoryIds[myVotedStoryIds.length - 1] : null;
    }
    if (session || voteEmailCookie) {
      // Bài của tôi: theo tài khoản (nếu đăng nhập) HOẶC Gmail đã xác thực (bài nộp không tài khoản)
      const myRows = await query<Parameters<typeof toStoryDto>[0]>(
        `${STORY_SELECT} WHERE s.campaign_id = $1
           AND (($2::bigint IS NOT NULL AND s.account_id = $2) OR ($3::text IS NOT NULL AND lower(s.submitter_email) = lower($3)))
         ORDER BY s.id DESC LIMIT 1`,
        [campaign.id, session?.accountId ?? null, voteEmailCookie || null]
      );
      if (myRows[0]) myStory = toStoryDto(myRows[0]);
    }

    // Bảng gương theo 3 nhóm danh hiệu (mỗi nhóm top 5 theo phiếu)
    let topByHonor: Record<(typeof HONOR_GROUPS)[number], ReturnType<typeof toStoryDto>[]> | undefined;
    if (withBoard) {
      const boardParams: unknown[] = [campaign.id];
      const boardScope = `q.status = 'APPROVED' AND q.campaign_id = $1`;
      const boardRows = await query<Parameters<typeof toStoryDto>[0]>(
        `SELECT * FROM (${STORY_SELECT}) q WHERE ${boardScope}
          ORDER BY q.honor_level, q.vote_count DESC, q.approved_at ASC`,
        boardParams
      );
      topByHonor = { TRUONG: [], TINH: [], TW_DE_CU: [] };
      for (const r of boardRows) {
        const dto = toStoryDto(r);
        const key = (dto.honorLevel ?? "TRUONG") as (typeof HONOR_GROUPS)[number];
        if (topByHonor[key].length < 5) topByHonor[key].push(dto);
      }
    }

    return NextResponse.json({
      ok: true,
      campaign,
      stats: {
        approvedStories: total,
        totalVotes: Number(countRows[0]?.v ?? 0),
      },
      stories: rows.map((r) => toStoryDto(r)),
      page,
      totalPages,
      total,
      myVoteStoryId,
      myVotedStoryIds,
      myStory,
      topByHonor,
    });
  } catch (err) {
    console.warn("[BINH_CHON] DB query failed:", err);
    if (storyId) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
}

/**
 * DELETE /api/binh-chon — hủy bài của chính mình (PENDING hoặc REJECTED).
 * Định danh: tài khoản đăng nhập HOẶC Gmail đã xác thực (cookie).
 */
export async function DELETE(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const session = await sessionOf(request);
  const voteEmailCookie = request.cookies.get("tnth_vote_email")?.value ?? "";
  if (!session && !voteEmailCookie) {
    return NextResponse.json({ ok: false, error: "Chưa xác định được bài của bạn." }, { status: 401 });
  }

  const deleted = await query<{ id: number; status: string }>(
    `DELETE FROM hs3t_stories
      WHERE status IN ('PENDING','REJECTED')
        AND (($1::bigint IS NOT NULL AND account_id = $1) OR ($2::text IS NOT NULL AND lower(submitter_email) = lower($2)))
      RETURNING id, status`,
    [session?.accountId ?? null, voteEmailCookie || null]
  );
  if (!deleted[0]) {
    return NextResponse.json(
      { ok: false, error: "Không có bài nào có thể hủy (bài đã duyệt không hủy được)." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, id: Number(deleted[0].id) });
}

/**
 * POST /api/binh-chon — đăng bài dự thi.
 * Không cần đăng nhập tài khoản: xác thực Gmail là đủ (credential Google ID token).
 * Có tài khoản Đoàn viên đăng nhập → vẫn nộp theo tài khoản như cũ.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const session = await sessionOf(request);

  const body = (await request.json().catch(() => null)) as
    | {
        studentName?: string;
        className?: string;
        quote?: string;
        story?: string;
        achievements?: string;
        orgDisplayName?: string;
        wardName?: string;
        provinceName?: string;
        honorLevel?: string;
        photoDataUrl?: string;
        photoThumbDataUrl?: string;
        gallery?: { dataUrl?: string; caption?: string }[];
        credential?: string;
      }
    | null;

  // Định danh người nộp: tài khoản Đoàn viên (nếu đăng nhập) HOẶC Gmail đã xác thực
  let accountId: number | null = null;
  let orgUnitId: number | null = null;
  let submitterEmail: string | null = null;
  if (session && session.role === "DOAN_VIEN") {
    accountId = session.accountId;
    orgUnitId = session.orgUnitId;
  } else {
    const gu = await verifyGoogleCredential(body?.credential ?? "");
    if (!gu) {
      return NextResponse.json(
        { ok: false, error: "Cần xác thực Gmail để gửi bài — không cần đăng ký tài khoản.", needAuth: true },
        { status: 401 }
      );
    }
    submitterEmail = gu.email;
  }

  const campaign = await getActiveCampaign("HS3T");
  if (!campaign) return NextResponse.json({ ok: false, error: "Chưa có chiến dịch bình chọn." }, { status: 404 });
  if (!campaignOpenNow(campaign)) {
    return NextResponse.json({ ok: false, error: "Chiến dịch chưa mở hoặc đã kết thúc." }, { status: 409 });
  }

  const studentName = body?.studentName?.trim() ?? "";
  const className = body?.className?.trim().slice(0, 60) || null;
  const quote = body?.quote?.trim().slice(0, 300) || null;
  const story = body?.story?.trim() ?? "";
  const achievements = body?.achievements?.trim().slice(0, 2000) || null;
  const orgDisplayName = body?.orgDisplayName?.trim().slice(0, 120) || null;
  const wardName = body?.wardName?.trim().slice(0, 150) || null;
  const provinceName = body?.provinceName?.trim().slice(0, 150) || null;
  const honorLevel = ["TRUONG", "TINH", "TW_DE_CU"].includes(body?.honorLevel ?? "") ? body!.honorLevel! : "TRUONG";
  if (!studentName || studentName.length > 120) {
    return NextResponse.json({ ok: false, error: "Thiếu hoặc sai họ tên học sinh." }, { status: 400 });
  }
  // Không giới hạn dung lượng trần (nhiều bạn viết rất tâm huyết) — chỉ chặn dưới 30 ký tự + trần phòng thủ 200.000 ký tự
  const storySafe = story.slice(0, 200_000);
  if (storySafe.length < 30) {
    return NextResponse.json({ ok: false, error: "Quá trình phấn đấu cần tối thiểu 30 ký tự." }, { status: 400 });
  }
  if (!dataUrlGuard(body?.photoDataUrl, FULL_PHOTO_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "Ảnh đại diện không hợp lệ hoặc vượt 2MB." }, { status: 400 });
  }
  if (!dataUrlGuard(body?.photoThumbDataUrl, THUMB_PHOTO_MAX_BYTES)) {
    return NextResponse.json({ ok: false, error: "Ảnh thu nhỏ không hợp lệ hoặc vượt 400KB." }, { status: 400 });
  }

  // Thư viện tối đa 3 ảnh kèm caption tự do — mỗi ảnh ≤ 1.5MB (client đã nén)
  const GALLERY_MAX = 3;
  const GALLERY_IMG_BYTES = 1_500_000;
  const galleryRaw = Array.isArray(body?.gallery) ? body.gallery : [];
  if (galleryRaw.length > GALLERY_MAX) {
    return NextResponse.json({ ok: false, error: "Tối đa 3 ảnh kèm câu chuyện." }, { status: 400 });
  }
  const gallery: { data_url: string; caption: string | null }[] = [];
  for (const g of galleryRaw) {
    if (!dataUrlGuard(g?.dataUrl, GALLERY_IMG_BYTES)) {
      return NextResponse.json({ ok: false, error: "Một trong các ảnh kèm không hợp lệ hoặc vượt 1.5MB — thử nén lại ảnh." }, { status: 400 });
    }
    gallery.push({ data_url: g.dataUrl, caption: String(g?.caption ?? "").trim().slice(0, 300) || null });
  }

  if (accountId !== null) {
    const school = await query<{ id: number }>("SELECT id FROM org_units WHERE id = $1 AND deleted_at IS NULL", [
      orgUnitId,
    ]);
    if (!school[0]) {
      return NextResponse.json({ ok: false, error: "Tài khoản chưa gắn vào đơn vị trường hợp lệ — liên hệ Bí thư trường." }, { status: 400 });
    }
  }

  // Kiểm duyệt văn bản
  const textToModerate = [storySafe, quote, achievements].filter(Boolean).join("\n");
  const moderation = await moderateStoryText(textToModerate);

  try {
    const inserted = await query<{ id: number }>(
      `INSERT INTO hs3t_stories
        (campaign_id, account_id, student_name, school_org_unit_id, class_name, quote, story,
         achievements, org_display_name, ward_name, province_name, honor_level,
         photo_data_url, photo_thumb_data_url, gallery, ai_verdict, ai_reason, ai_model, submitter_email, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'PENDING') RETURNING id`,
      [
        campaign.id,
        accountId,
        studentName,
        orgUnitId,
        className,
        quote,
        storySafe,
        achievements,
        orgDisplayName,
        wardName,
        provinceName,
        honorLevel,
        body?.photoDataUrl,
        body?.photoThumbDataUrl,
        gallery.length > 0 ? JSON.stringify(gallery) : null,
        moderation.verdict,
        moderation.reason ?? null,
        moderation.model ?? null,
        submitterEmail,
      ]
    );
    const res = NextResponse.json({ ok: true, id: Number(inserted[0].id) });
    if (submitterEmail) {
      // Ghi nhận Gmail đã xác thực — GET biết "bài của tôi" + tái dùng cho bình chọn
      res.cookies.set("tnth_vote_email", submitterEmail, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      });
    }
    return res;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json(
        {
          ok: false,
          error: submitterEmail
            ? "Gmail này đã gửi bài cho chiến dịch rồi — mỗi Gmail chỉ 1 bài."
            : "Bạn đã đăng bài cho chiến dịch này rồi — mỗi tài khoản chỉ 1 bài.",
        },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "SUBMIT_FAILED";
    console.warn("[TNTH][BINH-CHON] Đăng bài lỗi:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
