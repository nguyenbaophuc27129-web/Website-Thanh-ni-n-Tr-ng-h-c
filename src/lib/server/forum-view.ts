/**
 * "Che" dòng diễn đàn theo người xem — MỘT hàm dùng chung cho snapshot GET /api/store
 * (store-read-policy) và dòng các API /api/dien-dan/* trả về (hợp đồng 2):
 *   - authorAccountId: id người xem nếu là bài/bình luận của họ, ngược lại null;
 *   - likedByAccountIds: [id người xem] nếu họ đã thích, ngược lại [];
 *   - likeCount: tổng số lượt thích;
 *   - dấu vết kiểm duyệt (aiReason / aiModel / moderatedByAccountId / rejectionReason) chỉ còn
 *     với dòng của người xem hoặc với cán bộ có quyền kiểm duyệt (forum.manage).
 * Chỉ QUAN_TRI_TW (isTW) nhận dòng đủ cột, thêm likeCount. Cán bộ khác — kể cả có forum.manage —
 * KHÔNG thấy ai là tác giả hay ai đã thích: kiểm duyệt không cần danh tính.
 * Vì vậy dòng diễn đàn không được ghi ngược lên qua /api/store (xem API_ONLY_ENTITIES).
 *
 * Không import module nào khác: store-read-policy được nạp cả ngoài Next (script kiểm thử).
 */

export interface ForumViewer {
  /** Tài khoản người xem; null = khách */
  accountId: number | null;
  /** Quản trị Trung ương — xem đủ cột */
  isTW: boolean;
  /** Cán bộ có quyền forum.manage — giữ dấu vết kiểm duyệt trên mọi dòng */
  canModerate: boolean;
}

type Row = Record<string, unknown>;

/** Che dòng NGAY TRÊN `row` (dòng vừa đọc từ DB, chưa ai khác giữ) */
export function maskForumRow(row: Row, viewer: ForumViewer): void {
  const liked = Array.isArray(row.likedByAccountIds) ? (row.likedByAccountIds as unknown[]).map(Number) : [];
  row.likeCount = liked.length;
  if (viewer.isTW) {
    row.likedByAccountIds = liked;
    return;
  }
  const me = viewer.accountId;
  const own = me !== null && Number(row.authorAccountId) === me;
  row.likedByAccountIds = me !== null && liked.includes(me) ? [me] : [];
  row.authorAccountId = own ? me : null;
  if (!own && !viewer.canModerate) {
    delete row.aiReason;
    delete row.aiModel;
    delete row.moderatedByAccountId;
    delete row.rejectionReason;
  }
}

/** Bản đã che của `row` (không đụng vào `row` gốc) */
export function viewForumRow(row: Row, viewer: ForumViewer): Row {
  const out = { ...row };
  maskForumRow(out, viewer);
  return out;
}
