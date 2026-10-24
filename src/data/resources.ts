import type { Resource, SystemSetting } from "@/types";

/* Danh mục tài nguyên bắt đầu trống — toàn bộ tài nguyên do các đơn vị đăng tải lên */
export const resources: Resource[] = [];

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
