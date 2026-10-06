import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "KIỂM DUYỆT DIỄN ĐÀN" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502 → CLIENT tự fallback ruleModerate cục bộ
   (lib/ai-moderation.ts) nên demo không bao giờ gãy.
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
  const { text: raw, model } = await callAI({
    system: SYSTEM_PROMPT,
    user: text,
    maxTokens: 300,
    temperature: 0,
  });
  return { ...parseVerdict(raw), model };
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
