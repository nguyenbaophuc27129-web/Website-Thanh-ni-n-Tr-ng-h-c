import type { TaskAssignment, AssignmentTarget, TaskResult, AssignmentReview } from "@/types";

/**
 * KHÔNG gắn số liệu mẫu — toàn bộ chỉ tiêu do các cấp tự phân công trực tiếp
 * trên màn hình "Nhiệm vụ & chỉ tiêu thi đua" (nút "Phân công" trên cây nhiệm vụ):
 *   TW giao tỉnh → tỉnh giao phường → phường giao trường
 *   → trường báo cáo kết quả → cấp trên xác nhận → điểm về phiếu chấm.
 * Luồng demo: đăng nhập lần lượt tw.admin → bd.province → hc.hiepthanh → thpt.chanhphu.
 */
export const taskAssignments: TaskAssignment[] = [];

export const assignmentTargets: AssignmentTarget[] = [];

export const taskResults: TaskResult[] = [];

export const assignmentReviews: AssignmentReview[] = [];
