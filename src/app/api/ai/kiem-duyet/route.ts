import { NextResponse } from "next/server";
import { moderateWithAI } from "@/lib/server/moderation-prompt";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "KIỂM DUYỆT DIỄN ĐÀN" — prompt dùng chung tại
   lib/server/moderation-prompt.ts (dùng chung với bình chọn HS3T /
   Đoàn trường). Key AI nằm 100% phía BE (env), không xuống client.
   Chưa có key → route trả 502 → CLIENT tự fallback ruleModerate cục bộ
   (lib/ai-moderation.ts) nên demo không bao giờ gãy.
   ════════════════════════════════════════════════════════════════════ */

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
