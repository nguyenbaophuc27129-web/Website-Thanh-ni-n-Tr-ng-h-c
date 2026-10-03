import type { Sponsor } from "@/types";

/**
 * Nhà tài trợ đồng hành Cổng TNTH — hiển thị strip cuối trang chủ
 * và quản trị tại /quan-tri/tai-tro. note = vị trí/hiển thị đã trao quyền lợi.
 */
export const sponsors: Sponsor[] = [
  {
    id: 901,
    name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
    tier: "GOLD",
    websiteUrl: "https://www.bidv.vn",
    note: "Banner trang chủ + logo strip mọi chuyên trang",
    sinceYear: 2025,
    isActive: true,
  },
  {
    id: 902,
    name: "Tập đoàn FPT",
    tier: "GOLD",
    websiteUrl: "https://www.fpt.com.vn",
    note: "Đồng tổ chức vòng thi Kỹ năng số + màn hình chờ dashboard",
    sinceYear: 2026,
    isActive: true,
  },
  {
    id: 903,
    name: "Công ty Cổ phần Sữa Việt Nam (Vinamilk)",
    tier: "SILVER",
    websiteUrl: "https://www.vinamilk.com.vn",
    note: "Logo strip trang chủ — tài trợ Áo ấm mùa đông",
    sinceYear: 2026,
    isActive: true,
  },
  {
    id: 904,
    name: "Viettel Solutions",
    tier: "SILVER",
    note: "Logo strip chuyên trang dự án tình nguyện",
    sinceYear: 2026,
    isActive: true,
  },
  {
    id: 905,
    name: "Nhà xuất bản Kim Đồng",
    tier: "BRONZE",
    note: "Kho sách cho thư viện trường học vùng cao",
    sinceYear: 2024,
    isActive: true,
  },
];
