import type { PublishedPost } from "@/types";

/** Tin bài — duyệt từ đóng góp / biên tập tại /quan-tri/xuat-ban, không seed mẫu */
export const publishedPosts: PublishedPost[] = [];

/** Dữ liệu lượt xem tổng hợp theo ngày (post_view_daily) cho biểu đồ */
export const postViewDaily: { date: string; views: number }[] = [];
