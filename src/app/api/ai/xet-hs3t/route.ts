import { NextResponse } from "next/server";
import { ruleEvaluateHs3t } from "@/lib/hs3t-evaluate";
import type { Hs3tAchievement, Hs3tProfile } from "@/types";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   ⭐ NỐI AI THẬT CHO "XÉT DANH HIỆU HỌC SINH 3 TỐT" — 1 HÀM DƯỚI ĐÂY
   ════════════════════════════════════════════════════════════════════
   Cách nối:
   1. .env.local thêm: AI_API_KEY / AI_BASE_URL / AI_MODEL (xem route
      phan-tich-cong-van để biết chi tiết).
   2. Trong hàm evaluateWithAI: XOÁ return ruleEvaluateHs3t(...) và BỎ
      COMMENT mẫu A (OpenAI-compatible) hoặc mẫu B (Anthropic).
   3. Yêu cầu AI trả JSON: {"suggestedLevel":"XA"|"TINH"|"TW"|null,
      "reasoning":"...","missing":["..."]} — route đã tự parse + cắt khối
      ```json nếu model trả kèm.
   4. Client luôn có fallback ruleEvaluateHs3t cục bộ khi API lỗi nên
      demo không bao giờ gãy.
   ════════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT =
  "Bạn là cố vấn xét danh hiệu 'Học sinh 3 tốt' (Đạo đức tốt - Học tập tốt - Thể lực tốt) theo Quy chế QĐ 317-QĐ/TWĐTN-TNTH (điều chỉnh TB 630 ngày 10/10/2025) của Cổng Thanh niên Trường học. " +
  "Nhóm 'KHAC' (Thành tích khác: công bố khoa học, chứng chỉ ngoại ngữ/tin học/SAT) chỉ bổ sung hồ sơ, không tính vào ngưỡng 3 nhóm. " +
  "Dựa trên số minh chứng từng nhóm và danh sách thành tích, hãy đề xuất cấp danh hiệu và trả về DUY NHẤT một JSON (không thêm chữ nào khác): " +
  '{"suggestedLevel":"XA"|"TINH"|"TW"|null,"reasoning":"lý do ngắn gọn tiếng Việt","missing":["điều còn thiếu"]}. ' +
  "Ngưỡng tham khảo: mỗi nhóm có ≥1 minh chứng → XA; có thành tích ở ≥2/3 nhóm → TINH; đủ cả 3 nhóm và tổng ≥10 thành tích → TW. " +
  "Cân nhắc cả chất lượng minh chứng (giải cấp trường/tỉnh/quốc gia, vai trò phân công) — có thể đề xuất cao hơn hoặc thấp hơn ngưỡng nếu hợp lý.";

interface EvalPayload {
  studentName?: string;
  counts?: Record<string, number>;
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
  // ---- MẶC ĐỊNH (demo): bộ quy tắc theo ngưỡng trên máy chủ ----
  return ruleEvaluateHs3t(profile, achievements);

  /* ---- MẪU A: API tương thích OpenAI ----
  const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0,
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  return { ...parseLevel(raw), model: process.env.AI_MODEL ?? "gpt-4o-mini" };
  ---------------------------------------------------------------- */

  /* ---- MẪU B: Anthropic (Claude) ----
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.AI_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim();
  return { ...parseLevel(raw), model: process.env.AI_MODEL ?? "claude-haiku" };
  ---------------------------------------------------------------- */
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
  const aiPayload: EvalPayload = {
    studentName: profile.studentName,
    counts: {
      HOC_TAP: achievements.filter((a) => a.category === "HOC_TAP").length,
      REN_LUYEN: achievements.filter((a) => a.category === "REN_LUYEN").length,
      PHONG_TRAO: achievements.filter((a) => a.category === "PHONG_TRAO").length,
    },
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
