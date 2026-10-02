import { NextResponse } from "next/server";
import { ruleModerate } from "@/lib/ai-moderation";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   ⭐ NỐI AI THẬT CHO "KIỂM DUYỆT DIỄN ĐÀN" — 1 HÀM DƯỚI ĐÂY
   ════════════════════════════════════════════════════════════════════
   Cách nối:
   1. .env.local thêm: AI_API_KEY / AI_BASE_URL / AI_MODEL (xem route
      phan-tich-cong-van để biết chi tiết).
   2. Trong hàm moderateWithAI: XOÁ return ruleModerate(text) và BỎ
      COMMENT mẫu A (OpenAI-compatible) hoặc mẫu B (Anthropic).
   3. Yêu cầu AI trả JSON: {"verdict":"CLEAN"|"FLAGGED","reason":"..."} —
      route đã tự parse + cắt bỏ khối ```json nếu model trả kèm.
   4. Client luôn có fallback ruleModerate cục bộ khi API lỗi nên demo
      không bao giờ gãy.
   ════════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT =
  "Bạn là bộ phận kiểm duyệt nội dung diễn đàn học sinh - sinh viên ẩn danh của Cổng Thanh niên Trường học (TW Đoàn TNCS Hồ Chí Minh). " +
  "Hãy đánh giá văn bản và trả về DUY NHẤT một JSON (không thêm chữ nào khác): " +
  '{"verdict":"CLEAN"|"FLAGGED","reason":"lý do ngắn gọn tiếng Việt"}. ' +
  "FLAGGED khi: ngôn từ thô tục/công kích; nội dung cấm (cờ bạc, ma túy, bạo lực, khiêu dâm); " +
  "lừa đảo/quảng cáo/spam; chia sẻ thông tin cá nhân (số điện thoại, địa chỉ, link lạ); viết hoa hoặc lặp ký tự bất thường. " +
  "Nội dung học tập, hoạt động Đoàn, góp ý xây dựng thì CLEAN.";

function parseVerdict(raw: string): { verdict: "CLEAN" | "FLAGGED"; reason?: string } {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
      if (parsed.verdict === "CLEAN" || parsed.verdict === "FLAGGED") {
        return { verdict: parsed.verdict, reason: parsed.reason };
      }
    } catch {
      // rơi xuống heuristic dưới
    }
  }
  return /FLAGGED/i.test(raw)
    ? { verdict: "FLAGGED", reason: "AI phát hiện nội dung không phù hợp" }
    : { verdict: "CLEAN" };
}

async function moderateWithAI(text: string): Promise<{ verdict: "CLEAN" | "FLAGGED"; reason?: string; model?: string }> {
  // ---- MẶC ĐỊNH (demo): bộ quy tắc theo từ khoá trên máy chủ ----
  return ruleModerate(text);

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
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 200,
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  return { ...parseVerdict(raw), model: process.env.AI_MODEL ?? "gpt-4o-mini" };
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
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim();
  return { ...parseVerdict(raw), model: process.env.AI_MODEL ?? "claude-haiku" };
  ---------------------------------------------------------------- */
}

/** POST /api/ai/kiem-duyet — { text } → { ok, verdict, reason, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = payload?.text?.trim() ?? "";
  if (text.length < 2) {
    return NextResponse.json({ ok: false, error: "Nội dung quá ngắn để kiểm duyệt." }, { status: 400 });
  }
  try {
    const { verdict, reason, model } = await moderateWithAI(text);
    return NextResponse.json({ ok: true, verdict, reason, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Kiểm duyệt thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
