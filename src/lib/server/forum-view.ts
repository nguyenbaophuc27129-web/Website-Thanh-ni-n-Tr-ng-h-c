/**
 * "Che" dòng diễn đàn trước khi trả cho khách / đoàn viên (hợp đồng 2):
 *   - authorAccountId: id người xem nếu là bài/bình luận của họ, ngược lại null;
 *   - likedByAccountIds: [id người xem] nếu họ đã thích, ngược lại [];
 *   - likeCount: tổng số lượt thích;
 *   - bỏ aiReason / aiModel / moderatedByAccountId với dòng không phải của người xem.
 * Cán bộ (mọi vai trò khác DOAN_VIEN) nhận đủ dòng, chỉ thêm likeCount.
 */

export interface ForumViewer {
  accountId: number;
  role: string;
}

export function viewForumRow(
  row: Record<string, unknown>,
  viewer: ForumViewer | null,
): Record<string, unknown> {
  const liked = Array.isArray(row.likedByAccountIds) ? (row.likedByAccountIds as number[]).map(Number) : [];
  if (viewer && viewer.role !== "DOAN_VIEN") return { ...row, likedByAccountIds: liked, likeCount: liked.length };

  const me = viewer?.accountId ?? null;
  const own = me !== null && Number(row.authorAccountId) === me;
  const out: Record<string, unknown> = {
    ...row,
    authorAccountId: own ? me : null,
    likedByAccountIds: me !== null && liked.includes(me) ? [me] : [],
    likeCount: liked.length,
  };
  if (!own) {
    delete out.aiReason;
    delete out.aiModel;
    delete out.moderatedByAccountId;
  }
  return out;
}
