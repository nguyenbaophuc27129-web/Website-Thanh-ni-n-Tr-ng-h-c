import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { buildDocContext } from "@/lib/server/doc-context";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   "TRỢ LÝ AI" RIÊNG CHO CÁN BỘ QUẢN TRỊ — /quan-tri/tro-ly-ai
   ════════════════════════════════════════════════════════════════════
   Khác widget chat công khai: chuyên sâu công việc cán bộ (soạn văn bản,
   báo cáo, kế hoạch, tra cứu quy chế/văn bản TW đã ban hành trong mục
   Văn bản — RAG theo FILE THẬT). Đầu ra plain-text, tuyệt đối không
   markdown/dấu *. Khách → 401; Đoàn viên → 403.
   History client gửi kèm, gom thành 1 user turn (callAI single-turn).
   ════════════════════════════════════════════════════════════════════ */

const MAX_HISTORY_TURNS = 12;

const TRO_LY_SYSTEM_PROMPT =
  "Bạn là Trợ lý AI chuyên sâu cho cán bộ, công chức Đoàn TNCS Hồ Chí Minh làm việc trên Cổng Thanh niên Trường học. " +
  "Nhiệm vụ: soạn và biên tập văn bản - báo cáo - kế hoạch hoạt động đúng văn phong hành chính Đoàn; trả lời nghiệp vụ về quy chế, chương trình, " +
  "nhiệm vụ thi đua, công tác Thanh niên Trường học; tham chiếu VĂN BẢN TW ĐÃ BAN HÀNH được cấp kèm dưới đây (nếu có) — trích đúng số hiệu, " +
  "không bịa số hiệu hay nội dung ngoài tài liệu. Khi ngữ cảnh không đủ đáp án, trả lời theo kiến thức nghiệp vụ chung và nói rõ người dùng nên đối chiếu văn bản gốc. " +
  "Bắt buộc định dạng: viết tiếng Việt hành chính plain-text — KHÔNG dùng markdown, KHÔNG dùng dấu *, KHÔNG ký tự #, không bảng; " +
  "đánh mục bằng chữ (A. / 1. / a)) và gạch đầu dòng '– ', xuống dòng rõ ràng. Trả lời đủ ý nhưng không lan man.";

async function replyWithAI(
  history: { role: string; content: string }[],
  question: string
): Promise<{ reply: string; model: string }> {
  const docContext = await buildDocContext(question, 6000);
  const turns = history
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => `${t.role === "assistant" ? "Trợ lý" : "Người dùng"}: ${t.content}`)
    .join("\n");
  const user = [
    turns ? `[HỘI THOẠI TRƯỚC ĐÓ]\n${turns}\n` : "",
    docContext
      ? `[TÀI LIỆU THAM KHẢO — VĂN BẢN TW ĐÃ BAN HÀNH TRONG MỤC VĂN BẢN]\n${docContext}\n`
      : "",
    `[CÂU HỎI HIỆN TẠI]\n${question}`,
  ]
    .filter(Boolean)
    .join("\n");
  const { text, model } = await callAI({
    system: TRO_LY_SYSTEM_PROMPT,
    user,
    maxTokens: 1200,
    temperature: 0.4,
  });
  return { reply: cleanAiText(text), model };
}

/** POST /api/ai/tro-ly — { history: [{role:"user"|"assistant", content}], question } → { ok, reply, model } */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session = null;
  if (token) {
    try {
      session = await sessionFromToken(token);
    } catch {
      session = null;
    }
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
  }
  if (session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "Trợ lý AI dành cho cán bộ quản trị." }, { status: 403 });
  }

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
