import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { buildDocContext } from "@/lib/server/doc-context";
import { buildBaoCaoSystemPrompt, periodKindOf } from "@/data/bao-cao-agent";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI AGENT TỔNG HỢP BÁO CÁO — THEO 100% ĐẶC TẢ
   "Dac_ta_huan_luyen_AI_agent_bao_cao_Doan.docx" (khung nhiệm vụ,
   giải pháp nhiệm kỳ 2026 - 2031). System prompt dựng từ
   src/data/bao-cao-agent.ts (khung đề cương, bộ mã NV/CT/DP/DA,
   quy tắc R1-R10, quy tắc viết, tự kiểm, mẫu đầu ra).
   Bản ghi hoạt động đầu vào theo định dạng mục IX đặc tả.
   Chưa có key → route trả 502 → client tự dựng nháp nên demo không gãy.
   ════════════════════════════════════════════════════════════════════ */

export interface ReportActivityRecord {
  id: string | number;
  ten: string;
  ngay?: string; // dd/mm/yyyy — ngày diễn ra
  dia_diem?: string;
  chu_tri?: string;
  phoi_hop?: string;
  doi_tuong?: string[];
  mo_ta: string;
  so_lieu?: { chi_so: string; gia_tri: number; don_vi: string; loai: "ket_qua" | "muc_tieu" | "du_kien" }[];
  nguon?: string[];
}

export interface ReportDraftContext {
  orgUnitName: string;
  /** "truong" | "xa" | "tinh" | "tw" */
  cap?: string;
  period: string;
  periodKind?: string;
  periodStart?: string; // dd/mm/yyyy
  periodEnd?: string; // dd/mm/yyyy
  activityCount: number;
  participantCount: number;
  taskLines: string[];
  postCount: number;
  activities?: ReportActivityRecord[];
  suggestions?: string[];
}

const SYSTEM_PROMPT = buildBaoCaoSystemPrompt();

/** Đặc tả: phần V "CHỈ có khi đầu vào có đề xuất" — cắt hẳn phần V rỗng (model hay in câu thay thế) */
function stripEmptySectionV(text: string, hasSuggestions: boolean): string {
  if (hasSuggestions) return text;
  const idx = text.search(/^V\. ĐỀ XUẤT[^\n]*$/m);
  if (idx === -1) return text;
  const noiNhanIdx = text.indexOf("Nơi nhận:", idx);
  const cut = noiNhanIdx === -1 ? text.length : noiNhanIdx;
  return (text.slice(0, idx) + text.slice(cut)).replace(/\n{3,}/g, "\n\n").trim();
}

async function draftWithAI(ctx: ReportDraftContext): Promise<{ content: string; model: string }> {
  const topic = [ctx.orgUnitName, ctx.period, ...ctx.taskLines, ...(ctx.activities ?? []).slice(0, 40).map((a) => a.ten)].join(" ");
  const docContext = await buildDocContext(topic, 5000);
  const user = [
    `[KỲ BÁO CÁO] ${ctx.period}${ctx.periodStart ? ` (từ ngày ${ctx.periodStart} đến ngày ${ctx.periodEnd})` : ""}`,
    `[CẤP BÁO CÁO] ${ctx.cap ?? "truong"} — Đơn vị: ${ctx.orgUnitName}`,
    `[BẢN GHI HOẠT ĐỘNG ĐẦU VÀO — JSON theo định dạng mục IX đặc tả; mỗi bản ghi một hoạt động]`,
    JSON.stringify({
      don_vi_bao_cao: ctx.orgUnitName,
      cap: ctx.cap ?? "truong",
      ky_bao_cao: { tu: ctx.periodStart ?? "", den: ctx.periodEnd ?? "" },
      so_bai_xuat_ban: ctx.postCount,
      noi_dung_nhiem_vu_gan_chi_tieu: ctx.taskLines,
      ban_ghi: ctx.activities ?? [],
    }),
    ctx.suggestions?.length ? `[ĐỀ XUẤT, KIẾN NGHỊ CỦA ĐƠN VỊ]\n- ${ctx.suggestions.join("\n- ")}` : "",
    docContext
      ? `\n\n[TÀI LIỆU THAM KHẢO — đặc tả khung/bộ mã và văn bản TW, dẫn đúng số hiệu/nội dung khi phù hợp]\n${docContext}`
      : "",
  ].filter(Boolean).join("\n");

  const { text, model } = await callAI({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 7000,
    temperature: 0.3,
  });
  return { content: stripEmptySectionV(cleanAiText(text), Boolean(ctx.suggestions?.length)), model };
}

/** POST /api/ai/nhap-bao-cao — { ctx } → { ok, content, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { ctx?: ReportDraftContext } | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
  }
  try {
    const { content, model } = await draftWithAI({ ...ctx, periodKind: periodKindOf(ctx.periodKind ?? "") });
    return NextResponse.json({ ok: true, content, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Tạo nháp báo cáo thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
