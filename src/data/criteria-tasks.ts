import type { CriteriaSet, Task, TaskMetric } from "@/types";

export const criteriaSets: CriteriaSet[] = [
  {
    id: 1, code: "BTS-TNTH-2026", name: "Bộ tiêu chí đánh giá thi đua Thanh niên Trường học năm 2026",
    year: 2026, ownerOrgUnitId: 1, targetOrgLevel: 4, totalPoints: 100,
    status: "ACTIVE",
  },
  {
    id: 2, code: "BTS-TNTH-2025", name: "Bộ tiêu chí đánh giá thi đua Thanh niên Trường học năm 2025",
    year: 2025, ownerOrgUnitId: 1, targetOrgLevel: 4, totalPoints: 100,
    status: "ARCHIVED",
  },
];

export const tasks: Task[] = [
  // Nhóm I
  { id: 10, criteriaSetId: 1, parentTaskId: null, code: "I", title: "I. Phong trào hành động của đoàn viên, học sinh", taskKind: "TASK", maxPoints: 30, scoringMethod: "OTHER", displayOrder: 1, status: "PUBLISHED" },
  { id: 11, criteriaSetId: 1, parentTaskId: 10, code: "I.1", title: "I.1. Hoạt động trải nghiệm, tình nguyện của đoàn viên", description: "Tổ chức các hoạt động trải nghiệm, tình nguyện vì cộng đồng.", taskKind: "CRITERION", maxPoints: 20, requirement: "Mỗi chi đoàn tổ chức tối thiểu 1 hoạt động/tháng.", scoringMethod: "MANUAL_CONFIRM", dueDate: "2026-11-30", displayOrder: 1, status: "PUBLISHED" },
  { id: 12, criteriaSetId: 1, parentTaskId: 10, code: "I.2", title: "I.2. Nhật ký trải nghiệm nghề nghiệp đăng tải trên cổng", taskKind: "CRITERION", maxPoints: 10, requirement: "Đăng bài nhật ký trải nghiệm nghề nghiệp trên Cổng TNTH.", scoringMethod: "AUTO_AGGREGATE", dueDate: "2026-11-30", displayOrder: 2, status: "PUBLISHED" },
  // Nhóm II
  { id: 20, criteriaSetId: 1, parentTaskId: null, code: "II", title: "II. Truyền thông và xuất bản tin bài", taskKind: "TASK", maxPoints: 25, scoringMethod: "OTHER", displayOrder: 2, status: "PUBLISHED" },
  { id: 21, criteriaSetId: 1, parentTaskId: 20, code: "II.1", title: "II.1. Tin bài đăng trên Cổng TNTH được xuất bản", taskKind: "CRITERION", maxPoints: 15, requirement: "Tin bài do biên tập viên duyệt, đăng công khai.", scoringMethod: "AUTO_AGGREGATE", dueDate: "2026-11-30", displayOrder: 1, status: "PUBLISHED" },
  { id: 22, criteriaSetId: 1, parentTaskId: 20, code: "II.2", title: "II.2. Chuyên đề truyền thông đạt giải cấp trở lên", taskKind: "CRITERION", maxPoints: 10, requirement: "Sản phẩm truyền thông tham dự và đạt giải các cấp.", scoringMethod: "EXPERT_REVIEW", dueDate: "2026-11-30", displayOrder: 2, status: "PUBLISHED" },
  // Nhóm III
  { id: 30, criteriaSetId: 1, parentTaskId: null, code: "III", title: "III. Nhiệm vụ đột xuất theo chỉ đạo", taskKind: "TASK", maxPoints: 25, scoringMethod: "OTHER", displayOrder: 3, status: "PUBLISHED" },
  { id: 31, criteriaSetId: 1, parentTaskId: 30, code: "III.1", title: "III.1. Chương trình bảo vệ môi trường, thích ứng biến đổi khí hậu", taskKind: "CRITERION", maxPoints: 15, requirement: "Tổ chức ít nhất 1 chương trình môi trường/học kỳ.", scoringMethod: "MANUAL_CONFIRM", dueDate: "2026-10-31", displayOrder: 1, status: "PUBLISHED" },
  { id: 32, criteriaSetId: 1, parentTaskId: 30, code: "III.2", title: "III.2. Tham gia Hội trại, hội thi do cấp trên tổ chức", taskKind: "CRITERION", maxPoints: 10, scoringMethod: "MANUAL_CONFIRM", dueDate: "2026-11-15", displayOrder: 2, status: "PUBLISHED" },
];

export const taskMetrics: TaskMetric[] = [
  { id: 1, taskId: 11, code: "SO_HOAT_DONG", name: "Số hoạt động tổ chức", unitOfMeasure: "hoạt động", aggregationType: "SUM" },
  { id: 2, taskId: 11, code: "SO_DOAN_VIEN", name: "Số đoàn viên tham gia", unitOfMeasure: "người", aggregationType: "SUM" },
  { id: 3, taskId: 12, code: "SO_NHAT_KY", name: "Số nhật ký trải nghiệm", unitOfMeasure: "bài", aggregationType: "SUM" },
  { id: 4, taskId: 21, code: "SO_BAI_XB", name: "Số tin bài được xuất bản", unitOfMeasure: "bài", aggregationType: "SUM" },
  { id: 5, taskId: 31, code: "SO_CHUONG_TRINH", name: "Số chương trình môi trường", unitOfMeasure: "chương trình", aggregationType: "SUM" },
];
