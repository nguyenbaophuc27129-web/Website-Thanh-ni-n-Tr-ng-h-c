import type { RankingSnapshot, RankingEntry } from "@/types";

/** Kỳ xếp hạng đã chốt (ranking_snapshots + ranking_entries) */
export const rankingSnapshots: RankingSnapshot[] = [
  {
    id: 1, name: "Xếp hạng đơn vị trường học — Quý III/2026", criteriaSetId: 1,
    scopeOrgUnitId: 12, rankedOrgLevel: 4, rankingType: "BY_SCORE",
    periodType: "QUARTER", periodStart: "2026-07-01", periodEnd: "2026-09-30",
    totalUnits: 6, generatedAt: "2026-09-21T10:00:00Z", generatedByAccountId: 3,
    status: "FINALIZED",
  },
  {
    id: 2, name: "Xếp hạng Tỉnh/Thành Đoàn — 6 tháng đầu năm 2026", criteriaSetId: 1,
    scopeOrgUnitId: 1, rankedOrgLevel: 2, rankingType: "BY_TASK_RESULT",
    periodType: "CUSTOM", periodStart: "2026-01-01", periodEnd: "2026-06-30",
    totalUnits: 5, generatedAt: "2026-07-05T09:00:00Z", generatedByAccountId: 1,
    status: "FINALIZED",
  },
];

export const rankingEntries: RankingEntry[] = [
  // Kỳ 1 — các trường cấp 4 thuộc Bình Dương (top 3 từ nguồn scores, bổ sung thêm trường của Hiệp An để đủ 6)
  { id: 1, snapshotId: 1, orgUnitId: 31, rankPosition: 1, totalScore: 69, completionRate: 88.4, completedTasks: 5, totalTasks: 6, activityCount: 8 },
  { id: 2, snapshotId: 1, orgUnitId: 34, rankPosition: 2, totalScore: 59, completionRate: 79.2, completedTasks: 4, totalTasks: 6, activityCount: 5 },
  { id: 3, snapshotId: 1, orgUnitId: 32, rankPosition: 3, totalScore: 48, completionRate: 66.7, completedTasks: 4, totalTasks: 6, activityCount: 3 },
  { id: 4, snapshotId: 1, orgUnitId: 33, rankPosition: 4, totalScore: 34, completionRate: 50, completedTasks: 3, totalTasks: 6, activityCount: 2 },
  { id: 5, snapshotId: 1, orgUnitId: 35, rankPosition: 5, totalScore: 25, completionRate: 33.3, completedTasks: 2, totalTasks: 6, activityCount: 1 },
  { id: 6, snapshotId: 1, orgUnitId: 28, rankPosition: 6, totalScore: 39.5, completionRate: 55, completedTasks: 3, totalTasks: 6, activityCount: 2 },

  // Kỳ 2 — cấp tỉnh/thành toàn quốc
  { id: 7, snapshotId: 2, orgUnitId: 15, rankPosition: 1, totalScore: 62.5, completionRate: 100, completedTasks: 1, totalTasks: 1, activityCount: 40 },
  { id: 8, snapshotId: 2, orgUnitId: 12, rankPosition: 2, totalScore: 56.7, completionRate: 56.7, completedTasks: 1, totalTasks: 1, activityCount: 34 },
  { id: 9, snapshotId: 2, orgUnitId: 13, rankPosition: 3, totalScore: 44, completionRate: 44, completedTasks: 1, totalTasks: 1, activityCount: 22 },
  { id: 10, snapshotId: 2, orgUnitId: 16, rankPosition: 4, totalScore: 51.4, completionRate: 51.4, completedTasks: 1, totalTasks: 1, activityCount: 18 },
  { id: 11, snapshotId: 2, orgUnitId: 14, rankPosition: 5, totalScore: 44.4, completionRate: 44.4, completedTasks: 1, totalTasks: 1, activityCount: 20 },
];
