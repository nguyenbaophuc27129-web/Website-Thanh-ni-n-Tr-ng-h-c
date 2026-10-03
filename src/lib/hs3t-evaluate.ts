import type { Hs3tAchievement, Hs3tCategory, Hs3tProfile } from "@/types";

/**
 * Xét hồ sơ Học sinh 3 tốt theo quy tắc cục bộ (fallback của API /api/ai/xet-hs3t).
 *
 * NGƯỠNG XÉT — sửa tại đây khi Ban TNTH đổi quy chế:
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
  HOC_TAP: "Học tập tốt",
  REN_LUYEN: "Rèn luyện tốt",
  PHONG_TRAO: "Phong trào / tình nguyện tốt",
};

export function ruleEvaluateHs3t(
  _profile: Hs3tProfile,
  achievements: Hs3tAchievement[]
): Hs3tEvaluation {
  const counts: Record<Hs3tCategory, number> = {
    HOC_TAP: achievements.filter((a) => a.category === "HOC_TAP").length,
    REN_LUYEN: achievements.filter((a) => a.category === "REN_LUYEN").length,
    PHONG_TRAO: achievements.filter((a) => a.category === "PHONG_TRAO").length,
  };

  const filled = (Object.keys(counts) as Hs3tCategory[]).filter((c) => counts[c] >= 1);
  const total = achievements.length;
  const missing: string[] = [];

  if (counts.HOC_TAP === 0) missing.push("Chưa có minh chứng nhóm 'Học tập tốt'");
  if (counts.REN_LUYEN === 0) missing.push("Chưa có minh chứng nhóm 'Rèn luyện tốt'");
  if (counts.PHONG_TRAO === 0) missing.push("Chưa có minh chứng nhóm 'Phong trào/tình nguyện tốt'");
  if (filled.length === 3 && total < 10) {
    missing.push(`Đủ 3 nhóm nhưng tổng thành tích ${total}/10 — cần bổ sung thêm để xét cấp Trung ương`);
  }

  let suggestedLevel: Hs3tEvaluation["suggestedLevel"] = null;
  if (filled.length === 3 && total >= 10) suggestedLevel = "TW";
  else if (filled.length >= 2) suggestedLevel = "TINH";
  else if (filled.length === 1) suggestedLevel = "XA";

  return { counts, suggestedLevel, missing };
}
