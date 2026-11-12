import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
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
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để dùng chức năng này." }, { status: 401 });
  }
  if (session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "Chức năng dành cho cán bộ quản trị." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { ctx?: ReportDraftContext; extraText?: string }
    | null;
  const ctx = payload?.ctx;
  if (!ctx || !ctx.orgUnitName) {
    return NextResponse.json({ ok: false, error: "Thiếu ngữ cảnh báo cáo (ctx)." }, { status: 400 });
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
