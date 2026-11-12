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
  { id: 6, code: "THE_DUC", name: "Thể dục thể thao, Đoàn kết sức trẻ" },
  { id: 7, code: "HS_3_TOT", name: "Học sinh 3 tốt", parentId: 1 },
  { id: 8, code: "GUONG_MAT_HS3T_TW", name: "Gương mặt Học sinh 3 tốt cấp Trung ương", description: "Gương mặt tiêu biểu Học sinh 3 tốt cấp Trung ương" },
  { id: 9, code: "HANH_TRINH_KHOA_HOC_TRE", name: "Hành trình khoa học trẻ", description: "Câu chuyện nghiên cứu khoa học, sáng tạo trẻ" },
  { id: 10, code: "CONG_DAN_TOAN_CAU", name: "Học sinh THPT - Công dân toàn cầu", description: "Học sinh THPT với kỹ năng công dân toàn cầu" },
  { id: 11, code: "TOI_LA_DANG_VIEN_TRE", name: "Câu chuyện \"Tôi là Đảng viên trẻ\"", description: "Gương đảng viên trẻ - học sinh THPT" },
  { id: 12, code: "MOI_TUAN_MOT_CAU_CHUYEN", name: "Mỗi tuần một câu chuyện đẹp", description: "Câu chuyện đẹp mỗi tuần — đồng bộ migration 0026" },
  { id: 13, code: "TIN_TUC_HOAT_DONG_DOAN", name: "Tin tức hoạt động Đoàn", description: "Chuyên mục chuẩn cho tin hoạt động Đoàn - Hội" },
  { id: 14, code: "CHIEN_DICH_TNCL", name: "Chiến dịch tình nguyện chủ lực", description: "Tiếp sức mùa thi · Hoa phượng đỏ · Mùa hè xanh — ba chiến dịch chủ lực khối trường học" },
  { id: 15, code: "THANH_NIEN_TRUONG_HOC", name: "Thanh niên Trường học", description: "Tin bài do Ban biên tập Cổng Thanh niên Trường học (Trung ương Đoàn) thực hiện và tổng hợp" },
];

export const documentCategories: DocumentCategory[] = [
  { id: 1, code: "CHI_THI", name: "Chỉ thị, nghị quyết" },
  { id: 2, code: "KE_HOACH", name: "Kế hoạch" },
  { id: 3, code: "HUONG_DAN", name: "Văn bản hướng dẫn" },
  { id: 4, code: "BAC_CUU", name: "Hướng dẫn thi đua - khen thưởng" },
  { id: 5, code: "TB_KQ", name: "Thông báo kết quả" },
  { id: 6, code: "KHAC", name: "Khác" },
  { id: 7, code: "VBQPPL", name: "Văn bản quy phạm pháp luật" },
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
  { id: 7, code: "HINH_ANH", name: "Hình ảnh (jpg, png)" },
  { id: 8, code: "CHU_TRUONG_CHINH_SACH", name: "Chủ trương, chính sách", short: "Chủ trương, chính sách" },
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
  {
    id: 8, code: "AN_TOAN", name: "Bảo vệ an toàn — bạo lực, bạo hành, xâm hại",
    description: "Được chuyển thẳng tới chuyên gia tâm lý, pháp lý — bảo mật danh tính tuyệt đối",
  },
  { id: 6, code: "KHAC", name: "Nội dung khác" },
];

/**
 * Từ khóa sự kiện cố định — đơn vị chọn khi đăng bài thay vì tự gõ,
 * thống nhất làm thẻ (#) và trạm lọc trên trang tin tức công khai.
 * Đã bổ sung 3 chiến dịch tình nguyện chủ lực của khối trường học.
 */
export const EVENT_KEYWORDS: string[] = [
  "Chiến dịch Tiếp sức mùa thi",
  "Chiến dịch Hoa phượng đỏ",
  "Chiến dịch Mùa hè xanh",
  "Năm học mới",
  "Tuần lễ học đường",
  "Học sinh 3 tốt",
  "Thi đua chào cờ",
  "Bảo vệ môi trường",
  "An toàn giao thông",
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
  "Thanh niên Trường học",
  "Mỗi tuần một câu chuyện đẹp",
  "Bản tin nghiên cứu khoa học",
  "Gương mặt Học sinh 3 tốt cấp Trung ương",
  "Hành trình khoa học trẻ",
  "Học sinh THPT - Công dân toàn cầu",
  "Câu chuyện \"Tôi là Đảng viên trẻ\"",
];

/**
 * Hệ thống nút chuyên mục nổi bật trên trang chủ — ĐỒNG BỘ với Cổng Tin tức
 * (6 chuyên mục, lãnh đạo chốt 10/11/2026). Mỗi nút lọc trang tin theo chuyên mục.
 */
export const SPECIAL_CATEGORIES: { name: string; href: string }[] = [
  { name: "Chiến dịch tình nguyện chủ lực", href: `/tin-tuc?cat=${encodeURIComponent("Chiến dịch tình nguyện chủ lực")}` },
  { name: "Gương mặt Học sinh 3 tốt", href: `/tin-tuc?cat=${encodeURIComponent("Gương mặt Học sinh 3 tốt cấp Trung ương")}` },
  { name: "Mỗi ngày một tin tốt, mỗi tuần một câu chuyện đẹp", href: `/tin-tuc?cat=${encodeURIComponent("Mỗi tuần một câu chuyện đẹp")}` },
  { name: "Hành trình khoa học trẻ", href: `/tin-tuc?cat=${encodeURIComponent("Hành trình khoa học trẻ")}` },
  { name: "Câu chuyện \"Tôi là Đảng viên trẻ\"", href: `/tin-tuc?cat=${encodeURIComponent('Câu chuyện "Tôi là Đảng viên trẻ"')}` },
  { name: "Tin tức hoạt động Đoàn", href: `/tin-tuc?cat=${encodeURIComponent("Tin tức hoạt động Đoàn")}` },
];

/**
 * Chuyên mục mặc định cho nội dung do Ban biên tập TW tự làm (viết tay / nhập từ link)
 * — YCCN 12/11/2026: KHÔNG dùng chung "Tin tức hoạt động Đoàn" (đơn vị cơ sở),
 * nội dung tự làm phải nằm ở chuyên mục riêng "Thanh niên Trường học" (id 15).
 * Bài tạo TỪ HOẠT ĐỘNG vẫn ưu tiên chuyên mục dẫn xuất từ hoạt động.
 */
export const DEFAULT_POST_CATEGORY = "Thanh niên Trường học";
