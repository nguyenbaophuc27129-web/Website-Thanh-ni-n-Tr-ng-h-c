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
  { id: 1, code: "TAI_LIEU", name: "Tài liệu, hướng dẫn" },
  { id: 2, code: "BIEU_MAU", name: "Biểu mẫu, quy trình" },
  { id: 3, code: "SAN_PHAM", name: "Sản phẩm truyền thông" },
];

export const feedbackTopics: FeedbackTopic[] = [
  { id: 1, code: "HOAT_DONG", name: "Hoạt động, phong trào" },
  { id: 2, code: "NHIEM_VU", name: "Nhiệm vụ, chỉ tiêu thi đua" },
  { id: 3, code: "XEP_HANG", name: "Xếp hạng, chấm điểm" },
  { id: 4, code: "CONG_KENH", name: "Cổng thông tin, kỹ thuật" },
  { id: 5, code: "TAI_KHOAN", name: "Tài khoản, quyền truy cập" },
  { id: 6, code: "KHAC", name: "Nội dung khác" },
];
