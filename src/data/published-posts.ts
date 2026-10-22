import type { PublishedPost } from "@/types";

/**
 * Tin bài công khai — danh sách đã được dọn sạch dữ liệu mẫu để sẵn sàng thí điểm dữ liệu thật.
 * Các đơn vị Đoàn đăng bài tại khu Quản trị (/quan-tri/xuat-ban) để xuất bản lên cổng.
 */
export const publishedPosts: PublishedPost[] = [];

/** Dữ liệu lượt xem tổng hợp theo ngày (post_view_daily) cho biểu đồ */
export const postViewDaily: { date: string; views: number }[] = [];
