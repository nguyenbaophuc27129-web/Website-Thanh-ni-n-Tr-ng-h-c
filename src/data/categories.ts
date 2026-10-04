import type {
  ContentCategory,
  DocumentCategory,
  ResourceType,
  FeedbackTopic,
} from "@/types";

export const contentCategories: ContentCategory[] = [
  { id: 1, code: "HOC_TAP", name: "Học tập, nghiên cứu khoa học", description: "Hoạt động học tập, sáng tạo của học sinh, sinh viên" },
  { id: 2, code: "TINH_NGUYEN", name: "Tình nguyện, cộng đồng" },
  { id: 3, code: "LI_CHUNG", name: "Lịch sử, truyền thống, hành trình đỏ" },
  { id: 4, code: "BAO_VE", name: "Bảo vệ môi trường, an toàn giao thông" },
  { id: 5, code: "AO_DUA", name: "Áo ấm mùa đông, đồng dao vùng cao" },
  { id: 6, code: "THE_DUC", name: "Thể dục thể thao, Đoàn kết sức trẻ" },
  { id: 7, code: "HS_3_TOT", name: "Học sinh 3 tốt", parentId: 1 },
  { id: 8, code: "DN_3_TOT", name: "Đoàn viên 3 tốt" },
];

export const documentCategories: DocumentCategory[] = [
  { id: 1, code: "CHI_THI", name: "Chỉ thị, nghị quyết" },
  { id: 2, code: "KE_HOACH", name: "Kế hoạch" },
  { id: 3, code: "HUONG_DAN", name: "Văn bản hướng dẫn" },
  { id: 4, code: "BAC_CUU", name: "Hướng dẫn thi đua - khen thưởng" },
  { id: 5, code: "TB_KQ", name: "Thông báo kết quả" },
  { id: 6, code: "KHAC", name: "Khác" },
];

export const resourceTypes: ResourceType[] = [
  { id: 1, code: "THIET_KE", name: "Tài nguyên thiết kế" },
  { id: 2, code: "BIEU_MAU", name: "Tài nguyên biểu mẫu" },
  { id: 3, code: "TRUYEN_THONG", name: "Tài nguyên truyền thông" },
  { id: 4, code: "VAN_BAN", name: "Tài nguyên văn bản" },
  {
    id: 5, code: "CLIP_TINH_BAN",
    name: "Clip tuyên truyền Xây dựng tình bạn đẹp, nói không với bạo lực học đường",
    short: "Clip tuyên truyền tình bạn đẹp",
  },
  { id: 6, code: "THONG_DIEP", name: "Thông điệp tuổi trẻ" },
];

export const feedbackTopics: FeedbackTopic[] = [
  { id: 1, code: "HOAT_DONG", name: "Hoạt động, phong trào" },
  { id: 2, code: "NHIEM_VU", name: "Nhiệm vụ, chỉ tiêu thi đua" },
  { id: 3, code: "XEP_HANG", name: "Xếp hạng, chấm điểm" },
  { id: 4, code: "CONG_KENH", name: "Lỗi kỹ thuật trang web" },
  { id: 5, code: "TAI_KHOAN", name: "Tài khoản, quyền truy cập" },
  {
    id: 7, code: "APP_QLD", name: "Lỗi kỹ thuật app Thanh niên Việt Nam & web Quản lý Đoàn",
    description: "Cán bộ Đoàn, sinh hoạt Đoàn, sổ Đoàn, Đoàn phí…",
  },
  { id: 6, code: "KHAC", name: "Nội dung khác" },
];

/**
 * Từ khóa sự kiện cố định — đơn vị chọn khi đăng bài thay vì tự gõ,
 * thống nhất làm thẻ (#) và trạm lọc trên trang tin tức công khai.
 */
export const EVENT_KEYWORDS: string[] = [
  "Năm học mới",
  "Tuần lễ học đường",
  "Học sinh 3 tốt",
  "Thi đua chào cờ",
  "Mùa hè xanh",
  "Tiếp sức mùa thi",
  "Bảo vệ môi trường",
  "An toàn giao thông",
  "Áo ấm mùa đông",
  "Kỹ năng số",
  "Nhật ký trải nghiệm nghề nghiệp",
  "Kỷ niệm 26/3",
];

/**
 * Chuyên mục trang chủ — bài đăng gắn tag này TỰ ĐỘNG xuất hiện ở khu vực tương ứng:
 * - "Mỗi tuần một câu chuyện đẹp" → carousel "Dòng truyện ánh sáng" trên trang chủ.
 * - "Bản tin nghiên cứu khoa học" → banner Panorama "Nghiên cứu khoa học".
 */
export const SECTION_TAGS: string[] = [
  "Mỗi tuần một câu chuyện đẹp",
  "Bản tin nghiên cứu khoa học",
];

/**
 * Hệ thống nút chuyên mục đặc biệt trên trang chủ — mỗi nút lọc trang tin tức theo tag.
 * Các giai đoạn sau sẽ nâng từng chuyên mục thành trang riêng của nó.
 */
export const SPECIAL_CATEGORIES: { name: string; href: string }[] = [
  { name: "Gương mặt Học sinh 3 tốt", href: "/tin-tuc?q=Gương mặt Học sinh 3 tốt" },
  { name: "Mỗi ngày một tin tốt, mỗi tuần một câu chuyện đẹp", href: "/tin-tuc?q=Mỗi tuần một câu chuyện đẹp" },
  { name: "Hành trình khoa học trẻ", href: "/tin-tuc?q=Hành trình khoa học trẻ" },
  { name: "Học sinh THPT — Công dân toàn cầu", href: "/tin-tuc?q=Công dân toàn cầu" },
  { name: "Câu chuyện \"Tôi là Đảng viên trẻ\"", href: "/tin-tuc?q=Đảng viên trẻ" },
  { name: "Tin tức hoạt động Đoàn", href: "/tin-tuc" },
];
