import type { TaskAssignment, AssignmentTarget, TaskResult, AssignmentReview } from "@/types";

/**
 * Phân bổ nhiệm vụ nhiều cấp. Chứng minh đối chiếu chỉ tiêu:
 * TW giao Bình Dương 60 hoạt động (A1) → chia 25 + 20 + 15 cho 3 phường (A1a/A1b/A1c).
 */
export const taskAssignments: TaskAssignment[] = [
  // ===== Cấp TW → Tỉnh Đoàn =====
  { id: 100, taskId: 11, orgUnitId: 12, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 56.7, assignedAt: "2026-07-15T02:00:00Z", confirmedAt: "2026-07-16T01:00:00Z" },
  { id: 110, taskId: 12, orgUnitId: 12, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 76.7, assignedAt: "2026-07-15T02:05:00Z", confirmedAt: "2026-07-16T01:05:00Z" },
  { id: 120, taskId: 21, orgUnitId: 12, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 55, assignedAt: "2026-07-15T02:10:00Z", confirmedAt: "2026-07-16T01:10:00Z" },
  { id: 130, taskId: 31, orgUnitId: 12, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-10-31", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 33.3, assignedAt: "2026-08-01T02:00:00Z", confirmedAt: "2026-08-02T01:00:00Z" },
  { id: 140, taskId: 11, orgUnitId: 13, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 44, assignedAt: "2026-07-15T02:15:00Z", confirmedAt: "2026-07-17T01:00:00Z" },
  { id: 141, taskId: 11, orgUnitId: 14, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 44.4, assignedAt: "2026-07-15T02:20:00Z", confirmedAt: "2026-07-17T01:10:00Z" },
  { id: 142, taskId: 11, orgUnitId: 15, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 62.5, assignedAt: "2026-07-15T02:25:00Z", confirmedAt: "2026-07-17T01:20:00Z" },
  { id: 143, taskId: 11, orgUnitId: 16, assignedByOrgUnitId: 1, parentAssignmentId: null, dueDate: "2026-11-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 51.4, assignedAt: "2026-07-15T02:30:00Z", confirmedAt: "2026-07-17T01:30:00Z" },

  // ===== Bình Dương (12) → Phường — đối chiếu 60 = 25 + 20 + 15 =====
  { id: 101, taskId: 11, orgUnitId: 25, assignedByOrgUnitId: 12, parentAssignmentId: 100, dueDate: "2026-11-15", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 72, note: "Ưu tiên hoạt động trải nghiệm gắn với địa phương.", assignedAt: "2026-07-20T02:00:00Z", confirmedAt: "2026-07-22T01:00:00Z" },
  { id: 102, taskId: 11, orgUnitId: 26, assignedByOrgUnitId: 12, parentAssignmentId: 100, dueDate: "2026-11-15", progressStatus: "IN_PROGRESS", confirmStatus: "PENDING", completionRate: 75, assignedAt: "2026-07-20T02:05:00Z" },
  { id: 103, taskId: 11, orgUnitId: 27, assignedByOrgUnitId: 12, parentAssignmentId: 100, dueDate: "2026-11-15", progressStatus: "COMPLETED", confirmStatus: "CONFIRMED", completionRate: 100, assignedAt: "2026-07-20T02:10:00Z", confirmedAt: "2026-09-10T01:30:00Z" },

  { id: 111, taskId: 12, orgUnitId: 25, assignedByOrgUnitId: 12, parentAssignmentId: 110, dueDate: "2026-11-15", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 60, assignedAt: "2026-07-20T02:15:00Z", confirmedAt: "2026-07-25T01:00:00Z" },
  { id: 112, taskId: 12, orgUnitId: 26, assignedByOrgUnitId: 12, parentAssignmentId: 110, dueDate: "2026-11-15", progressStatus: "IN_PROGRESS", confirmStatus: "PENDING", completionRate: 80, assignedAt: "2026-07-20T02:20:00Z" },
  { id: 113, taskId: 12, orgUnitId: 27, assignedByOrgUnitId: 12, parentAssignmentId: 110, dueDate: "2026-11-15", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 90, assignedAt: "2026-07-20T02:25:00Z", confirmedAt: "2026-09-12T01:00:00Z" },

  { id: 121, taskId: 21, orgUnitId: 25, assignedByOrgUnitId: 12, parentAssignmentId: 120, dueDate: "2026-09-30", progressStatus: "IN_PROGRESS", confirmStatus: "PENDING", completionRate: 50, assignedAt: "2026-07-20T02:30:00Z" },
  { id: 122, taskId: 21, orgUnitId: 26, assignedByOrgUnitId: 12, parentAssignmentId: 120, dueDate: "2026-09-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 71.4, assignedAt: "2026-07-20T02:35:00Z", confirmedAt: "2026-09-15T01:00:00Z" },
  { id: 123, taskId: 21, orgUnitId: 27, assignedByOrgUnitId: 12, parentAssignmentId: 120, dueDate: "2026-09-30", progressStatus: "IN_PROGRESS", confirmStatus: "CONFIRMED", completionRate: 40, assignedAt: "2026-07-20T02:40:00Z", confirmedAt: "2026-09-15T01:05:00Z" },

  { id: 131, taskId: 31, orgUnitId: 25, assignedByOrgUnitId: 12, parentAssignmentId: 130, dueDate: "2026-10-15", progressStatus: "COMPLETED", confirmStatus: "CONFIRMED", completionRate: 100, assignedAt: "2026-08-05T02:00:00Z", confirmedAt: "2026-09-16T01:00:00Z" },
  { id: 132, taskId: 31, orgUnitId: 26, assignedByOrgUnitId: 12, parentAssignmentId: 130, dueDate: "2026-10-15", progressStatus: "NOT_STARTED", confirmStatus: "NEEDS_INFO", completionRate: 0, assignedAt: "2026-08-05T02:05:00Z" },
  { id: 133, taskId: 31, orgUnitId: 27, assignedByOrgUnitId: 12, parentAssignmentId: 130, dueDate: "2026-09-15", progressStatus: "OVERDUE", confirmStatus: "REJECTED", completionRate: 0, assignedAt: "2026-08-05T02:10:00Z" },
];

export const assignmentTargets: AssignmentTarget[] = [
  // A1 (TW→BD): 60 hoạt động · 6000 đoàn viên
  { id: 1, taskAssignmentId: 100, taskMetricId: 1, targetValue: 60, achievedValue: 34 },
  { id: 2, taskAssignmentId: 100, taskMetricId: 2, targetValue: 6000, achievedValue: 3400 },
  // A1a Hiệp Thành: 25 + 2500
  { id: 3, taskAssignmentId: 101, taskMetricId: 1, targetValue: 25, achievedValue: 18 },
  { id: 4, taskAssignmentId: 101, taskMetricId: 2, targetValue: 2500, achievedValue: 2100 },
  // A1b Phú Hòa: 20 + 2000
  { id: 5, taskAssignmentId: 102, taskMetricId: 1, targetValue: 20, achievedValue: 15 },
  { id: 6, taskAssignmentId: 102, taskMetricId: 2, targetValue: 2000, achievedValue: 1800 },
  // A1c Tương Bình Hiệp: 15 + 1500
  { id: 7, taskAssignmentId: 103, taskMetricId: 1, targetValue: 15, achievedValue: 15 },
  { id: 8, taskAssignmentId: 103, taskMetricId: 2, targetValue: 1500, achievedValue: 1500 },
  // A2 (I.2 nhật ký)
  { id: 9, taskAssignmentId: 110, taskMetricId: 3, targetValue: 30, achievedValue: 23 },
  { id: 10, taskAssignmentId: 111, taskMetricId: 3, targetValue: 10, achievedValue: 6 },
  { id: 11, taskAssignmentId: 112, taskMetricId: 3, targetValue: 10, achievedValue: 8 },
  { id: 12, taskAssignmentId: 113, taskMetricId: 3, targetValue: 10, achievedValue: 9 },
  // A3 (II.1 tin bài)
  { id: 13, taskAssignmentId: 120, taskMetricId: 4, targetValue: 20, achievedValue: 11 },
  { id: 14, taskAssignmentId: 121, taskMetricId: 4, targetValue: 8, achievedValue: 4 },
  { id: 15, taskAssignmentId: 122, taskMetricId: 4, targetValue: 7, achievedValue: 5 },
  { id: 16, taskAssignmentId: 123, taskMetricId: 4, targetValue: 5, achievedValue: 2 },
  // A4 (III.1 môi trường)
  { id: 17, taskAssignmentId: 130, taskMetricId: 5, targetValue: 3, achievedValue: 1 },
  { id: 18, taskAssignmentId: 131, taskMetricId: 5, targetValue: 1, achievedValue: 1 },
  { id: 19, taskAssignmentId: 132, taskMetricId: 5, targetValue: 1, achievedValue: 0 },
  { id: 20, taskAssignmentId: 133, taskMetricId: 5, targetValue: 1, achievedValue: 0 },
  // Cấp tỉnh khác (chỉ tiêu theo I.1)
  { id: 21, taskAssignmentId: 140, taskMetricId: 1, targetValue: 50, achievedValue: 22 },
  { id: 22, taskAssignmentId: 140, taskMetricId: 2, targetValue: 5000, achievedValue: 2600 },
  { id: 23, taskAssignmentId: 141, taskMetricId: 1, targetValue: 45, achievedValue: 20 },
  { id: 24, taskAssignmentId: 141, taskMetricId: 2, targetValue: 4500, achievedValue: 2400 },
  { id: 25, taskAssignmentId: 142, taskMetricId: 1, targetValue: 40, achievedValue: 25 },
  { id: 26, taskAssignmentId: 142, taskMetricId: 2, targetValue: 4000, achievedValue: 2900 },
  { id: 27, taskAssignmentId: 143, taskMetricId: 1, targetValue: 35, achievedValue: 18 },
  { id: 28, taskAssignmentId: 143, taskMetricId: 2, targetValue: 3500, achievedValue: 2100 },
];

/** Lịch sử cập nhật kết quả — append-only, achieved = lần báo gần nhất */
export const taskResults: TaskResult[] = [
  { id: 1, taskAssignmentId: 101, assignmentTargetId: 3, reportedValue: 12, reportNote: "6 tháng đầu năm", dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-08-01T02:00:00Z" },
  { id: 2, taskAssignmentId: 101, assignmentTargetId: 3, reportedValue: 18, reportNote: "Cập nhật tháng 9", dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-09-20T02:00:00Z" },
  { id: 3, taskAssignmentId: 101, assignmentTargetId: 4, reportedValue: 2100, dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-09-20T02:01:00Z" },
  { id: 4, taskAssignmentId: 102, assignmentTargetId: 5, reportedValue: 15, dataSource: "MANUAL", reportedByAccountId: 7, reportedAt: "2026-09-18T02:00:00Z" },
  { id: 5, taskAssignmentId: 102, assignmentTargetId: 6, reportedValue: 1800, dataSource: "MANUAL", reportedByAccountId: 7, reportedAt: "2026-09-18T02:01:00Z" },
  { id: 6, taskAssignmentId: 103, assignmentTargetId: 7, reportedValue: 15, dataSource: "MANUAL", reportedByAccountId: 8, reportedAt: "2026-09-05T02:00:00Z" },
  { id: 7, taskAssignmentId: 103, assignmentTargetId: 8, reportedValue: 1500, dataSource: "MANUAL", reportedByAccountId: 8, reportedAt: "2026-09-05T02:01:00Z" },
  { id: 8, taskAssignmentId: 111, assignmentTargetId: 10, reportedValue: 6, dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-09-19T02:00:00Z" },
  { id: 9, taskAssignmentId: 112, assignmentTargetId: 11, reportedValue: 8, dataSource: "MANUAL", reportedByAccountId: 7, reportedAt: "2026-09-17T02:00:00Z" },
  { id: 10, taskAssignmentId: 113, assignmentTargetId: 12, reportedValue: 9, dataSource: "MANUAL", reportedByAccountId: 8, reportedAt: "2026-09-14T02:00:00Z" },
  { id: 11, taskAssignmentId: 121, assignmentTargetId: 14, reportedValue: 4, dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-09-21T02:00:00Z" },
  { id: 12, taskAssignmentId: 122, assignmentTargetId: 15, reportedValue: 5, dataSource: "MANUAL", reportedByAccountId: 7, reportedAt: "2026-09-10T02:00:00Z" },
  { id: 13, taskAssignmentId: 123, assignmentTargetId: 16, reportedValue: 2, dataSource: "MANUAL", reportedByAccountId: 8, reportedAt: "2026-09-11T02:00:00Z" },
  { id: 14, taskAssignmentId: 131, assignmentTargetId: 18, reportedValue: 1, reportNote: "Chủ nhật xanh kênh Nông Trại", dataSource: "MANUAL", reportedByAccountId: 4, reportedAt: "2026-09-10T02:00:00Z" },
  { id: 15, taskAssignmentId: 140, assignmentTargetId: 21, reportedValue: 22, dataSource: "MANUAL", reportedByAccountId: 6, reportedAt: "2026-09-15T02:00:00Z" },
  { id: 16, taskAssignmentId: 140, assignmentTargetId: 22, reportedValue: 2600, dataSource: "MANUAL", reportedByAccountId: 6, reportedAt: "2026-09-15T02:01:00Z" },
  { id: 17, taskAssignmentId: 141, assignmentTargetId: 23, reportedValue: 20, dataSource: "MANUAL", reportedByAccountId: 14, reportedAt: "2026-09-15T02:00:00Z" },
  { id: 18, taskAssignmentId: 142, assignmentTargetId: 25, reportedValue: 25, dataSource: "MANUAL", reportedByAccountId: 6, reportedAt: "2026-09-16T02:00:00Z" },
  { id: 19, taskAssignmentId: 143, assignmentTargetId: 27, reportedValue: 18, dataSource: "MANUAL", reportedByAccountId: 6, reportedAt: "2026-09-16T02:00:00Z" },
  { id: 20, taskAssignmentId: 100, assignmentTargetId: 1, reportedValue: 34, reportNote: "Tổng hợp từ 3 phường", dataSource: "AUTO_AGGREGATE", reportedByAccountId: 3, reportedAt: "2026-09-21T02:00:00Z" },
];

export const assignmentReviews: AssignmentReview[] = [
  { id: 1, taskAssignmentId: 100, reviewerAccountId: 1, action: "CONFIRM", note: "Đồng ý kế hoạch phân bổ của Tỉnh Đoàn.", reviewedAt: "2026-07-16T01:00:00Z" },
  { id: 2, taskAssignmentId: 103, reviewerAccountId: 3, action: "CONFIRM", note: "Hoàn thành vượt tiến độ, tốt.", reviewedAt: "2026-09-10T01:30:00Z" },
  { id: 3, taskAssignmentId: 131, reviewerAccountId: 3, action: "CONFIRM", reviewedAt: "2026-09-16T01:00:00Z" },
  { id: 4, taskAssignmentId: 132, reviewerAccountId: 3, action: "REQUEST_INFO", note: "Đề nghị bổ sung minh chứng chương trình môi trường đã đăng ký.", reviewedAt: "2026-09-14T01:00:00Z" },
  { id: 5, taskAssignmentId: 133, reviewerAccountId: 3, action: "REJECT", note: "Quá hạn không báo cáo, yêu cầu làm việc trực tiếp với Đoàn phường.", reviewedAt: "2026-09-18T01:00:00Z" },
  { id: 6, taskAssignmentId: 122, reviewerAccountId: 3, action: "CONFIRM", reviewedAt: "2026-09-15T01:00:00Z" },
  { id: 7, taskAssignmentId: 123, reviewerAccountId: 3, action: "CONFIRM", reviewedAt: "2026-09-15T01:05:00Z" },
];
