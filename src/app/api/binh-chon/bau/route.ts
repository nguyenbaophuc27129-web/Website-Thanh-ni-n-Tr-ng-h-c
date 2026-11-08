import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { campaignOpenNow, getActiveCampaign } from "@/lib/server/binh-chon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/binh-chon/bau — bỏ phiếu { storyId }.
 * Mỗi tài khoản ACTIVE 01 phiếu/chiến dịch, đổi được tới khi chiến dịch kết thúc.
 * withTransaction + SELECT … FOR UPDATE chống đếm lệch khi tranh chấp.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập để bình chọn." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { storyId?: number } | null;
  const storyId = Number(body?.storyId);
  if (!Number.isInteger(storyId)) return NextResponse.json({ ok: false, error: "Thiếu mã bài dự thi." }, { status: 400 });

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
      // Khoá phiếu hiện tại của voter để tránh tranh chấp đồng thời
      const existing = await tx.query<{ id: number | string; story_id: number | string }>(
        "SELECT id, story_id FROM hs3t_votes WHERE campaign_id = $1 AND voter_account_id = $2 FOR UPDATE",
        [campaign.id, session.accountId]
      );
      const prev = existing.rows[0];

      if (!prev) {
        await tx.query(
          "INSERT INTO hs3t_votes (campaign_id, voter_account_id, story_id) VALUES ($1,$2,$3)",
          [campaign.id, session.accountId, storyId]
        );
        const up = await tx.query<{ vote_count: number }>(
          "UPDATE hs3t_stories SET vote_count = vote_count + 1, updated_at = now() WHERE id = $1 AND status = 'APPROVED' RETURNING vote_count",
          [storyId]
        );
        if (up.rows.length === 0) throw new Error("STORY_NOT_APPROVED");
        return { myVoteStoryId: storyId, newCount: Number(up.rows[0].vote_count) };
      }

      const prevStoryId = Number(prev.story_id);
      if (prevStoryId === storyId) {
        // Bầu lại chính bài cũ — no-op
        const cur = await tx.query<{ vote_count: number }>(
          "SELECT vote_count FROM hs3t_stories WHERE id = $1",
          [storyId]
        );
        return { myVoteStoryId: storyId, newCount: Number(cur.rows[0]?.vote_count ?? 0), noop: true };
      }

      // Đổi phiếu: -1 bài cũ, +1 bài mới
      await tx.query("UPDATE hs3t_votes SET story_id = $1, updated_at = now() WHERE id = $2", [storyId, prev.id]);
      await tx.query(
        "UPDATE hs3t_stories SET vote_count = GREATEST(vote_count - 1, 0), updated_at = now() WHERE id = $1",
        [prevStoryId]
      );
      const up = await tx.query<{ vote_count: number }>(
        "UPDATE hs3t_stories SET vote_count = vote_count + 1, updated_at = now() WHERE id = $1 AND status = 'APPROVED' RETURNING vote_count",
        [storyId]
      );
      if (up.rows.length === 0) throw new Error("STORY_NOT_APPROVED");
      return { myVoteStoryId: storyId, newCount: Number(up.rows[0].vote_count), previousStoryId: prevStoryId };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "VOTE_FAILED";
    console.warn("[TNTH][BINH-CHON] Bỏ phiếu lỗi:", message);
    return NextResponse.json({ ok: false, error: "Không bỏ được phiếu — thử lại." }, { status: 500 });
  }
}
