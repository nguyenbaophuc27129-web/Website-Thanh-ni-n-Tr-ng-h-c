import { NextResponse } from "next/server";
import { parseDirective, type DirectiveDraft } from "@/lib/ai-directive";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   ⭐ NỐI AI THẬT CHO "AI PHÂN TÍCH CÔNG VĂN" — CHỈ SỬA 1 HÀM DƯỚI ĐÂY
   ════════════════════════════════════════════════════════════════════
   Cách nối:
   1. Tạo file .env.local (ngang package.json) và thêm 3 dòng:
        AI_API_KEY=sk-...            (key của bạn — KHÔNG commit file này)
        AI_BASE_URL=https://api.openai.com/v1   (hoặc gateway tương thích khác)
        AI_MODEL=gpt-4o-mini
   2. Trong hàm analyzeWithAI: XOÁ dòng return parseDirective(text)
      và BỎ COMMENT khối gọi AI thật bên dưới (chọn 1 trong 2 mẫu).
   3. AI phải trả về MẢNG JSON đúng format DirectiveDraft — prompt mẫu đã
      viết sẵn, phần lớn model trả đúng; có sẵn bước parse + kiểm tra lỗi.
   Kết quả client nhận: { ok, drafts, model } — client tự hiển thị tên model.
   ════════════════════════════════════════════════════════════════════ */

async function analyzeWithAI(text: string): Promise<{ drafts: DirectiveDraft[]; model: string }> {
  // ---- MẶC ĐỊNH (demo): parser quy tắc chạy trên máy chủ ----
  return { drafts: parseDirective(text), model: "tnth-kpi-v1 (mô phỏng quy tắc)" };

  /* ---- MẪU A: API tương thích OpenAI (OpenAI, Groq, OpenRouter, together…) ----
  const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Bạn là trợ lý lượng hoá công văn của Đoàn TNCS Hồ Chí Minh. Đọc văn bản công văn và trích ra các chỉ tiêu KPI định lượng. Chỉ trả về DUY NHẤT mảng JSON (không markdown, không giải thích), mỗi phần tử: {"metricName": "tên chỉ tiêu ≤80 ký tự", "targetValue": số, "unit": "đơn vị tính (lượt|bài|người|sân chơi|biên bản|%|…)", "aggregationType": "SUM" (dùng "PERCENT" nếu đơn vị là %), "dueDate": "YYYY-MM-DD" hoặc "" nếu không nêu hạn}.',
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "[]") as string;
  const drafts = JSON.parse(raw.replace(/^```json?|```$/g, "").trim()) as DirectiveDraft[];
  return { drafts, model: process.env.AI_MODEL ?? "gpt-4o-mini" };
  ---------------------------------------------------------------- */

  /* ---- MẪU B: Anthropic Claude ----
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.AI_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: `... cùng prompt system ở mẫu A, ghép vào đây ...\n\nNội dung công văn:\n${text}` }],
    }),
  });
  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "[]") as string;
  const drafts = JSON.parse(raw.replace(/^```json?|```$/g, "").trim()) as DirectiveDraft[];
  return { drafts, model: process.env.AI_MODEL ?? "claude" };
  ---------------------------------------------------------------- */
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
