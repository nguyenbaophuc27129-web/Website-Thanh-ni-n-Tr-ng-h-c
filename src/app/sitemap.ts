import type { MetadataRoute } from "next";
import { SITE_URL, getSitemapPosts } from "@/lib/seo";

/* Đọc lại danh sách bài tối đa 5 phút một lần, không cần build lại website */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSitemapPosts();

  return [
    /* Không ghi lastModified cho trang chủ: Google bỏ tin lastmod nếu nó đổi mỗi lần đọc */
    { url: SITE_URL },
    ...posts.map((p) => ({
      url: `${SITE_URL}/tin-tuc/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
