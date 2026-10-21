import type { Score } from "@/types";

/** Điểm thi đua kỳ 2026 — theo (criteria_set, task, org_unit), cấp 4 thuộc Bình Dương */
export const scores: Score[] = [
  // Hiệp Thành (25)
  { id: 1, criteriaSetId: 1, taskId: 11, orgUnitId: 25, points: 24, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 2, criteriaSetId: 1, taskId: 12, orgUnitId: 25, points: 12, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 3, criteriaSetId: 1, taskId: 31, orgUnitId: 25, points: 25, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 4, criteriaSetId: 1, taskId: 32, orgUnitId: 25, points: 16, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },

  // Phú Hòa (26)
  { id: 5, criteriaSetId: 1, taskId: 11, orgUnitId: 26, points: 22, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 6, criteriaSetId: 1, taskId: 12, orgUnitId: 26, points: 16, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 7, criteriaSetId: 1, taskId: 31, orgUnitId: 26, points: 15, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 8, criteriaSetId: 1, taskId: 32, orgUnitId: 26, points: 12, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },

  // Tương Bình Hiệp (27)
  { id: 9, criteriaSetId: 1, taskId: 11, orgUnitId: 27, points: 28, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 10, criteriaSetId: 1, taskId: 12, orgUnitId: 27, points: 18, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 11, criteriaSetId: 1, taskId: 31, orgUnitId: 27, points: 12, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 12, criteriaSetId: 1, taskId: 32, orgUnitId: 27, points: 14, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },

  // Hiệp An (28)
  { id: 13, criteriaSetId: 1, taskId: 11, orgUnitId: 28, points: 18, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 14, criteriaSetId: 1, taskId: 12, orgUnitId: 28, points: 10, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 15, criteriaSetId: 1, taskId: 31, orgUnitId: 28, points: 20, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },
  { id: 16, criteriaSetId: 1, taskId: 32, orgUnitId: 28, points: 12, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 3, scoredAt: "2026-09-20T02:00:00Z" },

  // Cấp 4 thuộc Hiệp Thành (để xếp hạng cấp trường)
  { id: 17, criteriaSetId: 1, taskId: 11, orgUnitId: 31, points: 27, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 18, criteriaSetId: 1, taskId: 12, orgUnitId: 31, points: 16, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 19, criteriaSetId: 1, taskId: 31, orgUnitId: 31, points: 28, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 20, criteriaSetId: 1, taskId: 32, orgUnitId: 31, points: 18, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },

  { id: 21, criteriaSetId: 1, taskId: 11, orgUnitId: 32, points: 20, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 22, criteriaSetId: 1, taskId: 12, orgUnitId: 32, points: 12, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 23, criteriaSetId: 1, taskId: 31, orgUnitId: 32, points: 20, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 24, criteriaSetId: 1, taskId: 32, orgUnitId: 32, points: 14, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },

  { id: 25, criteriaSetId: 1, taskId: 11, orgUnitId: 33, points: 16, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 26, criteriaSetId: 1, taskId: 12, orgUnitId: 33, points: 8, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 27, criteriaSetId: 1, taskId: 31, orgUnitId: 33, points: 16, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 28, criteriaSetId: 1, taskId: 32, orgUnitId: 33, points: 10, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 4, scoredAt: "2026-09-21T02:00:00Z" },

  // Trường thuộc Phú Hòa
  { id: 29, criteriaSetId: 1, taskId: 11, orgUnitId: 34, points: 24, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 30, criteriaSetId: 1, taskId: 12, orgUnitId: 34, points: 16, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 31, criteriaSetId: 1, taskId: 31, orgUnitId: 34, points: 24, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 32, criteriaSetId: 1, taskId: 32, orgUnitId: 34, points: 15, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },

  { id: 33, criteriaSetId: 1, taskId: 11, orgUnitId: 35, points: 15, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 34, criteriaSetId: 1, taskId: 12, orgUnitId: 35, points: 6, maxPoints: 20, scoringMethod: "AUTO_AGGREGATE", scoredByAccountId: null, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 35, criteriaSetId: 1, taskId: 31, orgUnitId: 35, points: 12, maxPoints: 30, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },
  { id: 36, criteriaSetId: 1, taskId: 32, orgUnitId: 35, points: 8, maxPoints: 20, scoringMethod: "MANUAL_CONFIRM", scoredByAccountId: 2, scoredAt: "2026-09-21T02:00:00Z" },
];
