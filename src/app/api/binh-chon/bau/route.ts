import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { campaignOpenNow, getActiveCampaign } from "@/lib/server/binh-chon";
import { verifyGoogleCredential } from "@/lib/server/google-verify";
import { setVoteEmail } from "@/lib/server/vote-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/binh-chon/bau — bỏ phiếu { storyId, credential? } (chỉ đạo lãnh đạo 09/11/2026):
 * - Định danh người bình chọn: tài khoản hệ thống (đã đăng nhập) HOẶC Gmail xác thực Google (khách).
 * - Một định danh bình chọn cho MỘT người chỉ MỘT lần — lần 2 bị hệ thống lọc thành
 *   phiếu KHÔNG HỢP LỆ (ghi nhận is_valid=false, reason TRUNG_LAP, không cộng điểm).
 * - withTransaction + index riêng biệt chống tranh chấp đồng thời.
 * - Sau bình chọn bằng Gmail: đặt cookie tnth_vote_email (có chữ ký, lib/server/vote-cookie.ts) để GET biết phiếu của mình.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;

  const body = (await request.json().catch(() => null)) as { storyId?: number; credential?: string } | null;
  const storyId = Number(body?.storyId);
  if (!Number.isInteger(storyId)) return NextResponse.json({ ok: false, error: "Thiếu mã bài dự thi." }, { status: 400 });

  // ═══ Xác định định danh người bình chọn ═══
  let voterAccountId: number | null = null;
  let voterEmail: string | null = null;
  let viaGoogle = false;
  if (session) {
    voterAccountId = session.accountId;
  } else if (body?.credential) {
    const gu = await verifyGoogleCredential(body.credential);
    if (!gu) {
      return NextResponse.json(
        { ok: false, error: "Xác thực Google không hợp lệ — hãy xác thực lại bằng Gmail." },
        { status: 401 }
      );
    }
    voterEmail = gu.email;
    viaGoogle = true;
  } else {
    return NextResponse.json(
      { ok: false, error: "Cần xác thực Gmail để bình chọn.", needAuth: true },
      { status: 401 }
    );
  }

  const campaign = await getActiveCampaign("HS3T");
  if (!campaign) return NextResponse.json({ ok: false, error: "Chưa có chiến dịch bình chọn." }, { status: 404 });
  if (!campaignOpenNow(campaign)) {
    return NextResponse.json({ ok: false, error: "Bình chọn đã kết thúc hoặc chưa mở." }, { status: 409 });
  }

  const storyRows = await query<{ status: string; campaign_id: number | string }>(
    "SELECT status, campaign_id FROM hs3t_stories WHERE id = $1 LIMIT 1",
    [storyId]
  );
  const story = storyRows[0];
  if (!story || Number(story.campaign_id) !== campaign.id) {
    return NextResponse.json({ ok: false, error: "Bài dự thi không tồn tại." }, { status: 404 });
  }
  if (story.status !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Bài này chưa được duyệt công khai." }, { status: 409 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      // Đã có phiếu HỢP LỆ của định danh này cho gương này → lần 2 = phiếu không hợp lệ
      const dup = voterAccountId
        ? await tx.query<{ id: number | string }>(
            "SELECT id FROM hs3t_votes WHERE campaign_id = $1 AND story_id = $2 AND voter_account_id = $3 AND is_valid LIMIT 1",
            [campaign.id, storyId, voterAccountId]
          )
        : await tx.query<{ id: number | string }>(
            "SELECT id FROM hs3t_votes WHERE campaign_id = $1 AND story_id = $2 AND lower(voter_email) = lower($3) AND is_valid LIMIT 1",
            [campaign.id, storyId, voterEmail]
          );

      if (dup.rows[0]) {
        // Ghi nhận phiếu trùng thành KHÔNG HỢP LỆ — không cộng điểm
        await tx.query(
          "INSERT INTO hs3t_votes (campaign_id, voter_account_id, voter_email, story_id, is_valid, invalid_reason) VALUES ($1,$2,$3,$4,false,'TRUNG_LAP')",
          [campaign.id, voterAccountId, voterEmail, storyId]
        );
        const cur = await tx.query<{ vote_count: number }>("SELECT vote_count FROM hs3t_stories WHERE id = $1", [storyId]);
        return { invalid: true, newCount: Number(cur.rows[0]?.vote_count ?? 0) };
      }

      // Phiếu hợp lệ đầu tiên
      await tx.query(
        "INSERT INTO hs3t_votes (campaign_id, voter_account_id, voter_email, story_id, is_valid) VALUES ($1,$2,$3,$4,true)",
        [campaign.id, voterAccountId, voterEmail, storyId]
      );
      const up = await tx.query<{ vote_count: number }>(
        "UPDATE hs3t_stories SET vote_count = vote_count + 1, updated_at = now() WHERE id = $1 AND status = 'APPROVED' RETURNING vote_count",
        [storyId]
      );
      if (up.rows.length === 0) throw new Error("STORY_NOT_APPROVED");
      return { invalid: false, newCount: Number(up.rows[0].vote_count) };
    });

    const res = NextResponse.json({
      ok: true,
      ...result,
      message: result.invalid
        ? "Bạn đã bình chọn cho gương này trước đó — phiếu lần này được ghi nhận KHÔNG HỢP LỆ."
        : "Bình chọn thành công!",
    });
    if (viaGoogle && voterEmail) {
      setVoteEmail(res, voterEmail, 60 * 60 * 24 * 30);
    }
    return res;
  } catch (err) {
    // Vượt unique index (race) → coi như phiếu trùng bị lọc
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json({
        ok: true,
        invalid: true,
        message: "Bạn đã bình chọn cho gương này trước đó — phiếu lần này được ghi nhận KHÔNG HỢP LỆ.",
      });
    }
    const message = err instanceof Error ? err.message : "VOTE_FAILED";
    console.warn("[TNTH][BINH-CHON] Bỏ phiếu lỗi:", message);
    return NextResponse.json({ ok: false, error: "Không bỏ được phiếu — thử lại." }, { status: 500 });
  }
}
