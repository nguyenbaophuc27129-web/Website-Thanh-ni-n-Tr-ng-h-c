import type { Hs3tAchievement, Hs3tProfile, Hs3tUnitStandard } from "@/types";

export const hs3tProfiles: Hs3tProfile[] = [];
export const hs3tAchievements: Hs3tAchievement[] = [];

/**
 * Điều 5 Quy chế — đơn vị xây dựng tiêu chuẩn riêng phù hợp thực tiễn,
 * KHÔNG cao hơn chuẩn Trung ương.
 */
export const hs3tUnitStandards: Hs3tUnitStandard[] = [
  {
    id: 961,
    orgUnitId: 31,
    applyTw: false,
    daoDuc:
      "Chuẩn TW giữ nguyên (hạnh kiểm Tốt, đoàn viên XSNV, không vi phạm). Tiêu chí đạt thêm: khen thưởng tình nguyện/đạt giải cuộc thi tìm hiểu từ cấp TRƯỜNG trở lên.",
    hocTap:
      "Chuẩn TW giữ nguyên. Tiêu chí đạt thêm: giải Học sinh giỏi hoặc KHKT từ cấp TRƯỜNG trở lên.",
    theLuc: "Áp dụng nguyên chuẩn TW — đạt thể lực theo QĐ 53/2008, TT 22/2021 và 1 tiêu chí thể thao đạt thêm.",
    note: "Tiêu chuẩn cơ sở áp dụng cho phong trào thi đua cấp trường theo Điều 5.",
    confirmedByAccountId: 5,
    updatedAt: "2026-09-01T02:00:00Z",
  },
];
