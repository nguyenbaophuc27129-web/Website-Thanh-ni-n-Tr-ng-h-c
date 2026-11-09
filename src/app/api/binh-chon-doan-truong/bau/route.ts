import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { campaignOpenNow, getActiveCampaign } from "@/lib/server/binh-chon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await sessionFromToken(token) : null;
}

/**
 * POST /api/binh-chon-doan-truong/bau — Bỏ phiếu hoặc đổi phiếu cho hồ sơ Đoàn trường
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }

  const session = await sessionOf(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
  }

  const campaign = await getActiveCampaign("DOAN_TRUONG");
  if (!campaign) {
    return NextResponse.json({ ok: false, error: "CHƯA CÓ CHIẾN DỊCH" }, { status: 404 });
  }

  if (!campaignOpenNow(campaign)) {
    return NextResponse.json({ ok: false, error: "CỔNG BÌNH CHỌN ĐOÀN TRƯỜNG ĐÃ ĐÓNG HOẶC CHƯA BẮT ĐẦU" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { storyId?: number } | null;
  const storyId = Number(body?.storyId);
  if (!storyId || !Number.isInteger(storyId)) {
    return NextResponse.json({ ok: false, error: "MÃ HỒ SƠ KHÔNG HỢP LỆ" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      // 1. Khóa bản ghi hồ sơ đích và kiểm tra trạng thái APPROVED
      const storyRes = await tx.query<{ id: string; status: string; vote_count: number }>(
        "SELECT id, status, vote_count FROM unit_stories WHERE id = $1 AND campaign_id = $2 FOR UPDATE",
        [storyId, campaign.id]
      );
      const targetStory = storyRes.rows[0];
      if (!targetStory) throw new Error("KHÔNG_TÌM_THẤY_HỒ_SƠ");
      if (targetStory.status !== "APPROVED") throw new Error("HỒ_SƠ_CHƯA_ĐƯỢC_PHÊ_DUYỆT");

      // 2. Kiểm tra phiếu hiện tại của voter trong chiến dịch này
      const currentVoteRes = await tx.query<{ id: string; unit_story_id: string }>(
        "SELECT id, unit_story_id FROM unit_votes WHERE campaign_id = $1 AND voter_account_id = $2 FOR UPDATE",
        [campaign.id, session.accountId]
      );
      const currentVote = currentVoteRes.rows[0];

      if (currentVote) {
        const oldStoryId = Number(currentVote.unit_story_id);
        // Đã bình chọn cho đúng hồ sơ này rồi
        if (oldStoryId === storyId) {
          return { myVoteStoryId: storyId, newCount: targetStory.vote_count };
        }

        // Đổi phiếu: Giảm phiếu hồ sơ cũ
        await tx.query(
          "UPDATE unit_stories SET vote_count = GREATEST(0, vote_count - 1), updated_at = now() WHERE id = $1",
          [oldStoryId]
        );

        // Cập nhật phiếu sang hồ sơ mới
        await tx.query(
          "UPDATE unit_votes SET unit_story_id = $1, updated_at = now() WHERE id = $2",
          [storyId, currentVote.id]
        );
      } else {
        // Chưa bỏ phiếu: Thêm phiếu mới
        await tx.query(
          "INSERT INTO unit_votes (campaign_id, voter_account_id, unit_story_id) VALUES ($1, $2, $3)",
          [campaign.id, session.accountId, storyId]
        );
      }

      // 3. Tăng phiếu cho hồ sơ mới
      const incRes = await tx.query<{ vote_count: number }>(
        "UPDATE unit_stories SET vote_count = vote_count + 1, updated_at = now() WHERE id = $1 RETURNING vote_count",
        [storyId]
      );

      return {
        myVoteStoryId: storyId,
        newCount: incRes.rows[0]?.vote_count ?? targetStory.vote_count + 1,
      };
    });

    return NextResponse.json({
      ok: true,
      myVoteStoryId: result.myVoteStoryId,
      newCount: result.newCount,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[BINH_CHON_DOAN_TRUONG_BAU] Lỗi:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
