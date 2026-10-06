import { NextResponse } from "next/server";
import type { DirectiveDraft } from "@/lib/ai-directive";
import { callAI } from "@/lib/ai-client";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "AI PHÂN TÍCH CÔNG VĂN" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502 → client /quan-tri/nhiem-vu/ai-phan-tich
   tự dùng parser quy tắc cục bộ (lib/ai-directive.ts) nên demo không gãy.
   ════════════════════════════════════════════════════════════════════ */

const DIRECTIVE_SYSTEM_PROMPT =
  'Bạn là trợ lý lượng hoá công văn của Đoàn TNCS Hồ Chí Minh. Đọc văn bản công văn và trích ra các chỉ tiêu KPI định lượng. Chỉ trả về DUY NHẤT mảng JSON (không markdown, không giải thích), mỗi phần tử: {"metricName": "tên chỉ tiêu ≤80 ký tự", "targetValue": số, "unit": "đơn vị tính (lượt|bài|người|sân chơi|biên bản|%|…)", "aggregationType": "SUM" (dùng "PERCENT" nếu đơn vị là %), "dueDate": "YYYY-MM-DD" hoặc "" nếu không nêu hạn}.';

async function analyzeWithAI(text: string): Promise<{ drafts: DirectiveDraft[]; model: string }> {
  const { text: raw, model } = await callAI({
    system: DIRECTIVE_SYSTEM_PROMPT,
    user: text,
    maxTokens: 2000,
    temperature: 0.2,
  });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI không trả về mảng JSON hợp lệ");
  const drafts = JSON.parse(match[0]) as DirectiveDraft[];
  return { drafts, model };
}

/** POST /api/ai/phan-tich-cong-van — { text } → { ok, drafts, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = payload?.text?.trim() ?? "";
  if (text.length < 40) {
    return NextResponse.json({ ok: false, error: "Nội dung công văn quá ngắn (cần ≥ 40 ký tự)." }, { status: 400 });
  }
  try {
    const { drafts, model } = await analyzeWithAI(text);
    return NextResponse.json({ ok: true, drafts, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Phân tích công văn thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
