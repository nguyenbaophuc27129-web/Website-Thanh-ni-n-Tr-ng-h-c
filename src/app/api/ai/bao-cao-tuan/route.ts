import { NextResponse } from "next/server";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";
import { callAI } from "@/lib/ai-client";
import { dbEnabled, query } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { buildPhanLoaiSystemPrompt, CHI_TIEU, DOT_PHA, PHAN_LOAI_SCHEMA } from "@/data/bao-cao-agent";
import { sanitizeClassified, type ClassifiedRecord } from "@/lib/server/bao-cao-pipeline";
import type { ReportActivityRecord, ReportDraftContext } from "@/app/api/ai/nhap-bao-cao/route";
import {
  donViTuToChuc,
  normalizeHoTen,
  NHAN_XU_LY,
  soanBaoCaoTuan,
  tenGoiToChuc,
  thongTinKy,
  vanBanThanhVanBanThuan,
  type BaoCaoTuanInput,
  type ChiTieu,
  type HoatDong,
  type ToChucDoan,
  type XuLyHoatDong,
} from "@/data/the-thuc-van-ban";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   BÁO CÁO TUẦN / KỲ THEO THỂ THỨC 29-HD — TỪ HOẠT ĐỘNG CỦA CẤP ĐANG ĐĂNG NHẬP
   Body: { orgUnitId?, tuNgay, denNgay (YYYY-MM-DD), gomCapDuoi?, classified?, canCuMoDau?, so?, ngayKy?, nguoiKy? }
   Dùng ở bước 2 hộp "Tạo báo cáo bằng AI" (/quan-tri/bao-cao): classified = kết quả bước 1
   (/api/ai/phan-loai-bao-cao) người dùng đã duyệt → không phân loại lại; bản ghi EXT (nguồn dán tay)
   được đưa vào như hoạt động.
   1. Lấy hoạt động của đơn vị (và đơn vị cấp dưới nếu gomCapDuoi) từ bảng activities,
      trong kỳ + kỳ tới (để đưa vào phương hướng).
   2. Phân loại R1-R10: lấy từ `classified` nếu có, không có thì AI phân loại (cùng prompt/schema
      với /api/ai/phan-loai-bao-cao); luôn kiểm chứng lại bằng sanitizeClassified.
   3. soanBaoCaoTuan: code dựng khung + đánh số + phụ lục; AI chỉ biên tập lời văn,
      đoạn sai nguồn được thay bằng nguyên văn dữ kiện.
   ════════════════════════════════════════════════════════════════════ */

interface Body {
  orgUnitId?: number;
  tuNgay?: string;
  denNgay?: string;
  gomCapDuoi?: boolean;
  /** Kết quả phân loại bước 1 (đã duyệt) — có thì không gọi AI phân loại lại */
  classified?: unknown[];
  canCuMoDau?: string;
  so?: string;
  ngayKy?: string;
  nguoiKy?: string;
}

const CAN_CU_MAC_DINH = "Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII, nhiệm kỳ 2026 - 2031";
const TIEU_DE_MUC_II = "KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031";
/** Trần số hoạt động mỗi lần soạn — giữ prompt phân loại trong giới hạn */
const MAX_HOAT_DONG = 80;
/** Kỳ báo cáo dài nhất cho phép (ngày) */
const MAX_SO_NGAY = 92;
/** Trần dung lượng kết quả phân loại gửi lên — cùng mức với /api/ai/nhap-bao-cao */
const MAX_CLASSIFIED_CHARS = 100_000;

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoSangVn = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const vnSangIso = (s: string) => {
  const [d, m, y] = s.split("/");
  return `${y}-${m}-${d}`;
};
const motDong = (s: string) => s.replace(/\s+/g, " ").trim();
const ketCau = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

const XU_LY_THEO_TRANG_THAI: Record<ClassifiedRecord["trang_thai"], XuLyHoatDong> = {
  DUA_VAO: "DUA_VAO",
  NGOAI_KY: "LOAI_NGOAI_KY",
  KHONG_PHAI_DOAN: "LOAI_KHONG_PHAI_DOAN",
  CAN_XAC_MINH: "XAC_MINH",
  PHUONG_HUONG: "KY_TOI",
};

type OrgRow = {
  id: string;
  name: string;
  short_name: string | null;
  org_level: number;
  org_block: string | null;
  path: string;
};

type ActRow = {
  id: string;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  participant_count: number | null;
  unit_name: string;
  unit_short: string | null;
  unit_level: number;
  unit_block: string | null;
};

const toChucCua = (r: { id?: string; name: string; short_name?: string | null; org_level: number; org_block?: string | null }): ToChucDoan => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name ?? null,
  orgLevel: Number(r.org_level),
  orgBlock: r.org_block ?? null,
});

function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI trả về JSON không hợp lệ");
  }
}

export async function POST(request: Request) {
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-bao-cao-tuan",
    windowMs: 10 * 60_000,
    perAccount: 10,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!session) return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "Chức năng cần kết nối cơ sở dữ liệu." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const tuIso = body?.tuNgay ?? "";
  const denIso = body?.denNgay ?? "";
  if (!RE_ISO.test(tuIso) || !RE_ISO.test(denIso)) {
    return NextResponse.json({ ok: false, error: "Chọn ngày bắt đầu và ngày kết thúc kỳ báo cáo." }, { status: 400 });
  }
  const tuNgay = isoSangVn(tuIso);
  const denNgay = isoSangVn(denIso);
  let ky;
  try {
    ky = thongTinKy(tuNgay, denNgay);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Kỳ báo cáo không hợp lệ." }, { status: 400 });
  }
  if (ky.soNgay > MAX_SO_NGAY) {
    return NextResponse.json({ ok: false, error: `Kỳ báo cáo tối đa ${MAX_SO_NGAY} ngày.` }, { status: 400 });
  }
  if (body?.ngayKy && !RE_ISO.test(body.ngayKy)) {
    return NextResponse.json({ ok: false, error: "Ngày ký không hợp lệ." }, { status: 400 });
  }

  // ── Đơn vị & phạm vi: QUAN_TRI_TW mọi đơn vị; cán bộ khác chỉ đơn vị mình và cấp dưới ──
  const targetId = Number(body?.orgUnitId ?? session.orgUnitId);
  let target: OrgRow | undefined;
  let capTren: ToChucDoan[] = [];
  try {
    target = (
      await query<OrgRow>(
        "SELECT id, name, short_name, org_level, org_block, path FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
        [targetId],
      )
    )[0];
    if (!target) return NextResponse.json({ ok: false, error: "Không tìm thấy đơn vị." }, { status: 404 });
    if (session.role !== "QUAN_TRI_TW") {
      const own = (await query<{ path: string }>("SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1", [session.orgUnitId]))[0];
      if (!own || !target.path.startsWith(own.path)) {
        return NextResponse.json({ ok: false, error: "Bạn chỉ được lập báo cáo của đơn vị mình và các đơn vị cấp dưới." }, { status: 403 });
      }
    }
    // Chuỗi cấp trên (gần nhất trước) — dựng dòng tên cơ quan cấp trên, địa danh, nơi nhận
    const idCapTren = target.path.split("/").filter(Boolean).map(Number).filter((x) => x && x !== targetId);
    if (idCapTren.length) {
      const rows = await query<OrgRow & { depth: number }>(
        "SELECT id, name, short_name, org_level, org_block, path, depth FROM org_units WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL",
        [idCapTren],
      );
      capTren = rows.sort((a, b) => Number(b.depth) - Number(a.depth)).map(toChucCua);
    }
  } catch (err) {
    console.warn("[TNTH][bao-cao-tuan] Lỗi đọc đơn vị:", err);
    return NextResponse.json({ ok: false, error: "Không đọc được thông tin đơn vị. Vui lòng thử lại." }, { status: 503 });
  }

  // ── Hoạt động trong kỳ + kỳ tới (bỏ hoạt động đã xóa, còn nháp, bị từ chối xác nhận) ──
  const gomCapDuoi = body?.gomCapDuoi !== false;
  let acts: ActRow[];
  try {
    acts = await query<ActRow>(
      `SELECT a.id, a.title, a.summary, a.start_date::text AS start_date, a.end_date::text AS end_date,
              a.location, a.participant_count,
              u.name AS unit_name, u.short_name AS unit_short, u.org_level AS unit_level, u.org_block AS unit_block
         FROM activities a
         JOIN org_units u ON u.id = a.org_unit_id
        WHERE a.deleted_at IS NULL
          AND a.confirm_status <> 'REJECTED'
          AND a.status <> 'DRAFT'
          AND a.start_date >= $2::date AND a.start_date <= $3::date
          AND (a.org_unit_id = $1 OR ($4::boolean AND u.path LIKE $5 || '%'))
        ORDER BY a.start_date ASC, a.id ASC
        LIMIT ${MAX_HOAT_DONG + 1}`,
      [targetId, tuIso, vnSangIso(ky.kyToi.den), gomCapDuoi, target.path],
    );
  } catch (err) {
    console.warn("[TNTH][bao-cao-tuan] Lỗi đọc hoạt động:", err);
    return NextResponse.json({ ok: false, error: "Không đọc được danh sách hoạt động. Vui lòng thử lại." }, { status: 503 });
  }
  const canhBaoHeThong: string[] = [];
  if (acts.length > MAX_HOAT_DONG) {
    acts = acts.slice(0, MAX_HOAT_DONG);
    canhBaoHeThong.push(`Kỳ có hơn ${MAX_HOAT_DONG} hoạt động — chỉ ${MAX_HOAT_DONG} hoạt động đầu tiên được đưa vào. Hãy chia nhỏ kỳ báo cáo.`);
  }

  const ten = (a: ActRow) => tenGoiToChuc({ name: a.unit_name, shortName: a.unit_short, orgLevel: Number(a.unit_level), orgBlock: a.unit_block });
  const models: string[] = [];

  // ── Bước 1: phân loại R1-R10 (mục NV, chỉ tiêu, đột phá) ──
  const banGhi: ReportActivityRecord[] = acts.map((a) => ({
    id: String(a.id),
    ten: a.title,
    ngay: isoSangVn(a.start_date),
    dia_diem: a.location || undefined,
    chu_tri: ten(a),
    mo_ta: motDong(a.summary || a.title).slice(0, 600),
    so_lieu: a.participant_count
      ? [{ chi_so: "Lượt đoàn viên, thanh niên tham gia", gia_tri: Number(a.participant_count), don_vi: "lượt", loai: "ket_qua" as const }]
      : [],
    nguon: [`Bản ghi hoạt động trên hệ thống TNTH (mã #${a.id})`],
  }));
  const ctx: ReportDraftContext = {
    orgUnitName: target.name,
    cap: ["tw", "tinh", "xa"][Number(target.org_level) - 1] ?? "truong",
    period: ky.text,
    periodStart: tuNgay,
    periodEnd: denNgay,
    activityCount: acts.length,
    participantCount: acts.reduce((s, a) => s + Number(a.participant_count ?? 0), 0),
    taskLines: [],
    postCount: 0,
    activities: banGhi,
  };

  let records: ClassifiedRecord[] = [];
  const daPhanLoai = Array.isArray(body?.classified) && body.classified.length > 0;
  if (daPhanLoai) {
    if (JSON.stringify(body!.classified).length > MAX_CLASSIFIED_CHARS) {
      return NextResponse.json({ ok: false, error: "Dữ liệu phân loại quá lớn để soạn báo cáo." }, { status: 413 });
    }
    // Kết quả bước 1 do người dùng duyệt — vẫn kiểm chứng lại ngày/mã bằng quy tắc cứng
    records = sanitizeClassified(body!.classified!, ctx);
    const coTrongDb = new Set(acts.map((a) => String(a.id)));
    const boQua = records.filter((r) => !/^EXT/i.test(r.id) && !coTrongDb.has(r.id));
    if (boQua.length) {
      canhBaoHeThong.push(
        `${boQua.length} bản ghi đã phân loại không được đưa vào vì hoạt động còn nháp, đã xoá, bị từ chối xác nhận hoặc không thuộc đơn vị: ${boQua.map((r) => r.ten).join("; ")}.`,
      );
    }
  } else if (acts.length) {
    try {
      const { text, model } = await callAI({
        system: buildPhanLoaiSystemPrompt(),
        user: [
          `[KỲ BÁO CÁO] từ ngày ${tuNgay} đến ngày ${denNgay} (${ky.text})`,
          `[ĐƠN VỊ BÁO CÁO] ${target.name} (cấp ${ctx.cap})`,
          `[DANH SÁCH BẢN GHI HOẠT ĐỘNG ĐẦU VÀO — phân loại từng bản ghi, giữ nguyên id]`,
          JSON.stringify(banGhi),
        ].join("\n"),
        json: true,
        jsonSchema: PHAN_LOAI_SCHEMA,
        maxTokens: 8000,
        temperature: 0.1,
      });
      models.push(model);
      const parsed = parseJsonLoose(text) as { ban_ghi?: unknown[] } | unknown[];
      const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ban_ghi) ? parsed.ban_ghi : [];
      if (raw.length === 0) throw new Error("AI không trả về bản ghi nào");
      records = sanitizeClassified(raw, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI_FAILED";
      console.warn("[TNTH][AI] Phân loại hoạt động cho báo cáo tuần thất bại:", message);
      return NextResponse.json({ ok: false, error: `Không phân loại được hoạt động bằng AI: ${message}` }, { status: 502 });
    }
  }

  // ── Bước 2: bản ghi hệ thống → HoatDong (dữ kiện lấy từ DB, AI chỉ quyết định phân loại) ──
  const theoId = new Map(records.map((r) => [r.id, r]));
  const maCua = new Map<string, string>();
  const hoatDong: HoatDong[] = acts.map((a, i) => {
    const ma = `HD${String(i + 1).padStart(2, "0")}`;
    const id = String(a.id);
    maCua.set(id, ma);
    const ngay = isoSangVn(a.start_date);
    const denHd = a.end_date && a.end_date.slice(0, 10) !== a.start_date.slice(0, 10) ? isoSangVn(a.end_date) : null;
    const donVi = ten(a);
    const cau =
      `${denHd ? `Từ ngày ${ngay} đến ngày ${denHd}` : `Ngày ${ngay}`}, ${donVi} tổ chức hoạt động “${motDong(a.title)}”` +
      `${a.location ? ` tại ${motDong(a.location)}` : ""}` +
      `${a.participant_count ? ` với ${a.participant_count} lượt đoàn viên, thanh niên tham gia` : ""}.`;
    const tomTat = a.summary ? motDong(a.summary) : "";
    const duKien = tomTat ? `${cau} ${ketCau(tomTat)}` : cau;

    const rec = theoId.get(id);
    const gop = rec ? undefined : records.find((r) => r.mergedFrom?.includes(id));
    let xuLy: XuLyHoatDong = rec ? XU_LY_THEO_TRANG_THAI[rec.trang_thai] : "XAC_MINH";
    if (!rec && gop) canhBaoHeThong.push(`${ma} (${a.title}) trùng nội dung với bản ghi #${gop.id} — chuyển "Cần xác minh" để tránh viết lặp.`);
    else if (!rec) canhBaoHeThong.push(`${ma} (${a.title}): AI không trả kết quả phân loại — chuyển "Cần xác minh".`);
    // Hoạt động ở kỳ tới luôn vào phương hướng, kể cả khi AI chưa gán mục
    if (xuLy === "XAC_MINH" && ngay && vnSangIso(ngay) > denIso) xuLy = "KY_TOI";

    return {
      ma,
      ten: motDong(a.title),
      ngay,
      duKien,
      doanDuPhong: duKien,
      mucChinh: rec?.muc_chinh ?? null,
      mucPhu: rec?.muc_phu ?? [],
      xuLy,
      nguon: [{ ten: motDong(a.title), coQuan: donVi, ngay, url: `${SITE_URL}/quan-tri/hoat-dong/${id}` }],
    };
  });

  // Nguồn dán tay (EXT1, EXT2… do bước 1 trích xuất) — dữ kiện lấy từ bản ghi đã trích
  records
    .filter((r) => /^EXT/i.test(r.id))
    .forEach((r) => {
      const ma = `HD${String(hoatDong.length + 1).padStart(2, "0")}`;
      maCua.set(r.id, ma);
      const ngay = r.ngay && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r.ngay) ? r.ngay : null;
      const soLieu = (r.so_lieu ?? []).map((x) => `${x.chi_so}: ${x.gia_tri} ${x.don_vi}`).join("; ");
      const cau =
        `${ngay ? `Ngày ${ngay}, ` : ""}${r.chu_tri ? `${r.chu_tri} ` : ""}tổ chức hoạt động “${motDong(r.ten)}”` +
        `${r.dia_diem ? ` tại ${motDong(r.dia_diem)}` : ""}.`;
      const duKien = [cau, r.mo_ta ? ketCau(motDong(r.mo_ta)) : "", soLieu ? ketCau(soLieu) : ""].filter(Boolean).join(" ");
      let xuLy: XuLyHoatDong = XU_LY_THEO_TRANG_THAI[r.trang_thai];
      if (xuLy === "XAC_MINH" && ngay && vnSangIso(ngay) > denIso) xuLy = "KY_TOI";
      const nguonGoc = (r.nguon ?? []).map(motDong).filter(Boolean);
      const url = nguonGoc.map((x) => x.match(/https?:\/\/\S+/)?.[0]).find(Boolean);
      const coQuan = nguonGoc.find((x) => !/^https?:\/\//.test(x))?.replace(/https?:\/\/\S+/, "").trim() || "Nguồn dán tay";
      hoatDong.push({
        ma,
        ten: motDong(r.ten),
        ngay,
        duKien,
        doanDuPhong: duKien,
        mucChinh: r.muc_chinh ?? null,
        mucPhu: r.muc_phu ?? [],
        xuLy,
        nguon: [{ ten: motDong(r.ten), coQuan: coQuan.slice(0, 120), ngay: ngay ?? "", url: url ?? `(${r.id} — không có đường dẫn)` }],
      });
    });

  // Chỉ tiêu / đột phá gắn với hoạt động được đưa vào
  const lienQuan = new Map<string, string[]>();
  records
    .filter((r) => r.trang_thai === "DUA_VAO" && maCua.has(r.id))
    .forEach((r) =>
      [...(r.chi_tieu ?? []), ...(r.dot_pha ?? [])].forEach((c) => lienQuan.set(c, [...(lienQuan.get(c) ?? []), maCua.get(r.id)!])),
    );
  const chiTieu: ChiTieu[] = [
    ...CHI_TIEU.map((c) => ({ ma: c.code, ten: `Chỉ tiêu ${c.code.slice(2)} - ${c.text}` })),
    ...DOT_PHA.map((c) => ({ ma: c.code, ten: `Nhiệm vụ đột phá ${c.code.slice(2)} - ${c.text}` })),
  ]
    .filter((c) => lienQuan.has(c.ma))
    .map((c) => ({ ...c, lienQuan: lienQuan.get(c.ma) }));

  // ── Bước 3: hồ sơ đơn vị ban hành + soạn ──
  const { donVi, canhBao: canhBaoDonVi } = donViTuToChuc(toChucCua(target), capTren);
  const nguoiKy = body?.nguoiKy?.trim();
  if (nguoiKy) donVi.nguoiKyMacDinh = normalizeHoTen(nguoiKy.slice(0, 80));

  const input: BaoCaoTuanInput = {
    donVi,
    tuNgay,
    denNgay,
    ngayKy: body?.ngayKy ? isoSangVn(body.ngayKy) : null,
    so: body?.so?.trim().replace(/\D/g, "").slice(0, 6) || null,
    canCuMoDau: motDong(body?.canCuMoDau || CAN_CU_MAC_DINH).replace(/[.,;]+$/, "").slice(0, 400),
    hoatDong,
    chiTieu,
    tieuDeMucII: TIEU_DE_MUC_II,
  };

  try {
    const kq = await soanBaoCaoTuan(input, async (system, user) => {
      const { text, model } = await callAI({ system, user, json: true, maxTokens: 8000, temperature: 0.2 });
      models.push(model);
      return text;
    });
    const pl = kq.phanLoai;
    return NextResponse.json({
      ok: true,
      vanBan: kq.vanBan,
      vanBanThuan: vanBanThanhVanBanThuan(kq.vanBan),
      kyText: ky.text,
      model: [...new Set(models)].join(", ") || "Không dùng AI",
      kiemTra: { ...kq.kiemTra, canhBao: [...canhBaoDonVi, ...canhBaoHeThong, ...kq.kiemTra.canhBao] },
      thongKe: {
        tongHoatDong: hoatDong.length,
        duaVao: pl.duaVao.length,
        kyToi: pl.khac.filter((h) => h.xuLy === "KY_TOI").length,
        xacMinh: pl.khac.filter((h) => h.xuLy === "XAC_MINH").length,
        loai: pl.khac.filter((h) => h.xuLy === "LOAI_NGOAI_KY" || h.xuLy === "LOAI_KHONG_PHAI_DOAN").length,
      },
      khac: pl.khac.map((h) => ({ ma: h.ma, ten: h.ten, ngay: h.ngay ?? "", xuLy: NHAN_XU_LY[h.xuLy as Exclude<XuLyHoatDong, "DUA_VAO">] })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Soạn báo cáo tuần thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
