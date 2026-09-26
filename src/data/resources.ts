import type { Resource, SystemSetting } from "@/types";

export const resources: Resource[] = [
  { id: 1, resourceTypeId: 1, title: "Tài liệu hướng dẫn sử dụng Cổng TNTH cho đơn vị cơ sở", description: "Hướng dẫn từng bước cập nhật hoạt động, nộp minh chứng và theo dõi xác nhận.", fileName: "huong-dan-su-dung-cong-tnth.pdf", fileSizeKb: 4820, isPublic: true, downloadCount: 3421, publishedByOrgUnitId: 1, publishedAt: "2026-07-01T02:00:00Z", status: "PUBLISHED" },
  { id: 2, resourceTypeId: 2, title: "Biểu mẫu báo cáo phong trào tháng (template)", description: "Mẫu báo cáo tháng chuẩn hóa, điền trực tiếp hoặc dùng khi không có mạng.", fileName: "bm-bao-cao-thang-2026.docx", fileSizeKb: 156, isPublic: true, downloadCount: 1876, publishedByOrgUnitId: 1, publishedAt: "2026-07-05T02:00:00Z", status: "PUBLISHED" },
  { id: 3, resourceTypeId: 2, title: "Quy trình phân bổ chỉ tiêu nhiều cấp", description: "Sơ đồ nghiệp vụ phân bổ chỉ tiêu TW → tỉnh → phường → trường kèm ví dụ đối chiếu.", fileName: "quy-trinh-phan-bo-chi-tieu.pdf", fileSizeKb: 920, isPublic: true, downloadCount: 654, publishedByOrgUnitId: 1, publishedAt: "2026-07-20T02:00:00Z", status: "PUBLISHED" },
  { id: 4, resourceTypeId: 3, title: "Bộ nhận diện Tháng Thanh niên 2026", description: "Poster, banner, khung avatar Facebook/Instagram phục vụ truyền thông Tháng 3.", fileName: "bo-nhan-dien-thang-3-2026.zip", fileSizeKb: 15600, isPublic: true, downloadCount: 8920, publishedByOrgUnitId: 1, publishedAt: "2026-02-20T02:00:00Z", status: "PUBLISHED" },
  { id: 5, resourceTypeId: 1, title: "Nội quy chấm điểm thi đua — dành cho hội đồng chuyên gia", description: "Hướng dẫn định lượng, cách cho điểm tiêu chí EXPERT_REVIEW.", fileName: "noi-quy-cham-diem-hoi-dong.pdf", fileSizeKb: 380, isPublic: false, downloadCount: 87, publishedByOrgUnitId: 1, publishedAt: "2026-08-10T02:00:00Z", status: "PUBLISHED" },
  { id: 6, resourceTypeId: 3, title: "Video mẫu nhật ký trải nghiệm nghề nghiệp", description: "Video 3 phút giới thiệu cách làm nhật ký trải nghiệm sinh động, đạt giải A cuộc thi truyền thông 2025.", fileName: "video-nhat-ky-trai-nghiem.mp4", fileSizeKb: 48600, isPublic: true, downloadCount: 2340, publishedByOrgUnitId: 12, publishedAt: "2026-06-15T02:00:00Z", status: "PUBLISHED" },
  { id: 7, resourceTypeId: 2, title: "Biểu mẫu đăng ký tài khoản đơn vị mới", description: "Form đăng ký cấp tài khoản cho đơn vị Đoàn chưa có trên hệ thống.", fileName: "bm-dang-ky-tai-khoan.xlsx", fileSizeKb: 42, isPublic: false, downloadCount: 156, publishedByOrgUnitId: 1, publishedAt: "2026-05-01T02:00:00Z", status: "PUBLISHED" },
  { id: 8, resourceTypeId: 1, title: "Đề cương hội trại 'Tuổi trẻ Việt Nam - Khát vọng vươn xa'", description: "Tài liệu nội bộ phục vụ hội trại tháng 8 (đã lưu trữ sau sự kiện).", fileName: "de-cuong-hoi-trai-8-2026.pdf", fileSizeKb: 1240, isPublic: false, downloadCount: 45, publishedByOrgUnitId: 12, publishedAt: "2026-07-25T02:00:00Z", status: "ARCHIVED" },
  { id: 9, resourceTypeId: 3, title: "Poster 'Học sinh 3 tốt' năm học 2026-2027", description: "Poster tuyên truyền tiêu chuẩn Học sinh 3 tốt cấp THCS, THPT.", fileName: "poster-hoc-sinh-3-tot-2026.pdf", fileSizeKb: 2350, isPublic: true, downloadCount: 4110, publishedByOrgUnitId: 1, publishedAt: "2026-08-15T02:00:00Z", status: "PUBLISHED" },
  { id: 10, resourceTypeId: 1, title: "Bản nháp hướng dẫn chấm điểm chuyên gia (chưa công bố)", description: "Bản thảo đang xây dựng, chưa phát hành.", fileName: "hd-cham-diem-chuyen-gia-draft.pdf", fileSizeKb: 210, isPublic: false, downloadCount: 0, publishedByOrgUnitId: 1, publishedAt: "2026-09-20T02:00:00Z", status: "DRAFT" },
];

export const systemSettings: SystemSetting[] = [
  { settingKey: "site.name", value: "Cổng Thanh niên Trường học", valueType: "STRING", groupName: "Công khai", description: "Tên website hiển thị header, tiêu đề SEO" },
  { settingKey: "site.slogan", value: "Sức trẻ trường học — Cống hiến và lớn lên", valueType: "STRING", groupName: "Công khai", description: "Khẩu hiệu hiển thị dưới logo" },
  { settingKey: "site.contact_email", value: "tnth@doanthanhnienvn.vn", valueType: "STRING", groupName: "Công khai", description: "Email liên hệ hiển thị footer" },
  { settingKey: "site.hotline", value: "024.38253271", valueType: "STRING", groupName: "Công khai", description: "Đường dây nóng" },
  { settingKey: "feature.hs3t_link", value: "https://hoc-sinh-3-tot.vn", valueType: "STRING", groupName: "Tính năng", description: "Link banner Học sinh 3 tốt trên trang chủ" },
  { settingKey: "feature.ai_chat", value: "true", valueType: "BOOLEAN", groupName: "Tính năng", description: "Bật/tắt trợ lý ảo chat trên website công khai" },
  { settingKey: "feature.ai_report_draft", value: "true", valueType: "BOOLEAN", groupName: "Tính năng", description: "Cho phép tạo nháp báo cáo bằng AI" },
  { settingKey: "feedback.rate_limit_hours", value: "1", valueType: "NUMBER", groupName: "Phản ánh", description: "Số giờ tối thiểu giữa 2 lần gửi từ 1 IP" },
  { settingKey: "ranking.lock_period_days", value: "7", valueType: "NUMBER", groupName: "Xếp hạng", description: "Số ngày công bố trước khi chốt vĩnh viễn kỳ xếp hạng" },
  { settingKey: "notify.deadline_d7", value: "true", valueType: "BOOLEAN", groupName: "Thông báo", description: "Gửi thông báo D-7 khi nhiệm vụ sắp đến hạn" },
  { settingKey: "notify.deadline_d3", value: "true", valueType: "BOOLEAN", groupName: "Thông báo", description: "Gửi thông báo D-3 nhắc khẩn" },
];
