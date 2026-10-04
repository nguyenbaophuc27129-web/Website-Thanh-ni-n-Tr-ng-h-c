import type { Hs3tAchievement, Hs3tCategory, Hs3tProfile } from "@/types";

/**
 * Xét hồ sơ Học sinh 3 tốt theo quy tắc cục bộ (fallback của API /api/ai/xet-hs3t).
 * Tiêu chuẩn dựa trên Quy chế danh hiệu "Học sinh 3 tốt" giai đoạn 2023–2027
 * (QĐ 317-QĐ/TWĐTN-TNTH ngày 09/11/2023) + điều chỉnh Thông báo 630-TB/TWĐTN-CTTTN ngày 10/10/2025.
 *
 * NGƯỠNG XÉT (demo) — sửa tại đây khi Ban TNTH đổi quy chế:
 *   - Cấp XÃ  (XA)   : mỗi nhóm thành tích có ít nhất 1 minh chứng.
 *   - Cấp TỈNH (TINH) : có thành tích ở ít nhất 2/3 nhóm.
 *   - Cấp TW  (TW)   : đủ cả 3 nhóm VÀ tổng số thành tích ≥ 10.
 */
export interface Hs3tEvaluation {
  counts: Record<Hs3tCategory, number>;
  suggestedLevel: "XA" | "TINH" | "TW" | null;
  missing: string[];
}

export const HS3T_CATEGORY_NAMES: Record<Hs3tCategory, string> = {
  PHONG_TRAO: "Đạo đức tốt",
  HOC_TAP: "Học tập tốt",
  REN_LUYEN: "Thể lực tốt",
  KHAC: "Thành tích khác",
};

/** Thứ tự hiển thị đúng quy chế: Đạo đức → Học tập → Thể lực */
export const HS3T_MAIN_CATEGORIES: Hs3tCategory[] = ["PHONG_TRAO", "HOC_TAP", "REN_LUYEN"];

/** Toàn bộ nhóm nhập thành tích (có Thành tích khác — chỉ bổ sung hồ sơ, không tính ngưỡng 3 nhóm) */
export const HS3T_ALL_CATEGORIES: Hs3tCategory[] = ["PHONG_TRAO", "HOC_TAP", "REN_LUYEN", "KHAC"];

/**
 * 12 tiêu chí phụ chuẩn TW (Đạo đức 6 · Học tập 3 · Thể lực 3) + 4 mục Thành tích khác.
 * Văn bản theo Điều 4 Quy chế (đã hợp nhất điều chỉnh TB 630 10/2025).
 */
export const HS3T_SUB_CRITERIA: Record<Hs3tCategory, string[]> = {
  PHONG_TRAO: [
    "Hạnh kiểm năm học loại Tốt (TT 22/2021/TT-BGDĐT)",
    "Đoàn viên hoàn thành xuất sắc nhiệm vụ",
    "Không vi phạm đạo đức, pháp luật, nội quy",
    "Giải cuộc thi tìm hiểu (NQ Đảng, Đoàn, sử học, học Bác) cấp trường trở lên",
    "Được khen thưởng hoạt động tình nguyện từ cấp trên trực tiếp cơ sở trở lên",
    "Thanh niên tiêu biểu / Bằng khen công tác Đoàn từ cấp trên trực tiếp cơ sở trở lên",
  ],
  HOC_TAP: [
    "Học lực loại Tốt, Toán – Văn – Ngoại ngữ từ 8,5",
    "Giải (Nhất, Nhì, Ba) học sinh giỏi cấp tỉnh trở lên",
    "Giải (Nhất, Nhì, Ba) cuộc thi khoa học kỹ thuật cấp tỉnh trở lên",
  ],
  REN_LUYEN: [
    "Đạt yêu cầu thể lực (QĐ 53/2008, TT 22/2021)",
    "Danh hiệu Thanh niên khỏe từ cấp trường trở lên",
    "Giải cá nhân (Nhất, Nhì, Ba) giải TDTT phong trào cấp trường trở lên",
  ],
  KHAC: [
    "Công bố khoa học (tạp chí chuyên ngành, hội nghị/hội thảo)",
    "Chứng chỉ ngoại ngữ",
    "Chứng chỉ tin học văn phòng",
    "Chứng chỉ SAT / chuẩn hóa khác",
  ],
};

export function ruleEvaluateHs3t(
  _profile: Hs3tProfile,
  achievements: Hs3tAchievement[]
): Hs3tEvaluation {
  const counts: Record<Hs3tCategory, number> = {
    HOC_TAP: achievements.filter((a) => a.category === "HOC_TAP").length,
    REN_LUYEN: achievements.filter((a) => a.category === "REN_LUYEN").length,
    PHONG_TRAO: achievements.filter((a) => a.category === "PHONG_TRAO").length,
    KHAC: achievements.filter((a) => a.category === "KHAC").length,
  };

  const filled = HS3T_MAIN_CATEGORIES.filter((c) => counts[c] >= 1);
  const total = achievements.length;
  const missing: string[] = [];

  if (counts.PHONG_TRAO === 0) missing.push("Chưa có minh chứng nhóm 'Đạo đức tốt'");
  if (counts.HOC_TAP === 0) missing.push("Chưa có minh chứng nhóm 'Học tập tốt'");
  if (counts.REN_LUYEN === 0) missing.push("Chưa có minh chứng nhóm 'Thể lực tốt'");
  if (filled.length === 3 && total < 10) {
    missing.push(`Đủ 3 nhóm nhưng tổng thành tích ${total}/10 — cần bổ sung thêm để xét cấp Trung ương`);
  }

  let suggestedLevel: Hs3tEvaluation["suggestedLevel"] = null;
  if (filled.length === 3 && total >= 10) suggestedLevel = "TW";
  else if (filled.length >= 2) suggestedLevel = "TINH";
  else if (filled.length === 1) suggestedLevel = "XA";

  return { counts, suggestedLevel, missing };
}
