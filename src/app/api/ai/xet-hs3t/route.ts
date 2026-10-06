import { NextResponse } from "next/server";
import { ruleEvaluateHs3t } from "@/lib/hs3t-evaluate";
import { callAI } from "@/lib/ai-client";
import type { Hs3tAchievement, Hs3tProfile } from "@/types";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "XÉT DANH HIỆU HỌC SINH 3 TỐT" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key / AI lỗi → route TỰ fallback ruleEvaluateHs3t trên máy chủ
   nên demo không bao giờ gãy.
   ════════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT =
  "Bạn là cố vấn xét danh hiệu 'Học sinh 3 tốt' (Đạo đức tốt - Học tập tốt - Thể lực tốt) theo Quy chế QĐ 317-QĐ/TWĐTN-TNTH (điều chỉnh TB 630 ngày 10/10/2025) của Cổng Thanh niên Trường học. " +
  "Nhóm 'KHAC' (Thành tích khác: công bố khoa học, chứng chỉ ngoại ngữ/tin học/SAT) chỉ bổ sung hồ sơ, không tính vào ngưỡng 3 nhóm. " +
  "Payload đã kèm 'ruleSuggestion' — kết quả tính theo NGƯỠNG QUY CHẾ BẮT BUỘC: mỗi nhóm ≥1 minh chứng → XA; ≥2/3 nhóm → TINH; đủ cả 3 nhóm và tổng ≥10 thành tích → TW (counts trong payload là số chính xác, KHÔNG tự đếm lại). " +
  "Mặc định trả đúng ruleSuggestion. CHỈ được đề xuất khác ruleSuggestion khi hồ sơ có căn cứ chất lượng đặc biệt (giải quốc gia/quốc tế, vai trò trọng trách, hoặc minh chứng quá mỏng) — khi đó reasoning PHẢI nêu rõ căn cứ. " +
  "Trả về DUY NHẤT một JSON (không thêm chữ nào khác): " +
  '{"suggestedLevel":"XA"|"TINH"|"TW"|null,"reasoning":"lý do ngắn gọn tiếng Việt","missing":["điều còn thiếu"]}. ';

interface EvalPayload {
  studentName?: string;
  counts?: Record<string, number>;
  ruleSuggestion?: "XA" | "TINH" | "TW" | null;
  achievementTitles?: string[];
}

function parseLevel(raw: string): { suggestedLevel: "XA" | "TINH" | "TW" | null; reasoning?: string; missing?: string[] } {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { suggestedLevel?: string; reasoning?: string; missing?: string[] };
      const level = parsed.suggestedLevel;
      return {
        suggestedLevel: level === "XA" || level === "TINH" || level === "TW" ? level : null,
        reasoning: parsed.reasoning,
        missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      };
    } catch {
      // rơi xuống heuristic dưới
    }
  }
  if (/TW|trung\s*ương/i.test(raw)) return { suggestedLevel: "TW", reasoning: raw.slice(0, 300) };
  if (/tỉnh|tinh/i.test(raw)) return { suggestedLevel: "TINH", reasoning: raw.slice(0, 300) };
  if (/xã|xa\b|phường/i.test(raw)) return { suggestedLevel: "XA", reasoning: raw.slice(0, 300) };
  return { suggestedLevel: null };
}

async function evaluateWithAI(
  payload: EvalPayload,
  profile: Hs3tProfile,
  achievements: Hs3tAchievement[]
): Promise<{ suggestedLevel: "XA" | "TINH" | "TW" | null; reasoning?: string; missing?: string[]; model?: string }> {
  const { text: raw, model } = await callAI({
    system: SYSTEM_PROMPT,
    user: JSON.stringify(payload),
    maxTokens: 800,
    temperature: 0,
  });
  return { ...parseLevel(raw), model };
}

/**
 * POST /api/ai/xet-hs3t
 * Body: { profile: Hs3tProfile, achievements: Hs3tAchievement[] }
 * → { ok, suggestedLevel, reasoning, missing, model }
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { profile?: Hs3tProfile; achievements?: Hs3tAchievement[] }
    | null;
  if (!payload?.profile || !Array.isArray(payload.achievements)) {
    return NextResponse.json({ ok: false, error: "Thiếu hồ sơ hoặc danh sách thành tích." }, { status: 400 });
  }
  const profile = payload.profile;
  const achievements = payload.achievements;
  const rule = ruleEvaluateHs3t(profile, achievements);
  const aiPayload: EvalPayload = {
    studentName: profile.studentName,
    counts: {
      HOC_TAP: achievements.filter((a) => a.category === "HOC_TAP").length,
      REN_LUYEN: achievements.filter((a) => a.category === "REN_LUYEN").length,
      PHONG_TRAO: achievements.filter((a) => a.category === "PHONG_TRAO").length,
    },
    ruleSuggestion: rule.suggestedLevel,
    achievementTitles: achievements.map(
      (a) => `[${a.category}${a.addedByRole === "SCHOOL" ? "/trường xác nhận" : ""}] ${a.title}${a.sub ? ` (${a.sub})` : ""}`
    ),
  };
  try {
    const { suggestedLevel, reasoning, missing, model } = await evaluateWithAI(aiPayload, profile, achievements);
    return NextResponse.json({ ok: true, suggestedLevel, reasoning, missing: missing ?? [], model });
  } catch (err) {
    // AI lỗi → dùng quy tắc cục bộ, demo không gãy
    const fallback = ruleEvaluateHs3t(profile, achievements);
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Xét HS3T thất bại, dùng quy tắc cục bộ:", message);
    return NextResponse.json({ ok: true, ...fallback, model: "tnth-hs3t-rule (mô phỏng)" });
  }
}
