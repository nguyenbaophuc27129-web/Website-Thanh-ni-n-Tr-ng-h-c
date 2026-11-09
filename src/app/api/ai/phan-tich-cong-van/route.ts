import { NextResponse } from "next/server";
import type { DirectiveDraft } from "@/lib/ai-directive";
import { callAI } from "@/lib/ai-client";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";
import { buildDocContext } from "@/lib/server/doc-context";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "AI PHÂN TÍCH CÔNG VĂN" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502 → client /quan-tri/nhiem-vu/ai-phan-tich
   tự dùng parser quy tắc cục bộ (lib/ai-directive.ts) nên demo không gãy.
   ════════════════════════════════════════════════════════════════════ */

/** Trần độ dài công văn gửi AI (ký tự) */
const MAX_TEXT_CHARS = 30_000;

const DIRECTIVE_SYSTEM_PROMPT =
  'Bạn là trợ lý lượng hoá công văn của Đoàn TNCS Hồ Chí Minh. Đọc văn bản công văn và trích ra các chỉ tiêu KPI định lượng. Chỉ trả về DUY NHẤT mảng JSON (không markdown, không giải thích), mỗi phần tử: {"metricName": "tên chỉ tiêu ≤80 ký tự", "targetValue": số, "unit": "đơn vị tính (lượt|bài|người|sân chơi|biên bản|%|…)", "aggregationType": "SUM" (dùng "PERCENT" nếu đơn vị là %), "dueDate": "YYYY-MM-DD" hoặc "" nếu không nêu hạn}.\n' +
  'QUAN TRỌNG NHẤT — ĐỘ CHÍNH XÁC: nếu user content có khối "<<<ĐOẠN CẦN LƯỢNG HOÁ>>>" thì CHỈ trích chỉ tiêu NẰM TRONG khối đánh dấu đó, tuyệt đối không lấy chỉ tiêu ở phần khác của công văn (cấp trên giao theo từng ý — người dùng yêu cầu ý nào phải trả đúng ý đó). metricName giữ đúng ý nghĩa và cách gọi tên chỉ tiêu trong văn bản, không suy diễn thêm.';

const EXCERPT_OPEN = "<<<ĐOẠN CẦN LƯỢNG HOÁ>>>";
const EXCERPT_CLOSE = "<<<HẾT ĐOẠN>>>";

// Schema thống nhất DirectiveDraft — targetValue là NUMBER (không phải chuỗi "95%"),
// aggregationType khớp đúng 5 giá trị type DirectiveDraft, dueDate rỗng nếu công văn không nêu hạn.
const DIRECTIVE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      metricName: { type: "STRING" },
      targetValue: { type: "NUMBER" },
      unit: { type: "STRING" },
      aggregationType: { type: "STRING", enum: ["SUM", "COUNT", "AVG", "MAX", "PERCENT"] },
      dueDate: { type: "STRING" },
    },
    required: ["metricName", "targetValue", "unit", "aggregationType", "dueDate"],
    propertyOrdering: ["metricName", "targetValue", "unit", "aggregationType", "dueDate"],
  },
};

async function analyzeWithAI(text: string, excerpt: string): Promise<{ drafts: DirectiveDraft[]; model: string }> {
  // RAG nhỏ: trích văn bản TW đã ban hành giúp chuẩn hoá tên chỉ tiêu theo cách TW gọi
  const docContext = await buildDocContext(`${text.slice(0, 1500)} ${excerpt}`.trim(), 2000);
  const user = [
    text,
    excerpt
      ? `\n${EXCERPT_OPEN}\n${excerpt}\n${EXCERPT_CLOSE}`
      : "",
    docContext ? `\n\n[TÀI LIỆU THAM KHẢO — VĂN BẢN TW ĐÃ BAN HÀNH, dùng đúng cách gọi tên chỉ tiêu]\n${docContext}` : "",
  ].join("");
  const { text: raw, model } = await callAI({
    system: DIRECTIVE_SYSTEM_PROMPT,
    user,
    maxTokens: 2000,
    temperature: 0.2,
    json: true,
    jsonSchema: DIRECTIVE_SCHEMA,
  });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI không trả về mảng JSON hợp lệ");
  const drafts = JSON.parse(match[0]) as DirectiveDraft[];
  return { drafts, model };
}

/** POST /api/ai/phan-tich-cong-van — { text, excerpt? } → { ok, drafts, model } */
export async function POST(request: Request) {
  // Chỉ cán bộ (trang /quan-tri/nhiem-vu/ai-phan-tich) + giới hạn lượt theo tài khoản
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-phan-tich-cong-van",
    windowMs: 10 * 60_000,
    perAccount: 20,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as { text?: string; excerpt?: string } | null;
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  const excerpt = typeof payload?.excerpt === "string" ? payload.excerpt.trim() : "";
  if (text.length < 40) {
    return NextResponse.json({ ok: false, error: "Nội dung công văn quá ngắn (cần ≥ 40 ký tự)." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { ok: false, error: `Công văn quá dài — tối đa ${MAX_TEXT_CHARS.toLocaleString("vi-VN")} ký tự, hãy dán phần có chỉ tiêu.` },
      { status: 413 },
    );
  }
  if (excerpt && (excerpt.length < 5 || excerpt.length > MAX_TEXT_CHARS)) {
    return NextResponse.json({ ok: false, error: "Đoạn ý được chọn không hợp lệ." }, { status: 400 });
  }
  try {
    const { drafts, model } = await analyzeWithAI(text, excerpt);
    return NextResponse.json({ ok: true, drafts, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Phân tích công văn thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
