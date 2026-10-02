import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   ⭐ NỐI AI THẬT CHO "TẠO NHÁP BÁO CÁO" — CHỈ SỬA 1 HÀM DƯỚI ĐÂY
   ════════════════════════════════════════════════════════════════════
   Cách nối:
   1. .env.local thêm: AI_API_KEY / AI_BASE_URL / AI_MODEL (xem route
      phan-tich-cong-van để biết chi tiết).
   2. Trong hàm draftWithAI: XOÁ return template và BỎ COMMENT mẫu A/B.
   3. Client nhận { ok, content, model } — content là văn bản thường,
      các đoạn cách nhau bằng 1 dòng trống.
   ════════════════════════════════════════════════════════════════════ */

export interface ReportDraftContext {
  orgUnitName: string;
  period: string;
  activityCount: number;
  participantCount: number;
  taskLines: string[];
  postCount: number;
}

async function draftWithAI(ctx: ReportDraftContext): Promise<{ content: string; model: string }> {
  // ---- MẶC ĐỊNH (demo): dựng nháp từ số liệu hệ thống ----
  const content = [
    "Kính gửi cấp trên,",
    `Trong ${ctx.period}, ${ctx.orgUnitName} đã triển khai ${ctx.activityCount} hoạt động với tổng ${ctx.participantCount.toLocaleString("vi-VN")} lượt đoàn viên tham gia.`,
    `Tiến độ nhiệm vụ thi đua: ${ctx.taskLines.length > 0 ? ctx.taskLines.join("; ") : "chưa có nhiệm vụ được giao"}.`,
    `Công tác truyền thông ghi nhận ${ctx.postCount} tin bài đăng công khai.`,
    "Kiến nghị: đề nghị cấp trên quan tâm hỗ trợ kinh phí hoạt động và gia hạn một số nhiệm vụ tại địa phương.",
  ].join("\n\n");
  return { content, model: "tnth-draft-v1 (mô phỏng quy tắc)" };

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
        {
          role: "system",
          content:
            "Bạn là trợ lý soạn báo cáo cho Đoàn TNCS Hồ Chí Minh. Viết bản nháp báo cáo tiếng Việt trang trọng theo văn phong hành chính Đoàn, 4–6 đoạn, các đoạn cách nhau bằng 1 dòng trống, dựa trên số liệu được cung cấp. Không bịa số liệu ngoài số liệu đã cho; phần kiến nghị giữ tinh thần đề xuất thiết thực.",
        },
        { role: "user", content: JSON.stringify(ctx) },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content ?? "") as string;
  return { content: content.trim(), model: process.env.AI_MODEL ?? "gpt-4o-mini" };
  ---------------------------------------------------------------- */
}

/** POST /api/ai/nhap-bao-cao — { ctx } → { ok, content, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { ctx?: ReportDraftContext } | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
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
