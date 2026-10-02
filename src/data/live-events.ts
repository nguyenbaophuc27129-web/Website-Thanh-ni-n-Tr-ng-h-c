import type { LiveEvent } from "@/types";

/** Seed sự kiện trực tiếp — timestamp ngày 27/09/2026 */
export const liveEvents: LiveEvent[] = [
  { id: 1, orgUnitId: 31, eventType: "ACTIVITY_SUBMITTED", title: "THPT Chánh Phú Hưng cập nhật hoạt động \"Sinh hoạt chi đoàn chuyên đề tháng 9\"", createdAt: "2026-09-27T02:05:00Z" },
  { id: 2, orgUnitId: 25, eventType: "TASK_ASSIGNED", title: "Đoàn P. Hiệp Thành giao nhiệm vụ \"Kiểm tra công tác Đoàn quý III\" cho 3 trường trực thuộc", createdAt: "2026-09-27T01:40:00Z" },
  { id: 3, orgUnitId: 32, eventType: "TASK_RESULT", title: "THCS Hiệp Thành báo cáo kết quả chỉ tiêu tin bài truyền thông (60%)", createdAt: "2026-09-27T01:22:00Z" },
  { id: 4, orgUnitId: 27, eventType: "ACTIVITY_CONFIRMED", title: "Đoàn P. Tương Bình Hiệp xác nhận hoạt động \"Giải bóng đá Thanh niên Tương Bình Hiệp 2026\"", createdAt: "2026-09-27T00:58:00Z" },
  { id: 5, orgUnitId: 31, eventType: "ATTENDANCE", title: "Lễ ra quân Tháng Thanh niên: thêm 12 lượt điểm danh QR", createdAt: "2026-09-26T08:30:00Z" },
  { id: 6, orgUnitId: 26, eventType: "REPORT_CREATED", title: "Đoàn P. Phú Hòa lập báo cáo tháng 9/2026 (bản nháp)", createdAt: "2026-09-26T07:15:00Z" },
  { id: 7, orgUnitId: 12, eventType: "FEEDBACK_NEW", title: "Phản ánh mới PA-2026-000103 chờ tiếp nhận từ cấp tỉnh", createdAt: "2026-09-26T06:40:00Z" },
  { id: 8, orgUnitId: 45, eventType: "ACTIVITY_SUBMITTED", title: "Đoàn P. Vinh cập nhật hoạt động \"Hiến máu tình nguyện — Giọt hồng\"", createdAt: "2026-09-26T03:10:00Z" },
];
