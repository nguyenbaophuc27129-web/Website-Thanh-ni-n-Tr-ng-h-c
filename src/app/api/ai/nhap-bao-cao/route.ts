import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { buildDocContext } from "@/lib/server/doc-context";
import { buildBaoCaoSystemPrompt, periodKindOf } from "@/data/bao-cao-agent";
import {
  aggregateSection2,
  buildRepairInstruction,
  buildStage2UserMessage,
  runSelfChecks,
  sanitizeClassified,
  type ClassifiedRecord,
  type SelfCheckResult,
} from "@/lib/server/bao-cao-pipeline";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   STAGE 2 — AI AGENT VIẾT BÁO CÁO THEO 100% ĐẶC TẢ
   "Dac_ta_huan_luyen_AI_agent_bao_cao_Doan" (khung nhiệm vụ, giải pháp
   nhiệm kỳ 2026 - 2031). System prompt dựng từ src/data/bao-cao-agent.ts.

   Body: { ctx, classified? }
   • Có `classified` (kết quả stage 1 từ /api/ai/phan-loai-bao-cao):
     route kiểm chứng lại bằng quy tắc deterministic, cộng số liệu
     ket_qua theo R10, gửi bản ghi + nhãn cho AI viết đúng khung, rồi
     TỰ KIỂM (mục X) — lỗi thì gọi thêm 1 lượt sửa.
   • Không có `classified`: gọi 1 lượt như trước (tương thích ngược).
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

async function requireSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return { error: 401 as const, message: "Bạn cần đăng nhập để dùng chức năng này." };
  try {
    const session = await sessionFromToken(token);
    if (!session) return { error: 401 as const, message: "Phiên làm việc không hợp lệ." };
    if (session.role === "DOAN_VIEN") {
      return { error: 403 as const, message: "Chức năng dành cho cán bộ quản trị." };
    }
    return { session };
  } catch {
    return { error: 401 as const, message: "Phiên làm việc không hợp lệ." };
  }
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
    maxTokens: 8000,
    temperature: 0.25,
  });
  return { content: stripEmptySectionV(cleanAiText(text), Boolean(ctx.suggestions?.length)), model };
}

/** Stage 2 có dữ liệu phân loại kiểm chứng — viết từ bản ghi DUA_VAO, tự kiểm, sửa 1 lượt nếu lỗi */
async function draftWithClassified(
  ctx: ReportDraftContext,
  classified: unknown[]
): Promise<{ content: string; model: string; checks: SelfCheckResult; repaired: boolean }> {
  const records = sanitizeClassified(classified, ctx);
  const agg = aggregateSection2(records);
  const topic = [ctx.orgUnitName, ctx.period, ...records.slice(0, 40).map((r) => r.ten)].join(" ");
  const docContext = await buildDocContext(topic, 4000);
  const user = buildStage2UserMessage(ctx, records, agg, docContext || undefined);
  const hasSuggestions = Boolean(ctx.suggestions?.length);

  const { text, model } = await callAI({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 8000,
    temperature: 0.2,
  });
  let content = stripEmptySectionV(cleanAiText(text), hasSuggestions);
  let checks = runSelfChecks(content, ctx, records, hasSuggestions);
  let repaired = false;

  if (!checks.pass) {
    const failed = checks.items.filter((i) => !i.pass);
    const fixRes = await callAI({
      system: SYSTEM_PROMPT,
      user: `${user}\n\n[BẢN NHÁP HIỆN TẠI]\n${content}\n\n[TỰ KIỂM PHÁT HIỆN THIẾU SÓT — TRẢ VỀ TOÀN BỘ BẢN BÁO CÁO ĐÃ SỬA]\n${buildRepairInstruction(failed)}`,
      maxTokens: 8000,
      temperature: 0.1,
    });
    const fixed = stripEmptySectionV(cleanAiText(fixRes.text), hasSuggestions);
    const fixedChecks = runSelfChecks(fixed, ctx, records, hasSuggestions);
    if (fixedChecks.pass || fixedChecks.items.filter((i) => !i.pass).length < failed.length) {
      content = fixed;
      checks = fixedChecks;
      repaired = true;
    }
  }

  return { content, model, checks, repaired };
}

/** POST /api/ai/nhap-bao-cao — { ctx, classified? } → { ok, content, model, checks? } */
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.error });
  }

  const payload = (await request.json().catch(() => null)) as
    | { ctx?: ReportDraftContext; classified?: unknown[] }
    | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
  }
  const normalized: ReportDraftContext = { ...ctx, periodKind: periodKindOf(ctx.periodKind ?? "") };

  try {
    if (Array.isArray(payload?.classified) && payload.classified.length > 0) {
      const { content, model, checks, repaired } = await draftWithClassified(normalized, payload.classified);
      return NextResponse.json({ ok: true, content, model, checks, repaired });
    }
    const { content, model } = await draftWithAI(normalized);
    return NextResponse.json({ ok: true, content, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Tạo nháp báo cáo thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
