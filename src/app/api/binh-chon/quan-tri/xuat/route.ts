import ExcelJS from "exceljs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import {
  adminScopePaths,
  getActiveCampaign,
  isAdminSession,
  scopeClause,
  STORY_DETAIL_SELECT,
  toStoryDto,
  toUnitStoryDto,
  UNIT_STORY_SELECT,
  type AdminScope,
} from "@/lib/server/binh-chon";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "@/lib/server/media";
import { createZipStoreStream, type ZipEntry } from "@/lib/server/zip-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/binh-chon/quan-tri/xuat?kind=HS3T|DOAN_TRUONG&part=excel|zip
 *
 * Xuất lưu trữ toàn bộ bài dự thi của chiến dịch đang mở (mới nhất theo kind):
 * - part=excel → 1 file .xlsx: toàn bộ bài (mọi trạng thái) + số phiếu + nội dung.
 * - part=zip   → stream ZIP (STORE, không nén) ảnh chính + gallery (đặt tên
 *   {STT}_{TênHS}_{Trường}) và minh chứng PDF.
 *
 * Phạm vi: giống /api/binh-chon/quan-tri — TW toàn quốc, cấp dưới chỉ subtree
 * theo cây đơn vị. Gmail người gửi và minh chứng PDF (có thông tin cá nhân HS)
 * CHỈ đưa vào file khi scope toàn quốc (Quản trị TW).
 */

// ── Kiểm quyền như route quan-tri ──

async function adminOf(request: NextRequest): Promise<{ session: SessionDto; scope: AdminScope } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session || !dbEnabled()) return null;
  const perms = effectivePermissions({ role: session.role, contactPosition: session.contactPosition, grantedPerms: session.grantedPerms });
  if (!isAdminSession(session, perms)) return null;
  const scope = await adminScopePaths(session);
  return { session, scope };
}

// ── Nhãn ──

const STATUS_LABEL: Record<string, string> = { PENDING: "Chờ duyệt", APPROVED: "Đã công khai", REJECTED: "Từ chối" };
const HONOR_LABEL: Record<string, string> = { TRUONG: "Cấp Trường", TINH: "Cấp Tỉnh/TP", TW_DE_CU: "Trung ương đề cử" };

const fmtDateTime = (v: Date | string | null | undefined): string => {
  if (v === null || v === undefined) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const clip = (s: string | null | undefined, max = 30000): string => (s ?? "").slice(0, max);

/** Đặt tên tệp trong ZIP: bỏ ký tự cấm của Windows, giữ chữ tiếng Việt, chặn độ dài */
function safeFilePart(input: string | null | undefined, maxLen: number): string {
  const cleaned = (input ?? "")
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLen);
}

/** URL /uploads/binh-chon/... → đường dẫn tuyệt đối trên đĩa (bắt buộc nằm trong UPLOAD_DIR) */
function uploadUrlToDisk(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const abs = path.resolve(UPLOAD_DIR, url.slice(UPLOAD_URL_PREFIX.length));
  const root = path.resolve(UPLOAD_DIR);
  return abs === root || abs.startsWith(root + path.sep) ? abs : null;
}

function fileExt(url: string): string {
  const base = url.slice(url.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase().slice(0, 8) : "";
}

// ── Kiểu dòng (khớp STORY_DETAIL_SELECT / UNIT_STORY_SELECT) ──

type StoryExportRow = Parameters<typeof toStoryDto>[0] & { gallery?: { data_url?: string; caption?: string }[] | null };
type UnitExportRow = Parameters<typeof toUnitStoryDto>[0];

interface StoryFiles {
  main: string | null;
  gallery: string[];
  evidence: { url: string; name: string }[];
}

function storyFiles(r: StoryExportRow, withEvidence: boolean): StoryFiles {
  return {
    main: r.photo_data_url ?? null,
    gallery: (r.gallery ?? [])
      .map((g) => g?.data_url ?? "")
      .filter((u) => u.startsWith(UPLOAD_URL_PREFIX))
      .slice(0, 4),
    evidence: withEvidence
      ? (r.evidence_files ?? [])
          .filter((e) => Boolean(e?.data_url?.startsWith(UPLOAD_URL_PREFIX)))
          .slice(0, 3)
          .map((e) => ({ url: e.data_url!, name: e.name ?? "" }))
      : [],
  };
}

/** Tên tệp trong ZIP cho 1 bài: {STT}_{Tên}_{Trường}[_hậu tố].[ext] */
function zipFileName(stt: number, person: string, school: string, suffix: string, ext: string): string {
  const base = `${String(stt).padStart(3, "0")}_${safeFilePart(person, 60)}${school ? `_${safeFilePart(school, 60)}` : ""}${suffix}`;
  return `${base}${ext || ""}`;
}

// ── Dữ liệu theo kind ──

async function loadHs3tStories(campaignId: number, scope: AdminScope): Promise<StoryExportRow[]> {
  const selectSql = scope.all ? STORY_DETAIL_SELECT : STORY_DETAIL_SELECT.replace("s.submitter_email,", "");
  const params: unknown[] = [campaignId];
  const scopeSql = scopeClause(scope, params);
  return query<StoryExportRow>(`${selectSql} WHERE s.campaign_id = $1 AND ${scopeSql} ORDER BY s.id ASC`, params);
}

async function loadUnitStories(campaignId: number, scope: AdminScope): Promise<UnitExportRow[]> {
  const params: unknown[] = [campaignId];
  const scopeSql = scopeClause(scope, params);
  return query<UnitExportRow>(`${UNIT_STORY_SELECT} WHERE u.campaign_id = $1 AND ${scopeSql} ORDER BY u.id ASC`, params);
}

// ── Sinh Excel ──

function styledSheet(wb: ExcelJS.Workbook, name: string, columns: Partial<ExcelJS.Column>[]): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name);
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE7F5" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}

async function buildHs3tExcel(campaign: { title: string; code: string }, rows: StoryExportRow[], withPrivate: boolean): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cổng Thanh niên Trường học";

  const ws = styledSheet(wb, "BaiDuThi", [
    { header: "STT", key: "stt", width: 6 },
    { header: "Mã bài", key: "id", width: 9 },
    { header: "Họ tên học sinh", key: "student", width: 26 },
    { header: "Lớp", key: "className", width: 12 },
    { header: "Chức vụ", key: "position", width: 20 },
    { header: "Trường", key: "school", width: 42 },
    { header: "Tỉnh/Thành phố", key: "province", width: 20 },
    { header: "Danh hiệu", key: "honor", width: 18 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "Số phiếu", key: "votes", width: 10 },
    { header: "Cảm nhận", key: "quote", width: 40 },
    { header: "Câu chuyện", key: "story", width: 80 },
    { header: "Thành tích khác", key: "achievements", width: 50 },
    { header: "Lý do từ chối", key: "rejection", width: 30 },
    ...(withPrivate ? [{ header: "Gmail người gửi", key: "email", width: 30 }] : []),
    { header: "Ngày gửi", key: "createdAt", width: 18 },
    { header: "Ngày duyệt", key: "approvedAt", width: 18 },
    { header: "Ảnh chính (tệp trong ZIP ảnh)", key: "mainFile", width: 40 },
    { header: "Ảnh khác (trong ZIP ảnh)", key: "galleryFiles", width: 40 },
    ...(withPrivate ? [{ header: "Minh chứng (trong ZIP ảnh)", key: "evidenceFiles", width: 40 }] : []),
  ]);
  ws.getColumn("quote").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("story").alignment = { wrapText: true, vertical: "top" };

  rows.forEach((r, i) => {
    const files = storyFiles(r, withPrivate);
    const stt = i + 1;
    const person = r.student_name || "";
    const school = r.school_name || r.org_display_name || "";
    ws.addRow({
      stt,
      id: Number(r.id),
      student: r.student_name ?? "",
      className: r.class_name ?? "",
      position: r.student_position ?? "",
      school: r.school_name ?? r.org_display_name ?? "",
      province: r.province_name ?? "",
      honor: r.honor_level ? (HONOR_LABEL[r.honor_level] ?? r.honor_level) : "",
      status: STATUS_LABEL[r.status ?? ""] ?? r.status ?? "",
      votes: Number(r.vote_count),
      quote: clip(r.quote),
      story: clip(r.story),
      achievements: clip(r.achievements),
      rejection: clip(r.rejection_reason, 1000),
      ...(withPrivate ? { email: r.submitter_email ?? "" } : {}),
      createdAt: fmtDateTime(r.created_at),
      approvedAt: fmtDateTime(r.approved_at),
      mainFile: files.main ? zipFileName(stt, person, school, "", fileExt(files.main)) : "",
      galleryFiles: files.gallery.map((u, gi) => zipFileName(stt, person, school, `_anh${gi + 2}`, fileExt(u))).join("; "),
      ...(withPrivate ? { evidenceFiles: files.evidence.map((e, ei) => zipFileName(stt, person, school, `_minhchung${ei + 1}`, fileExt(e.url))).join("; ") } : {}),
    });
  });

  const hd = wb.addWorksheet("GhiChu");
  [
    `CHIẾN DỊCH: ${campaign.title} (mã ${campaign.code})`,
    `Xuất lúc: ${fmtDateTime(new Date())}`,
    "1. Cột 'STT' khớp với tiền tố tên tệp trong ZIP ảnh (vd. 001_NguyenVanA_THPT...webp).",
    "2. ZIP ảnh gồm: ảnh chính + ảnh gallery; minh chứng PDF và Gmail người gửi chỉ có ở bản xuất của Quản trị Trung ương.",
    "3. Bài gồm cả 3 trạng thái (chờ duyệt/đã công khai/từ chối) — lọc bằng cột 'Trạng thái' khi cần.",
  ].forEach((line, i) => {
    hd.getCell(`A${i + 1}`).value = line;
    if (i === 0) hd.getCell("A1").font = { bold: true, size: 12 };
  });
  hd.getColumn("A").width = 120;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildUnitExcel(campaign: { title: string; code: string }, rows: UnitExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cổng Thanh niên Trường học";

  const ws = styledSheet(wb, "BaiDuThi", [
    { header: "STT", key: "stt", width: 6 },
    { header: "Mã bài", key: "id", width: 9 },
    { header: "Tiêu đề", key: "title", width: 60 },
    { header: "Trường", key: "school", width: 42 },
    { header: "Tỉnh/Thành phố", key: "province", width: 20 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "Số phiếu", key: "votes", width: 10 },
    { header: "Mở đầu", key: "intro", width: 80 },
    { header: "Thành tích khác", key: "achievements", width: 50 },
    { header: "Lý do từ chối", key: "rejection", width: 30 },
    { header: "Ngày gửi", key: "createdAt", width: 18 },
    { header: "Ngày duyệt", key: "approvedAt", width: 18 },
    { header: "Ảnh chính (tệp trong ZIP ảnh)", key: "mainFile", width: 40 },
  ]);
  ws.getColumn("title").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("intro").alignment = { wrapText: true, vertical: "top" };

  rows.forEach((r, i) => {
    const stt = i + 1;
    const ext = r.photo_data_url ? fileExt(r.photo_data_url) : "";
    ws.addRow({
      stt,
      id: Number(r.id),
      title: clip(r.title),
      school: r.school_name ?? "",
      province: r.province_name ?? "",
      status: STATUS_LABEL[r.status ?? ""] ?? r.status ?? "",
      votes: Number(r.vote_count),
      intro: clip(r.intro),
      achievements: clip(r.achievements),
      rejection: clip(r.rejection_reason, 1000),
      createdAt: fmtDateTime(r.created_at),
      approvedAt: fmtDateTime(r.approved_at),
      mainFile: r.photo_data_url ? zipFileName(stt, r.title, r.school_name ?? "", "", ext) : "",
    });
  });

  const hd = wb.addWorksheet("GhiChu");
  [
    `CHIẾN DỊCH: ${campaign.title} (mã ${campaign.code})`,
    `Xuất lúc: ${fmtDateTime(new Date())}`,
    "1. Cột 'STT' khớp với tiền tố tên tệp trong ZIP ảnh.",
    "2. Bài gồm cả 3 trạng thái (chờ duyệt/đã công khai/từ chối) — lọc bằng cột 'Trạng thái' khi cần.",
  ].forEach((line, i) => {
    hd.getCell(`A${i + 1}`).value = line;
    if (i === 0) hd.getCell("A1").font = { bold: true, size: 12 };
  });
  hd.getColumn("A").width = 120;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Sinh danh sách tệp ZIP ──

function buildHs3tZipEntries(rows: StoryExportRow[], withEvidence: boolean): ZipEntry[] {
  const entries: ZipEntry[] = [];
  rows.forEach((r, i) => {
    const stt = i + 1;
    const person = r.student_name || "";
    const school = r.school_name || r.org_display_name || "";
    const files = storyFiles(r, withEvidence);
    const mainPath = uploadUrlToDisk(files.main);
    if (mainPath) {
      entries.push({ name: zipFileName(stt, person, school, "", fileExt(files.main!)), path: mainPath });
    }
    files.gallery.forEach((u, gi) => {
      const p = uploadUrlToDisk(u);
      if (p) entries.push({ name: zipFileName(stt, person, school, `_anh${gi + 2}`, fileExt(u)), path: p });
    });
    files.evidence.forEach((e, ei) => {
      const p = uploadUrlToDisk(e.url);
      if (p) entries.push({ name: zipFileName(stt, person, school, `_minhchung${ei + 1}`, fileExt(e.url)), path: p });
    });
  });
  return entries;
}

function buildUnitZipEntries(rows: UnitExportRow[]): ZipEntry[] {
  const entries: ZipEntry[] = [];
  rows.forEach((r, i) => {
    const p = uploadUrlToDisk(r.photo_data_url);
    if (p) {
      entries.push({
        name: zipFileName(i + 1, r.title, r.school_name ?? "", "", fileExt(r.photo_data_url!)),
        path: p,
      });
    }
  });
  return entries;
}

// ── Route ──

export async function GET(request: NextRequest) {
  const admin = await adminOf(request);
  if (!admin) return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN XEM" }, { status: 403 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "DOAN_TRUONG" ? "DOAN_TRUONG" : "HS3T";
  const part = url.searchParams.get("part") === "zip" ? "zip" : "excel";

  const campaign = await getActiveCampaign(kind);
  if (!campaign) return NextResponse.json({ ok: false, error: "NO_CAMPAIGN" }, { status: 404 });

  const { scope } = admin;
  const withPrivate = scope.all; // Gmail người gửi + minh chứng PDF — chỉ Quản trị TW

  if (kind === "DOAN_TRUONG") {
    const rows = await loadUnitStories(campaign.id, scope);
    if (part === "excel") {
      const buffer = await buildUnitExcel(campaign, rows);
      return new NextResponse(buffer as unknown as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="binh-chon-${campaign.code}.xlsx"`,
        },
      });
    }
    const stream = createZipStoreStream(buildUnitZipEntries(rows));
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="binh-chon-${campaign.code}-anh.zip"`,
      },
    });
  }

  const rows = await loadHs3tStories(campaign.id, scope);
  if (part === "excel") {
    const buffer = await buildHs3tExcel(campaign, rows, withPrivate);
    return new NextResponse(buffer as unknown as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="binh-chon-${campaign.code}.xlsx"`,
      },
    });
  }
  const stream = createZipStoreStream(buildHs3tZipEntries(rows, withPrivate));
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="binh-chon-${campaign.code}-anh.zip"`,
    },
  });
}
