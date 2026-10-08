/** Địa chỉ chính thức của website (không www) — dùng cho sitemap, robots, canonical. */
export const SITE_URL = "https://thanhnientruonghoc.io.vn";

export interface SitemapPost {
  slug: string;
  updatedAt: Date | string;
}

/**
 * Danh sách bài viết đã xuất bản để đưa vào sitemap.
 *
 * Hiện trả về rỗng: bài viết mới chỉ là dữ liệu mẫu nên chưa cho Google lập chỉ mục.
 * Khi backend nối PostgreSQL, thay thân hàm bằng truy vấn, ví dụ:
 *   SELECT slug, updated_at FROM posts WHERE status = 'PUBLISHED' AND deleted_at IS NULL
 * rồi bỏ quy tắc "noindex" trong deploy/Caddyfile.
 */
export async function getSitemapPosts(): Promise<SitemapPost[]> {
  return [];
}
