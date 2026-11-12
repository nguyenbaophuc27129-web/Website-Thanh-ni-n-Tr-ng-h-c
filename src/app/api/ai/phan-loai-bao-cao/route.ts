import { NextResponse } from "next/server";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";
import { callAI } from "@/lib/ai-client";
import { buildPhanLoaiSystemPrompt, PHAN_LOAI_SCHEMA } from "@/data/bao-cao-agent";
import { sanitizeClassified, type ClassifiedRecord } from "@/lib/server/bao-cao-pipeline";
import type { ReportDraftContext } from "@/app/api/ai/nhap-bao-cao/route";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   STAGE 1 — PHÂN LOẠI BẢN GHI HOẠT ĐỘNG (bước 2-5 đặc tả mục V)
   Body: { ctx, extraText? }
   → AI trả JSON phân loại R1-R10 → route kiểm chứng bằng quy tắc
     deterministic (sanitizeClassified) → trả records + thống kê.
   extraText: nguồn dán tay (tin báo chí, công văn…) — AI trích xuất
   thành bản ghi EXT1, EXT2… theo R7.
   ════════════════════════════════════════════════════════════════════ */

const EXTRA_TEXT_MAX = 30_000;
/** Trần dung lượng ngữ cảnh — cùng mức với /api/ai/nhap-bao-cao */
const MAX_CTX_CHARS = 100_000;

const SYSTEM_PROMPT = buildPhanLoaiSystemPrompt();

/** Đọc JSON từ output AI (chống markdown fence / chữ thừa) */
function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fallthrough */
      }
    }
    throw new Error("AI trả về JSON không hợp lệ");
  }
}

export async function POST(request: Request) {
  // Chỉ cán bộ + giới hạn lượt theo tài khoản và trần AI chung (như /api/ai/nhap-bao-cao)
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-phan-loai-bao-cao",
    windowMs: 10 * 60_000,
    perAccount: 20,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as
    | { ctx?: ReportDraftContext; extraText?: string }
    | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
  }
  if (JSON.stringify(ctx).length > MAX_CTX_CHARS) {
    return NextResponse.json({ ok: false, error: "Số liệu gửi lên quá lớn để phân loại." }, { status: 413 });
  }

  const extraText = (payload?.extraText ?? "").trim().slice(0, EXTRA_TEXT_MAX);

  const user = [
    `[KỲ BÁO CÁO] từ ngày ${ctx.periodStart ?? "…"} đến ngày ${ctx.periodEnd ?? "…"} (${ctx.period})`,
    `[ĐƠN VỊ BÁO CÁO] ${ctx.orgUnitName} (cấp ${ctx.cap ?? "truong"})`,
    `[DANH SÁCH BẢN GHI HOẠT ĐỘNG ĐẦU VÀO — phân loại từng bản ghi, giữ nguyên id]`,
    JSON.stringify(ctx.activities ?? []),
    extraText
      ? `[NGUỒN DÁN TAY — trích xuất thành bản ghi EXT1, EXT2… theo R7, gán đủ trường]\n${extraText}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { text, model } = await callAI({
      system: SYSTEM_PROMPT,
      user,
      json: true,
      jsonSchema: PHAN_LOAI_SCHEMA,
      maxTokens: 8000,
      temperature: 0.1,
    });
    const parsed = parseJsonLoose(text);
    const rawList = Array.isArray((parsed as { ban_ghi?: unknown[] })?.ban_ghi)
      ? ((parsed as { ban_ghi: unknown[] }).ban_ghi)
      : Array.isArray(parsed)
        ? parsed
        : [];
    if (rawList.length === 0) throw new Error("AI không trả về bản ghi nào");

    // Kiểm chứng bằng quy tắc deterministic (R1, R3, mã hợp lệ) + R4 gộp trùng
    const records: ClassifiedRecord[] = sanitizeClassified(rawList, ctx);

    const stats = {
      total: records.length,
      DUA_VAO: records.filter((r) => r.trang_thai === "DUA_VAO").length,
      NGOAI_KY: records.filter((r) => r.trang_thai === "NGOAI_KY").length,
      KHONG_PHAI_DOAN: records.filter((r) => r.trang_thai === "KHONG_PHAI_DOAN").length,
      CAN_XAC_MINH: records.filter((r) => r.trang_thai === "CAN_XAC_MINH").length,
      PHUONG_HUONG: records.filter((r) => r.trang_thai === "PHUONG_HUONG").length,
      extracted: records.filter((r) => /^EXT/i.test(r.id)).length,
    };

    return NextResponse.json({ ok: true, records, stats, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Phân loại bản ghi báo cáo thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
