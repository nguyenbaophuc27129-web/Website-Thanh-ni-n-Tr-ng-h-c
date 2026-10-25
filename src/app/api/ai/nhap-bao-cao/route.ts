import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "TẠO NHÁP BÁO CÁO" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502 → client /quan-tri/bao-cao tự dựng nháp
   theo số liệu hệ thống nên demo không gãy.
   ════════════════════════════════════════════════════════════════════ */

export interface ReportDraftContext {
  orgUnitName: string;
  period: string;
  activityCount: number;
  participantCount: number;
  taskLines: string[];
  postCount: number;
}

/** Trần độ dài ngữ cảnh gửi AI (ký tự JSON) */
const MAX_CTX_CHARS = 20_000;

const REPORT_SYSTEM_PROMPT =
  "Bạn là trợ lý soạn báo cáo cho Đoàn TNCS Hồ Chí Minh. Viết bản nháp báo cáo tiếng Việt trang trọng theo văn phong hành chính Đoàn, 4–6 đoạn, các đoạn cách nhau bằng 1 dòng trống, dựa trên số liệu được cung cấp. Không bịa số liệu ngoài số liệu đã cho; phần kiến nghị giữ tinh thần đề xuất thiết thực.";

async function draftWithAI(ctx: ReportDraftContext): Promise<{ content: string; model: string }> {
  const { text, model } = await callAI({
    system: REPORT_SYSTEM_PROMPT,
    user: JSON.stringify(ctx),
    maxTokens: 1200,
    temperature: 0.4,
  });
  return { content: text, model };
}

/** POST /api/ai/nhap-bao-cao — { ctx } → { ok, content, model } */
export async function POST(request: Request) {
  // Chỉ cán bộ (trang /quan-tri/bao-cao) + giới hạn lượt theo tài khoản
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-nhap-bao-cao",
    windowMs: 10 * 60_000,
    perAccount: 20,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as { ctx?: ReportDraftContext } | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
  }
  if (JSON.stringify(ctx).length > MAX_CTX_CHARS) {
    return NextResponse.json({ ok: false, error: "Số liệu gửi lên quá lớn để tạo nháp." }, { status: 413 });
  }
  try {
    const { content, model } = await draftWithAI(ctx);
    return NextResponse.json({ ok: true, content, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Tạo nháp báo cáo thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
