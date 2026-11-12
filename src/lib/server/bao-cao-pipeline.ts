import type { ReportDraftContext } from "@/app/api/ai/nhap-bao-cao/route";
import {
  CHI_TIEU,
  DE_AN,
  DOT_PHA,
  EMPTY_SECTION_SENTENCE,
  MO_DAU_PREFIX,
  NV_GROUPS,
  NV_SUBS,
  PHUONG_HUONG_LABEL,
  periodKindOf,
} from "@/data/bao-cao-agent";

/* ══════════════════════════════════════════════════════════════════════
   PIPELINE AI BÁO CÁO — kiểm chứng kết quả AI bằng quy tắc deterministic
   theo đặc tả huấn luyện agent báo cáo Đoàn (nhiệm kỳ 2026 - 2031):

   • sanitizeClassified — ép lại trạng thái theo R1 (ngày ngoài kỳ) và
     R3 (thiếu ngày/chủ thể), kiểm tra mã mục/chỉ tiêu hợp lệ.
   • dedupeRecords — R4 trùng lặp gộp 01 bản ghi, giữ mọi nguồn.
   • aggregateSection2 — R10 chỉ cộng số liệu ket_qua theo chỉ tiêu/đột phá.
   • buildStage2UserMessage — dữ liệu đã kiểm chứng cho stage viết.
   • runSelfChecks — danh mục tự kiểm mục X trước khi xuất.
   Chỉ import ở route SERVER (phan-loai-bao-cao, nhap-bao-cao).
   ══════════════════════════════════════════════════════════════════════ */

export type RecordStatus = "DUA_VAO" | "NGOAI_KY" | "KHONG_PHAI_DOAN" | "CAN_XAC_MINH" | "PHUONG_HUONG";

export interface SoLieuEntry {
  chi_so: string;
  gia_tri: number;
  don_vi: string;
  loai: "ket_qua" | "muc_tieu" | "du_kien";
}

/** Bản ghi hoạt động sau phân loại — định dạng mục IX đặc tả + nhãn R1-R10 */
export interface ClassifiedRecord {
  id: string;
  ten: string;
  ngay?: string; // dd/mm/yyyy
  dia_diem?: string;
  chu_tri?: string;
  phoi_hop?: string;
  doi_tuong?: string[];
  mo_ta?: string;
  so_lieu?: SoLieuEntry[];
  nguon?: string[];
  trang_thai: RecordStatus;
  muc_chinh?: string;
  muc_phu?: string[];
  chi_tieu?: string[];
  dot_pha?: string[];
  de_an?: string[];
  ly_do?: string;
  /** R4: id các bản ghi trùng đã gộp vào bản ghi này */
  mergedFrom?: string[];
}

export interface Section2Row {
  code: string;
  kind: "CT" | "DP";
  title: string;
  /** Chuỗi số liệu ket_qua đã cộng: "1.234 lượt (HD02, HD06)" */
  ketQuaLines: string[];
  /** Bản ghi chỉ mới phát động — chưa có số liệu kết quả */
  pendingOnly: boolean;
  sourceIds: string[];
}

export interface Section2Aggregate {
  chiTieu: Section2Row[];
  dotPha: Section2Row[];
}

export interface SelfCheckItem {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface SelfCheckResult {
  pass: boolean;
  items: SelfCheckItem[];
}

const STATUS_SET = new Set<RecordStatus>(["DUA_VAO", "NGOAI_KY", "KHONG_PHAI_DOAN", "CAN_XAC_MINH", "PHUONG_HUONG"]);
const MUC_SET = new Set(NV_SUBS.map((s) => s.code));
const CT_SET = new Set(CHI_TIEU.map((c) => c.code));
const DP_SET = new Set(DOT_PHA.map((d) => d.code));
const DA_SET = new Set(DE_AN.map((d) => d.code));

const normKey = (s: string | undefined): string =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[“”"‘’]/g, "").trim();

/** Đổi "dd/mm/yyyy" | "yyyy-mm-dd" | "dd-mm-yyyy" (chuỗi có thể chứa khoảng "a - b") → Date */
export function parseVnDate(raw?: string): Date | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/) ?? raw.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // yyyy-mm-dd
  if (m[0].length >= 8 && Number(m[1]) > 31) return new Date(a, b - 1, c);
  return new Date(c, b - 1, a);
}

const fmtDmy = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const fmtVn = (n: number): string => (Number.isFinite(n) ? n.toLocaleString("vi-VN") : String(n));

/** So sánh ngày (bỏ giờ) */
function cmpDay(a: Date, b: Date): number {
  const av = a.getFullYear() * 10000 + (a.getMonth() + 1) * 100 + a.getDate();
  const bv = b.getFullYear() * 10000 + (b.getMonth() + 1) * 100 + b.getDate();
  return av === bv ? 0 : av < bv ? -1 : 1;
}

function coerceSoLieu(raw: unknown): SoLieuEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SoLieuEntry[] = [];
  for (const item of raw) {
    const r = (item ?? {}) as Record<string, unknown>;
    const chiSo = typeof r.chi_so === "string" ? r.chi_so.trim() : "";
    const giaTri = Number(r.gia_tri);
    const loai = r.loai === "muc_tieu" || r.loai === "du_kien" ? r.loai : r.loai === "ket_qua" ? "ket_qua" : null;
    if (chiSo && Number.isFinite(giaTri) && loai) {
      out.push({ chi_so: chiSo, gia_tri: giaTri, don_vi: typeof r.don_vi === "string" && r.don_vi.trim() ? r.don_vi.trim() : "", loai });
    }
  }
  return out;
}

const strArr = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

const filterCodes = (raw: string[], set: Set<string>): string[] => Array.from(new Set(raw.filter((c) => set.has(c))));

/**
 * Kiểm chứng kết quả phân loại của AI bằng quy tắc deterministic:
 * R1 (ngày diễn ra quyết định kỳ — đè trạng thái AI), R3 (thiếu ngày/chủ thể
 * → CAN_XAC_MINH), kiểm mã mục chính/phụ/chỉ tiêu hợp lệ.
 */
export function sanitizeClassified(raw: unknown[], ctx: ReportDraftContext): ClassifiedRecord[] {
  const kyStart = parseVnDate(ctx.periodStart);
  const kyEnd = parseVnDate(ctx.periodEnd);
  const out: ClassifiedRecord[] = [];

  for (const item of raw) {
    const r = (item ?? {}) as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : typeof r.id === "number" ? String(r.id) : "";
    if (!id) continue;

    let status = STATUS_SET.has(r.trang_thai as RecordStatus) ? (r.trang_thai as RecordStatus) : "CAN_XAC_MINH";
    const lyDoAi = typeof r.ly_do === "string" ? r.ly_do.trim() : "";
    let lyDo = lyDoAi;
    const ngay = typeof r.ngay === "string" && r.ngay.trim() ? r.ngay.trim() : undefined;
    const chuTri = typeof r.chu_tri === "string" && r.chu_tri.trim() ? r.chu_tri.trim() : undefined;
    let mucChinh = typeof r.muc_chinh === "string" && MUC_SET.has(r.muc_chinh.trim()) ? r.muc_chinh.trim() : undefined;
    const ten = typeof r.ten === "string" && r.ten.trim() ? r.ten.trim() : "(chưa có tên hoạt động)";

    // R1 — căn cứ NGÀY DIỄN RA, không phải ngày đăng bài
    const d = parseVnDate(ngay);
    if (d && kyStart && kyEnd) {
      if (cmpDay(d, kyStart) < 0) {
        status = "NGOAI_KY";
        lyDo = `Diễn ra ngày ${fmtDmy(d)}, trước kỳ báo cáo ${ctx.periodStart} — ngoài kỳ (R1).`;
        mucChinh = undefined;
      } else if (cmpDay(d, kyEnd) > 0) {
        status = "PHUONG_HUONG";
        lyDo = `Diễn ra ngày ${fmtDmy(d)}, sau kỳ báo cáo ${ctx.periodEnd} — đưa vào phương hướng kỳ tới (R1).`;
      } else if (status === "NGOAI_KY" || status === "PHUONG_HUONG") {
        // AI gán sai trong khi ngày nằm trong kỳ → tin ngày
        status = "DUA_VAO";
        lyDo = `Ngày diễn ra ${fmtDmy(d)} nằm trong kỳ báo cáo (R1) — đưa vào thân báo cáo.`;
      }
    } else if (!d && (!ngay || !parseVnDate(ngay))) {
      // R3 — thiếu ngày diễn ra (hoặc ngày không đọc được)
      if (status === "DUA_VAO") {
        status = "CAN_XAC_MINH";
        mucChinh = undefined;
        lyDo = "Thiếu ngày diễn ra — cần xác minh trước khi đưa vào kết quả (R3)." + (lyDo ? ` ${lyDo}` : "");
      }
    }

    // R3 — thiếu chủ thể
    if (status === "DUA_VAO" && !chuTri) {
      status = "CAN_XAC_MINH";
      mucChinh = undefined;
      lyDo = "Thiếu thông tin chủ thể tổ chức — cần xác minh (R3)." + (lyDo ? ` ${lyDo}` : "");
    }

    // Mục chính không hợp lệ → không thể viết tại đúng mục
    if (status === "DUA_VAO" && !mucChinh) {
      status = "CAN_XAC_MINH";
      lyDo = "Chưa xác định được mục chính hợp lệ trong bộ mã NV — cần xác minh." + (lyDo ? ` ${lyDo}` : "");
    }

    out.push({
      id,
      ten,
      ngay,
      dia_diem: typeof r.dia_diem === "string" && r.dia_diem.trim() ? r.dia_diem.trim() : undefined,
      chu_tri: chuTri,
      phoi_hop: typeof r.phoi_hop === "string" && r.phoi_hop.trim() ? r.phoi_hop.trim() : undefined,
      doi_tuong: strArr(r.doi_tuong),
      mo_ta: typeof r.mo_ta === "string" && r.mo_ta.trim() ? r.mo_ta.trim() : undefined,
      so_lieu: coerceSoLieu(r.so_lieu),
      nguon: strArr(r.nguon),
      trang_thai: status,
      muc_chinh: mucChinh,
      muc_phu: filterCodes(strArr(r.muc_phu), MUC_SET),
      chi_tieu: filterCodes(strArr(r.chi_tieu), CT_SET),
      dot_pha: filterCodes(strArr(r.dot_pha), DP_SET),
      de_an: filterCodes(strArr(r.de_an), DA_SET),
      ly_do: lyDo || undefined,
    });
  }

  return dedupeRecords(out);
}

/** R4 — trùng lặp: cùng tên chuẩn hóa + ngày + chủ trì → gộp 01 bản ghi, giữ mọi nguồn.
 *  Ưu tiên bản ghi của hệ thống (id số) làm bản ghi chính, không trung bình số liệu. */
function dedupeRecords(records: ClassifiedRecord[]): ClassifiedRecord[] {
  const byKey = new Map<string, ClassifiedRecord>();
  const out: ClassifiedRecord[] = [];
  const dbId = (r: ClassifiedRecord) => (Number.isFinite(Number(r.id)) ? 0 : 1); // hệ thống trước, EXT sau

  for (const rec of [...records].sort((a, b) => dbId(a) - dbId(b))) {
    if (rec.trang_thai !== "DUA_VAO") {
      out.push(rec);
      continue;
    }
    const key = `${normKey(rec.ten)}|${rec.ngay ?? ""}|${normKey(rec.chu_tri)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, rec);
      out.push(rec);
      continue;
    }
    existing.mergedFrom = [...(existing.mergedFrom ?? []), rec.id];
    existing.nguon = Array.from(new Set([...(existing.nguon ?? []), ...(rec.nguon ?? [])]));
    for (const sl of rec.so_lieu ?? []) {
      const dup = (existing.so_lieu ?? []).some((x) => x.chi_so === sl.chi_so && x.don_vi === sl.don_vi && x.loai === sl.loai);
      if (!dup) existing.so_lieu = [...(existing.so_lieu ?? []), sl];
    }
    existing.chi_tieu = Array.from(new Set([...(existing.chi_tieu ?? []), ...(rec.chi_tieu ?? [])]));
    existing.dot_pha = Array.from(new Set([...(existing.dot_pha ?? []), ...(rec.dot_pha ?? [])]));
    existing.de_an = Array.from(new Set([...(existing.de_an ?? []), ...(rec.de_an ?? [])]));
    existing.muc_phu = Array.from(new Set([...(existing.muc_phu ?? []), ...(rec.muc_phu ?? [])]));
  }
  return out;
}

/** R10 — cộng dồn số liệu ket_qua theo chỉ tiêu/đột phá cho phần II (không cộng mục tiêu) */
export function aggregateSection2(records: ClassifiedRecord[]): Section2Aggregate {
  interface Acc {
    chi_so: string;
    don_vi: string;
    tong: number;
    ids: string[];
  }
  const build = (kind: "CT" | "DP"): Section2Row[] => {
    const rows = new Map<string, Section2Row>();
    for (const rec of records) {
      if (rec.trang_thai !== "DUA_VAO") continue;
      const codes = kind === "CT" ? rec.chi_tieu ?? [] : rec.dot_pha ?? [];
      for (const code of codes) {
        let row = rows.get(code);
        if (!row) {
          const title = kind === "CT" ? CHI_TIEU.find((c) => c.code === code)?.text ?? code : DOT_PHA.find((d) => d.code === code)?.text ?? code;
          row = { code, kind, title, ketQuaLines: [], pendingOnly: true, sourceIds: [] };
          rows.set(code, row);
        }
        row.sourceIds.push(rec.id);
        const hasKetQua = (rec.so_lieu ?? []).some((s) => s.loai === "ket_qua" && s.gia_tri > 0);
        if (hasKetQua) row.pendingOnly = false;
      }
    }
    // Cộng chính xác: nhóm theo chi_so + đơn vị, cộng dồn rồi render 1 lần
    for (const row of rows.values()) {
      const accs = new Map<string, Acc>();
      for (const rec of records) {
        if (rec.trang_thai !== "DUA_VAO" || !(row.kind === "CT" ? rec.chi_tieu : rec.dot_pha)?.includes(row.code)) continue;
        for (const sl of rec.so_lieu ?? []) {
          if (sl.loai !== "ket_qua" || sl.gia_tri <= 0) continue;
          const key = `${normKey(sl.chi_so)}|${normKey(sl.don_vi)}`;
          const acc = accs.get(key);
          if (acc) {
            acc.tong += sl.gia_tri;
            acc.ids.push(rec.id);
          } else {
            accs.set(key, { chi_so: sl.chi_so, don_vi: sl.don_vi, tong: sl.gia_tri, ids: [rec.id] });
          }
        }
      }
      row.ketQuaLines = Array.from(accs.values()).map(
        (a) => `${a.chi_so}${a.don_vi ? ` (${a.don_vi})` : ""}: ${fmtVn(a.tong)} (${a.ids.join(", ")})`
      );
    }
    return Array.from(rows.values());
  };
  return { chiTieu: build("CT"), dotPha: build("DP") };
}

/** Dựng user message cho stage 2 (viết báo cáo) từ bản ghi ĐÃ kiểm chứng */
export function buildStage2UserMessage(
  ctx: ReportDraftContext,
  records: ClassifiedRecord[],
  agg: Section2Aggregate,
  docContext?: string
): string {
  const kind = periodKindOf(ctx.periodKind ?? "");
  const duaVao = records.filter((r) => r.trang_thai === "DUA_VAO");
  const phuongHuong = records.filter((r) => r.trang_thai === "PHUONG_HUONG");
  const canXacMinh = records.filter((r) => r.trang_thai === "CAN_XAC_MINH");
  const biLoai = records.filter((r) => r.trang_thai === "NGOAI_KY" || r.trang_thai === "KHONG_PHAI_DOAN");

  const recordLine = (r: ClassifiedRecord): string => {
    const parts = [
      `[${r.id}] ${r.ten}`,
      r.ngay ? `ngày ${r.ngay}` : "",
      r.chu_tri ? `chủ trì: ${r.chu_tri}` : "",
      r.phoi_hop ? `phối hợp: ${r.phoi_hop}` : "",
      r.dia_diem ? `địa điểm: ${r.dia_diem}` : "",
      r.muc_chinh ? `mục chính ${r.muc_chinh}` : "",
      r.muc_phu?.length ? `mục phụ ${r.muc_phu.join(", ")}` : "",
      [...(r.chi_tieu ?? []), ...(r.dot_pha ?? []), ...(r.de_an ?? [])].length
        ? `gắn ${[...(r.chi_tieu ?? []), ...(r.dot_pha ?? []), ...(r.de_an ?? [])].join(", ")}`
        : "",
    ].filter(Boolean);
    const sl = (r.so_lieu ?? [])
      .map((s) => `${s.chi_so} = ${fmtVn(s.gia_tri)} ${s.don_vi} (${s.loai})`)
      .join("; ");
    return `- ${parts.join("; ")}${r.mo_ta ? ` — ${r.mo_ta}` : ""}${sl ? `. Số liệu: ${sl}` : ""}${r.mergedFrom?.length ? `. Gộp từ ${r.mergedFrom.join(", ")} (R4)` : ""}`;
  };

  const section2Hint = [
    ...(agg.chiTieu.length
      ? ["Chỉ tiêu có hoạt động đóng góp trực tiếp trong kỳ:"]
      : []),
    ...agg.chiTieu.map(
      (row) =>
        `- ${row.code} — ${row.title}: ${row.ketQuaLines.length ? row.ketQuaLines.join("; ") : "chưa có số liệu kết quả (mới phát động)"}`
    ),
    ...(agg.dotPha.length ? ["Nhiệm vụ đột phá có hoạt động liên quan trực tiếp:"] : []),
    ...agg.dotPha.map((row) => `- ${row.code} — ${row.title}: bản ghi ${row.sourceIds.join(", ")}`),
  ].join("\n");

  return [
    `[KỲ BÁO CÁO] ${ctx.period}${ctx.periodStart ? ` (từ ngày ${ctx.periodStart} đến ngày ${ctx.periodEnd})` : ""}`,
    `[NHÃN PHẦN IV] "${PHUONG_HUONG_LABEL[kind]}"${ctx.periodEnd ? ` — kỳ tới tính từ ngày sau ${ctx.periodEnd}` : ""}`,
    `[CẤP BÁO CÁO] ${ctx.cap ?? "truong"} — Đơn vị: ${ctx.orgUnitName}`,
    `[SỐ LIỆU HỆ THỐNG] ${ctx.activityCount} hoạt động đã nhập · ${ctx.participantCount.toLocaleString("vi-VN")} lượt tham gia · ${ctx.postCount} tin bài xuất bản`,
    ctx.taskLines.length ? `[NHIỆM VỤ THI ĐUA] ${ctx.taskLines.join("; ")}` : "",
    "",
    "[KẾT QUẢ PHÂN LOẠI ĐÃ KIỂM CHỨNG THEO R1-R10 — dùng đúng như dưới đây, KHÔNG tự thay đổi trạng thái]",
    `PHẦN I — viết các bản ghi DUA_VAO (${duaVao.length}):`,
    ...duaVao.map(recordLine),
    "",
    phuongHuong.length
      ? ["PHẦN IV — hoạt động PHUONG_HUONG (phương hướng kỳ tới):", ...phuongHuong.map(recordLine), ""].join("\n")
      : "",
    canXacMinh.length
      ? ["PHẦN IV + PHỤ LỤC — bản ghi CAN_XAC_MINH (nêu việc cần xác minh, KHÔNG viết vào phần I):", ...canXacMinh.map(recordLine), ""].join("\n")
      : "",
    biLoai.length
      ? ["CHỈ PHỤ LỤC II — bản ghi bị loại (KHÔNG xuất hiện trong phần I):", ...biLoai.map((r) => `- [${r.id}] ${r.ten}${r.ngay ? ` (ngày ${r.ngay})` : ""} — ${r.trang_thai}${r.ly_do ? `: ${r.ly_do}` : ""}`), ""].join("\n")
      : "",
    `[SỐ LIỆU TỔNG HỢP PHẦN II — chỉ ghi số loai ket_qua vào cột kết quả; số muc_tieu/du_kien phải viết kèm từ "mục tiêu"/"dự kiến"]\n${section2Hint || "(không có chỉ tiêu, nhiệm vụ đột phá nào có hoạt động đóng góp trực tiếp — phần II ghi danh mục trống hoặc liệt kê hạn chế)"}`,
    "",
    ctx.suggestions?.length ? `[ĐỀ XUẤT, KIẾN NGHỊ CỦA ĐƠN VỊ — viết phần V]\n- ${ctx.suggestions.join("\n- ")}` : "",
    docContext ? `[TÀI LIỆU THAM KHẢO]\n${docContext}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
}

/** Bước 8 — tự kiểm trước khi xuất (mục X đặc tả) */
export function runSelfChecks(
  draft: string,
  ctx: ReportDraftContext,
  records: ClassifiedRecord[],
  hasSuggestions: boolean
): SelfCheckResult {
  const text = draft.trim();
  const kind = periodKindOf(ctx.periodKind ?? "");
  const duaVao = records.filter((r) => r.trang_thai === "DUA_VAO");
  const biLoai = records.filter((r) => r.trang_thai === "NGOAI_KY" || r.trang_thai === "KHONG_PHAI_DOAN");

  const part1 = (() => {
    const m = text.match(/I\.\s*KẾT QUẢ THỰC HIỆN[\s\S]*?(?=\nII\.\s*KẾT QUẢ)/);
    return m ? m[0] : "";
  })();

  const tenKey = (r: ClassifiedRecord): string => normKey(r.ten).slice(0, 24);

  const items: SelfCheckItem[] = [
    {
      name: "Câu mở đầu đúng mẫu đặc tả",
      pass: text.includes(MO_DAU_PREFIX.slice(0, 60)),
      detail: MO_DAU_PREFIX.slice(0, 60) + "…",
    },
    {
      name: "Đủ 06 mục lớn ở phần I (đúng thứ tự)",
      pass: NV_GROUPS.every((g) => text.includes(`${g.num}. ${g.title}`)),
      detail: NV_GROUPS.map((g) => `${g.num}`).join(","),
    },
    {
      name: "Có phần II gắn chỉ tiêu, nhiệm vụ đột phá",
      pass: /II\.\s*KẾT QUẢ GẮN VỚI CHỈ TIÊU/.test(text),
    },
    {
      name: "Phần III có Ưu điểm và Hạn chế",
      pass: /III\.\s*ĐÁNH GIÁ CHUNG/.test(text) && /Ưu điểm/.test(text) && /Hạn chế/.test(text),
    },
    {
      name: `Phần IV dùng đúng nhãn kỳ (${PHUONG_HUONG_LABEL[kind]})`,
      pass: text.includes(PHUONG_HUONG_LABEL[kind]),
    },
    {
      name: "Kỳ báo cáo ghi ở tên báo cáo",
      pass: !ctx.periodStart || text.includes(ctx.periodStart),
    },
    {
      name: "Có phụ lục danh mục phân loại",
      pass: /PHỤ LỤC/.test(text),
    },
    {
      name: hasSuggestions ? "Có phần V đề xuất, kiến nghị" : "Không có phần V khi đầu vào không có đề xuất",
      pass: hasSuggestions ? /V\.\s*ĐỀ XUẤT/.test(text) : !/V\.\s*ĐỀ XUẤT/.test(text),
    },
    {
      name: "Mọi bản ghi DUA_VAO xuất hiện ít nhất một lần",
      pass: duaVao.every((r) => text.toLowerCase().includes(tenKey(r))),
      detail: duaVao.filter((r) => !text.toLowerCase().includes(tenKey(r))).map((r) => r.id).join(", ") || undefined,
    },
    {
      name: "Bản ghi ngoài kỳ / không phải Đoàn không xuất hiện ở phần I",
      pass: biLoai.every((r) => !part1.toLowerCase().includes(tenKey(r))),
      detail: biLoai.filter((r) => part1.toLowerCase().includes(tenKey(r))).map((r) => r.id).join(", ") || undefined,
    },
  ];
  return { pass: items.every((i) => i.pass), items };
}

/** Câu nhắc sửa khi tự kiểm phát hiện lỗi — dùng cho 1 lượt sửa bản nháp */
export function buildRepairInstruction(failed: SelfCheckItem[]): string {
  return [
    "Sửa bản nháp để đạt đủ các yêu cầu tự kiểm sau (giữ nguyên mọi số liệu và nội dung đúng, chỉ bổ sung/sửa đúng chỗ thiếu):",
    ...failed.map((f) => `- ${f.name}${f.detail ? ` (chi tiết: ${f.detail})` : ""}`),
    `- Mục lớn không có hoạt động phải ghi đúng câu: "${EMPTY_SECTION_SENTENCE}"`,
  ].join("\n");
}
