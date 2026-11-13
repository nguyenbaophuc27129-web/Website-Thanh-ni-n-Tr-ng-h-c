import { NextRequest, NextResponse } from "next/server";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { buildDocContext } from "@/lib/server/doc-context";
import { SKILL_THE_THUC_29HD, SYSTEM_PROMPT_29HD_COMPACT } from "@/data/the-thuc-van-ban";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   "TRỢ LÝ AI" RIÊNG CHO CÁN BỘ QUẢN TRỊ — /quan-tri/tro-ly-ai
   ════════════════════════════════════════════════════════════════════
   Soạn và biên tập văn bản, báo cáo, kế hoạch hoạt động, tra cứu quy chế
   và văn bản TW đã ban hành (RAG theo file thật).
   Cấu trúc prompt tuân thủ nghiêm ngặt chỉ đạo:
   1. TRÊN ĐẦU: [CÂU HỎI / YÊU CẦU CỦA CÁN BỘ], [HỘI THOẠI], [TÀI LIỆU THAM KHẢO] (Prompt & Nội dung).
   2. DƯỚI CÙNG: [BỘ KỸ NĂNG THỂ THỨC VĂN BẢN ĐOÀN 100% THEO 29-HD/TWĐTN-VP & MẪU 3] (Skill).
   ════════════════════════════════════════════════════════════════════ */

const MAX_HISTORY_TURNS = 12;

const TRO_LY_SYSTEM_PROMPT =
  "Bạn là Trợ lý AI chuyên sâu cho cán bộ, công chức Đoàn TNCS Hồ Chí Minh làm việc trên Cổng Thanh niên Trường học. " +
  "Nhiệm vụ: Soạn thảo và biên tập văn bản, báo cáo, kế hoạch, tờ trình, công văn đúng văn phong và thể thức hành chính của Đoàn; " +
  "giải đáp nghiệp vụ công tác Đoàn trường học; tham chiếu VĂN BẢN TW ĐÃ BAN HÀNH được cấp kèm (nếu có) — trích đúng số hiệu, không bịa số hiệu hay nội dung ngoài tài liệu. " +
  "Bắt buộc định dạng: Viết tiếng Việt hành chính plain-text thuần — KHÔNG dùng markdown (#, ##, **, *), KHÔNG dùng bảng markdown; " +
  "đánh mục bằng chữ (I. / 1. / 1.1.) và gạch đầu dòng '- ', xuống dòng rõ ràng, dóng gạch chuẩn chỉnh. Trả lời đúng trọng tâm nhưng đầy đủ theo thể thức.";

async function replyWithAI(
  history: { role: string; content: string }[],
  question: string
): Promise<{ reply: string; model: string }> {
  const docContext = await buildDocContext(question, 6000);
  const turns = history
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => `${t.role === "assistant" ? "Trợ lý" : "Người dùng"}: ${t.content}`)
    .join("\n");

  // ĐÚNG YÊU CẦU CỦA NGƯỜI DÙNG:
  // Prompt và nội dung để lên TRÊN ĐẦU;
  // Cái skill thể thức 29-HD để XUỐNG DƯỚI CÙNG.
  const user = [
    "════════════════════════════════════════════════════════════════",
    "[CÂU HỎI / YÊU CẦU HIỆN TẠI CỦA CÁN BỘ — PROMPT & NỘI DUNG CHÍNH]",
    question,
    "",
    turns ? `════════════════════════════════════════════════════════════════
[HỘI THOẠI TRƯỚC ĐÓ]
${turns}
` : "",
    docContext
      ? `════════════════════════════════════════════════════════════════
[TÀI LIỆU THAM KHẢO — VĂN BẢN TW ĐÃ BAN HÀNH TRONG MỤC VĂN BẢN]
${docContext}
`
      : "",
    "════════════════════════════════════════════════════════════════",
    "[BỘ KỸ NĂNG & QUY CHUẨN THỂ THỨC VĂN BẢN ĐOÀN — CHUẨN 100% HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 3]",
    "Khi soạn thảo văn bản hành chính Đoàn (Báo cáo, Công văn, Kế hoạch, Quyết định, Tờ trình, Thông báo...), BẮT BUỘC tuân thủ 100% thể thức sau:",
    SKILL_THE_THUC_29HD,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, model } = await callAI({
    system: SYSTEM_PROMPT_29HD_COMPACT,
    user,
    maxTokens: 3600,
    temperature: 0.25,
  });
  return { reply: cleanAiText(text), model };
}

/** POST /api/ai/tro-ly — { history: [{role:"user"|"assistant", content}], question } → { ok, reply, model } */
export async function POST(request: NextRequest) {
  // Chỉ cán bộ + giới hạn lượt theo tài khoản và trần AI chung
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-tro-ly",
    windowMs: 10 * 60_000,
    perAccount: 40,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as
    | { history?: { role?: string; content?: string }[]; question?: string }
    | null;
  const question = payload?.question?.trim() ?? "";
  if (!question) {
    return NextResponse.json({ ok: false, error: "Nhập câu hỏi của bạn." }, { status: 400 });
  }
  const history = (payload?.history ?? [])
    .filter((t) => (t?.role === "user" || t?.role === "assistant") && !!t?.content?.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role as string, content: (t.content as string).trim().slice(0, 2000) }));

  try {
    const { reply, model } = await replyWithAI(history, question);
    return NextResponse.json({ ok: true, reply, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Trợ lý AI thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
