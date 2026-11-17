import {
  formatDiaDiemNgayThang,
  normalizeNoiNhanList,
  normalizeVanBanNgayThang,
  normalizeVanBanSoKyHieu,
  vanBanLoaiList,
  type DonViBanHanh,
  type NoiDungBlock,
  type VanBanStructuredOutput,
} from "@/data/the-thuc-van-ban";
/**
 * Xuất văn bản Word (.doc) đúng thể thức văn bản hành chính:
 * quốc hiệu - tiêu ngữ, tên cơ quan, số/ký hiệu, căn cứ, nội dung, nơi nhận, chữ ký.
 * Cách tiếp cận: HTML với header MS Word, tải về .doc mở trực tiếp bằng Word/LibreOffice.
 */
import type { useStore } from "@/lib/store-context";
import { stripHtmlTags } from "@/lib/ai-text";

type StoreApi = ReturnType<typeof useStore>;

export interface WordTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface WordDocData {
  docCode: string; // "125/BC-ĐTN"
  orgUnitName: string; // "ĐOÀN PHƯỜNG HIỆP THÀNH"
  orgUnitAddress?: string;
  title: string; // "BÁO CÁO ..." (viết hoa)
  greeting?: string; // "Kính gửi: ..."
  bases: string[]; // trích căn cứ
  sections: { heading: string; paragraphs?: string[]; tables?: WordTable[] }[];
  place: string; // "Thủ Dầu Một"
  dateStr: string; // "ngày 27 tháng 9 năm 2026"
  signerPosition: string; // "BÍ THƯ"
  signerOrgShort?: string; // "ĐOÀN PHƯỜNG" (dòng TM. BAN... nếu cấp có Ban Thường vụ)
  signerName: string;
  recipients: string[]; // nơi nhận
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function tableHtml(t: WordTable): string {
  const head = t.headers.map((h) => `<th style="border:1pt solid #000;padding:4pt 6pt;background:#eeeeee;font-weight:bold;">${esc(h)}</th>`).join("");
  const body = t.rows
    .map(
      (row, i) =>
        `<tr>${row
          .map((c, ci) => `<td style="border:1pt solid #000;padding:4pt 6pt;${ci === 0 ? "text-align:center;" : ""}">${esc(c)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<p style="margin:10pt 0 4pt;font-weight:bold;">${esc(t.title)}</p>
<table style="border-collapse:collapse;width:100%;font-size:13pt;">
<thead><tr><th style="border:1pt solid #000;padding:4pt 6pt;background:#eeeeee;font-weight:bold;">STT</th>${head}</tr></thead>
<tbody>${t.rows
    .map(
      (row, i) =>
        `<tr><td style="border:1pt solid #000;padding:4pt 6pt;text-align:center;">${i + 1}</td>${row
          .map((c, ci) => `<td style="border:1pt solid #000;padding:4pt 6pt;${ci === 0 ? "text-align:center;" : ""}">${esc(c)}</td>`)
          .join("")}</tr>`
    )
    .join("")}</tbody>
</table>`;
}

export function buildWordHtml(d: WordDocData): string {
  const basesList = d.bases
    .map((b, i) => `<p style="margin:2pt 0;text-indent:28pt;">${["a", "b", "c", "d", "đ", "e", "g", "h", "i", "k"][i] ?? i + 1}) ${esc(b)};</p>`)
    .join("");

  const sectionsHtml = d.sections
    .map((sec) => {
      const paras = (sec.paragraphs ?? []).map((p) => `<p style="margin:6pt 0;text-align:justify;text-indent:28pt;">${esc(p)}</p>`).join("");
      const tables = (sec.tables ?? []).map(tableHtml).join("");
      return `<p style="margin:12pt 0 4pt;font-weight:bold;">${esc(sec.heading)}</p>${paras}${tables}`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(d.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4; margin: 2cm 2.5cm 2cm 3cm; }
  body { font-family: "Times New Roman", serif; font-size: 14pt; color: #000; }
  p { margin: 0; line-height: 1.4; }
</style>
</head>
<body>
<table style="width:100%;border:none;">
<tr>
  <td style="width:48%;border:none;text-align:center;">
    <p style="font-weight:bold;text-transform:uppercase;">Đoàn TNCS Hồ Chí Minh</p>
    <p style="font-weight:bold;text-transform:uppercase;">${esc(d.orgUnitName)}</p>
    ${d.orgUnitAddress ? `<p style="font-style:italic;font-size:13pt;">${esc(d.orgUnitAddress)}</p>` : ""}
    <p style="font-weight:bold;">-------o0o-------</p>
  </td>
  <td style="width:52%;border:none;text-align:center;">
    <p style="font-weight:bold;text-transform:uppercase;">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
    <p style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</p>
    <p style="font-weight:bold;">-------o0o-------</p>
  </td>
</tr>
</table>
<p style="margin:10pt 0 0;"><i>Số: ${esc(d.docCode)}</i></p>
<p style="text-align:right;margin-top:-14pt;"><i>${esc(d.place)}, ${esc(d.dateStr)}</i></p>

<p style="text-align:center;margin-top:18pt;font-weight:bold;font-size:16pt;text-transform:uppercase;">${esc(d.title)}</p>
${d.greeting ? `<p style="margin:8pt 0 2pt;font-style:italic;">${esc(d.greeting)}</p>` : ""}

<p style="margin-top:10pt;"><b>I. CĂN CỨ</b></p>
${basesList}

${sectionsHtml.replace(/^<p style="margin:12pt 0 4pt;font-weight:bold;">([IVX]+)\./, '<p style="margin:12pt 0 4pt;font-weight:bold;">$1.')}

<table style="width:100%;border:none;margin-top:24pt;">
<tr>
  <td style="width:50%;border:none;vertical-align:top;">
    <p style="font-style:italic;">Nơi nhận:</p>
    ${d.recipients.map((r) => `<p style="text-indent:14pt;">- ${esc(r)};</p>`).join("")}
  </td>
  <td style="width:50%;border:none;text-align:center;vertical-align:top;">
    ${d.signerOrgShort ? `<p style="font-weight:bold;text-transform:uppercase;">TM. ${esc(d.signerOrgShort)}</p>` : ""}
    <p style="font-weight:bold;text-transform:uppercase;">${esc(d.signerPosition)}</p>
    <p style="margin-top:36pt;font-weight:bold;">${esc(d.signerName)}</p>
  </td>
</tr>
</table>
</body>
</html>`;
}

export function downloadWordDoc(fileName: string, data: WordDocData): void {
  const html = buildWordHtml(data);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Xuất Word TRỰC TIẾP TỪ BẢN NHÁP AI (đúng khung đặc tả agent báo cáo) ── */

export interface DraftWordInput {
  draft: string; // plain text bản nháp AI
  orgUnitName: string; // tên cơ quan ban hành — ô trái khối thể thức (linh hoạt theo đơn vị)
  fileName?: string;
  docSymbol?: string; // ký hiệu sau chỗ trống điền số, mặc định "-BC/TĐTN"
  draftNote?: string; // ghi chú nghiêng dưới số — mặc định "(Dự thảo)"
  upperOrgName?: string; // ô phải: tổ chức Đoàn cấp trên trực tiếp (mặc định quốc hiệu "ĐOÀN TNCS HỒ CHÍ MINH")
  place?: string; // địa danh dòng ngày — mặc định "TP. Hồ Chí Minh"
  docTitle?: string; // đè tiêu đề bắt từ bản nháp
  docSubtitles?: string[]; // các dòng phụ đề dưới tiêu đề (bổ sung)
  noiNhan?: string[]; // đè danh sách nơi nhận (nếu bỏ trống bắt từ bản nháp, fallback theo mẫu)
  signOrg?: string; // "TM. BAN THƯỜNG VỤ THÀNH ĐOÀN" — suy ra từ tên đơn vị nếu bỏ trống
  signTitle?: string; // "BÍ THƯ"
  signerName?: string; // họ tên người ký — bắt từ bản nháp nếu bỏ trống (QĐ 27-HĐ mục 7)
  /**
   * Hồ sơ thể thức của đơn vị (GET /api/org-units/ho-so-the-thuc). Có thì khối đầu trang/chân trang dựng đúng
   * 29-HD: tên cơ quan 1-2 dòng, ký hiệu theo loại văn bản, địa danh, đề ký, nơi nhận mặc định.
   */
  donVi?: DonViBanHanh | null;
}

const isThucTheLine = (s: string): boolean =>
  /^ĐOÀN TNCS HỒ CHÍ MINH$/i.test(s.trim()) ||
  // Chỉ dòng tên cơ quan IN HOA — không nuốt câu văn "Ban Chấp hành Đoàn trường đề nghị…"
  (/^BAN (CHẤP HÀNH|THƯỜNG VỤ)/.test(s.trim()) && isAllCaps(s)) ||
  /^CỘNG HÒA XÃ HỘI/i.test(s.trim()) ||
  /^ĐỘC LẬP\s*-/i.test(s.trim()) ||
  /^-+\s*o0o\s*-+$/i.test(s.trim());

const isDivider = (s: string): boolean => /^-{3,}$/.test(s.trim());
const isRomanHeading = (s: string): boolean => /^[IVX]+\.\s+\S/.test(s.trim());
const isNumHeading = (s: string): boolean => /^\d+\.\s+\S/.test(s.trim()) || /^\d+\.\d+\.\s+\S/.test(s.trim());
const isSignBlock = (s: string): boolean =>
  /^(TM\.|KT\.|TL\.|OĐ\.|TĐL\.|ĐK\.|BÍ THƯ|CHỦ TỊCH|PHÓ BÍ THƯ|THƯ KÝ|ĐOÀN CHỦ TỊCH|ĐOÀN THƯ KÝ|CHÁNH VĂN PHÒNG|Q\. TRƯỞNG|TRƯỞNG BAN|PHÓ TRƯỞNG)/i.test(
    s.trim()
  );
/** Dòng "(Chữ ký)" / "(chữ ký)" trong bản nháp AI — không in vào file Word */
const isSignPlaceholder = (s: string): boolean => /^\(chữ ký\)\.?$|^ký tên\.?$/i.test(s.trim());
/** Tên người ký: các từ viết hoa in thường, không dấu câu (VD "Nguyễn Văn A") */
const isPersonName = (s: string): boolean =>
  /^[\p{Lu}][\p{L}\s.]{3,39}$/u.test(s.trim()) && !/[,:;!?(){}[\]"']/.test(s) && !isAllCaps(s) && !isSignBlock(s);
const TITLE_RE = /^(báo cáo|chương trình|kế hoạch|nghị quyết|chỉ thị|hướng dẫn|tổng kết|quyết định|quy định|thông báo|thông tri|tờ trình)\b/i;
const isDateLine = (s: string): boolean => /ngày\s+(\d+\s+)?tháng\s+(\d+\s+)?năm/i.test(s.trim());
/** Viết tắt thể loại theo tên loại ở đầu bản nháp ("KẾ HOẠCH" → "KH"); công văn → "CV"; không rõ → "BC" */
const vietTatTheoTenLoai = (title: string, congVan: boolean): string => {
  if (congVan) return "CV";
  const t = title.trim().toLocaleUpperCase("vi");
  const l = vanBanLoaiList.find((x) => x.ten.split("/").some((p) => t.startsWith(p.trim().toLocaleUpperCase("vi"))));
  return l?.vietTat ?? "BC";
};
/** Giữ khoảng trắng liền nhau (chỗ trống điền số, ngày) khi mở bằng Word */
const escSpace = (s: string) => esc(s).replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length));
const isAllCaps = (s: string): boolean => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  return letters.length > 6 && letters === letters.toLocaleUpperCase("vi-VN");
};

/** escape + chuyển **đậm** markdown thành <b> */
const mdInline = (s: string): string =>
  s
    .split(/\*\*(.+?)\*\*/g)
    .map((seg, k) => (k % 2 === 1 ? `<b>${esc(seg)}</b>` : esc(seg)))
    .join("")
    // Chỗ cần điền — tô vàng để người soạn dễ thấy
    .replace(/\[CẦN BỔ SUNG\]/g, '<span style="background:yellow;mso-highlight:yellow;">[CẦN BỔ SUNG]</span>');

/**
 * Ước lượng bề rộng chữ (pt) theo số đo Times New Roman: chữ hoa ~0,72em (đậm) / ~0,67em (thường),
 * chữ thường ~0,45em, chữ số 0,5em, dấu cách / dấu câu 0,25em.
 */
const uocRongPt = (s: string, pt: number, dam = false): number =>
  [...s].reduce((w, c) => {
    if (/[\s.,:;*()\-/]/.test(c)) return w + 0.25;
    if (/\d/.test(c)) return w + 0.5;
    return w + (c !== c.toLocaleUpperCase("vi") ? 0.45 : dam ? 0.72 : 0.67);
  }, 0) * pt;

/**
 * Chia độ rộng 2 cột khối đầu trang (%): cột phải đủ cho tiêu đề và dòng địa danh - ngày tháng (không xuống dòng),
 * phần dư chia đều; tên cơ quan quá dài thì được xuống dòng (29-HD cho phép).
 */
function chiaCotDauTrang(trai: string[], phai: { text: string; pt: number; dam?: boolean }[]): [number, number] {
  const TONG = 453; // vùng chữ A4: 21 cm − lề trái 3 cm − lề phải 2 cm ≈ 16 cm ≈ 453 pt
  // trai[0] = dòng tổ chức cấp trên (không đậm), các dòng sau = tên cơ quan ban hành (đậm)
  const canTrai = Math.max(0, ...trai.map((t, k) => (t ? uocRongPt(t, 14, k > 0) : 0))) + 14;
  const canPhai = Math.max(0, ...phai.map((x) => uocRongPt(x.text, x.pt, x.dam))) + 14;
  const du = TONG - canTrai - canPhai;
  const p = Math.round(((du > 0 ? canPhai + du / 2 : canPhai) / TONG) * 100);
  const phaiPct = Math.min(60, Math.max(42, p));
  return [100 - phaiPct, phaiPct];
}

/**
 * Tách dòng AI trình bày 2 cột trên cùng một dòng (VD "- Lưu VP.   TM. BAN BÍ THƯ", "Nơi nhận:      TM. BAN …")
 * thành 2 dòng: phần nơi nhận / nội dung trước, phần chữ ký sau.
 */
function tachDongHaiCot(line: string): string[] {
  const m =
    line.match(/^(.*?\S)\s*(?:\t|\s{2,})((?:TM|KT|TL|Q)\.\s+\S.*)$/) ??
    line.match(/^(.*?[;.:])\s+((?:TM|KT|TL)\.\s+[A-ZĐ].*)$/);
  if (m) return [m[1].trim(), m[2].trim()];
  const cot = line.split(/\t+|\s{3,}/);
  if (cot.length === 2 && cot[0].trim() && (isSignBlock(cot[1]) || isPersonName(cot[1]))) return [cot[0].trim(), cot[1].trim()];
  return [line];
}

const deriveSignOrg = (org: string): string => {
  if (/TRUNG ƯƠNG ĐOÀN/.test(org)) return "TM. BAN CHẤP HÀNH TRUNG ƯƠNG ĐOÀN";
  if (/THÀNH ĐOÀN|THANH ĐOÀN/.test(org)) return "TM. BAN THƯỜNG VỤ THÀNH ĐOÀN";
  const m = org.match(/^BCH\s+ĐOÀN\s+(.+)$/);
  return m ? `TM. BAN CHẤP HÀNH ĐOÀN ${m[1]}` : `TM. ${org}`;
};

/** Bảng Word từ các dòng markdown "| a | b |" — tiêu đề đậm căn giữa, cột đầu căn giữa */
function mdTableHtml(rows: string[][], fontPt: number): string {
  const cell = (c: string, head: boolean, first: boolean) =>
    `<td style="border:1pt solid #000;padding:2pt 4pt;${
      head ? "font-weight:bold;text-align:center;" : first ? "text-align:center;" : "text-align:left;"
    }">${mdInline(c)}</td>`;
  return `<table style="border-collapse:collapse;width:100%;font-size:${fontPt}pt;">${rows
    .map((r, ri) => `<tr>${r.map((c, ci) => cell(c, ri === 0, ci === 0)).join("")}</tr>`)
    .join("")}</table>`;
}

/**
 * Chuyển bản nháp AI thành HTML Word khớp 100% thể thức 2 mẫu gốc:
 * - Lề 2-2-2-3cm, Times New Roman 11pt (nền), bảng 14pt (12pt ở phụ lục).
 * - Khối thể thức bảng 2 ô (41/59): trái = tên cơ quan + "***" + "Số: …" + ghi chú nghiêng;
 *   phải = "ĐOÀN TNCS HỒ CHÍ MINH" đậm + địa danh ngày tháng nghiêng 14pt.
 * - Tiêu đề + phụ đề in đậm căn giữa, kẻ ngang "-----------".
 * - Thân bài căn đều, thụt đầu dòng 1cm, lề dưới 3pt; đề mục đậm (mục x.y đậm nghiêng);
 *   cụm dẫn nhập "Ưu điểm:/Hạn chế:…" in nghiêng; bảng markdown render thành bảng Word.
 * - Cuối văn bản bảng 2 ô: "Nơi nhận:" + danh sách | "TM. …" + chức vụ ký.
 * - Bản nháp có "Phần thứ…" → tự chuyển thể thức BCCT Đại hội (thụt 1,25cm,
 *   tiêu đề 15pt, quốc hiệu 15pt căn phải, "Phần thứ" + dòng chữ hoa căn giữa đậm).
 */
export function buildDraftWordHtml(i: DraftWordInput): string {
  const lines = stripHtmlTags(i.draft)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .flatMap(tachDongHaiCot)
    .filter((l, k, a) => !(l && /^\[CẦN BỔ SUNG\]\.?$/.test(l) && a.slice(0, k).reverse().find(Boolean) === l));

  // 1) Bắt khối tiêu đề (BÁO CÁO…/phụ đề/kẻ ngang) ở đầu bản nháp nếu AI tự sinh
  let title = i.docTitle ? i.docTitle.toUpperCase() : "";
  const subtitles: string[] = i.docSubtitles ? [...i.docSubtitles] : [];
  let start = 0;
  let congVan = false;
  let trichYeuCv: string | null = null;

  // AI hay tự viết khối đầu trang (tên cơ quan, ***, Số, tiêu đề, ngày tháng) trước tên loại — nhận diện để bỏ,
  // tránh in lặp vào thân và để bắt đúng tên loại / trích yếu "V/v" của công văn
  const laDongDauTrang = (s: string): boolean =>
    !s ||
    isThucTheLine(s) ||
    /^Số\s*:/i.test(s) ||
    isDateLine(s) ||
    /^\*+$/.test(s) ||
    /^\(.*dự thảo.*\)$/i.test(s) ||
    (isAllCaps(s) && !isRomanHeading(s) && !isNumHeading(s) && !/^Phần thứ/i.test(s) && !TITLE_RE.test(s));
  if (!title) {
    for (let k = 0; k < Math.min(lines.length, 20); k++) {
      if (/^V\/v\b/i.test(lines[k])) {
        congVan = true;
        trichYeuCv = lines[k];
        start = k + 1;
        break;
      }
      if (TITLE_RE.test(lines[k])) {
        start = k;
        break;
      }
      if (!laDongDauTrang(lines[k])) break;
    }
  }
  if (!title && !congVan) {
    let k = start;
    while (k < lines.length && k < start + 15) {
      const line = lines[k];
      if (!line) {
        k++;
        continue;
      }
      if (TITLE_RE.test(line)) {
        title = line.toUpperCase();
        k++;
        while (k < lines.length) {
          const s = lines[k];
          if (!s) break;
          if (isDivider(s)) {
            k++;
            break;
          }
          if (isRomanHeading(s) || isNumHeading(s) || /^Phần thứ\s/i.test(s)) break;
          subtitles.push(s);
          k++;
        }
        break;
      }
      if (isThucTheLine(line) || /^Số:/i.test(line) || isDateLine(line)) {
        k++;
        continue;
      }
      break;
    }
    start = k;
  }
  if (!title && !congVan) title = "BÁO CÁO";
  const vietTat = vietTatTheoTenLoai(title, congVan);

  const rest = lines.slice(start);
  const bcct = /^Phần thứ\s/im.test(rest.join("\n"));
  const indent = bcct ? "1.25cm" : "1cm";
  const dv = i.donVi ?? null;
  const org = i.orgUnitName.trim().toUpperCase();
  const place = i.place ?? dv?.diaDanh ?? "TP. Hồ Chí Minh";
  const paras: string[] = [];

  let noiNhan = i.noiNhan ? [...i.noiNhan] : null;
  let signOrg = i.signOrg ?? null;
  let signTitle = i.signTitle ?? null;
  let collectingNn = false;
  let afterPhanThu = false;
  let inPhuLuc = false;
  let phuLucHead = false;
  let sawSection = false;
  /** Dòng kế sau khối đề ký là họ tên người ký → in vào chân trang theo thể thức QĐ 27-HĐ */
  let pendingSignName = false;
  let signerName = i.signerName ?? null;
  let tableBuf: string[][] | null = null;
  const flushTable = () => {
    if (tableBuf) {
      paras.push(mdTableHtml(tableBuf, inPhuLuc ? 12 : 14));
      tableBuf = null;
    }
  };

  for (let idx = 0; idx < rest.length; idx++) {
    const line = rest[idx];
    if (!line) {
      flushTable();
      collectingNn = false;
      afterPhanThu = false;
      continue;
    }
    if (/^\|/.test(line)) {
      if (/^\|[\s:\-|]*\|$/.test(line)) continue; // hàng phân cách |---|---|
      tableBuf = tableBuf ?? [];
      tableBuf.push(line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    if (isThucTheLine(line) || /^Số:/i.test(line) || isDateLine(line)) continue;
    if (/^PHỤ LỤC/i.test(line)) {
      inPhuLuc = true;
      phuLucHead = true;
      sawSection = true;
      paras.push(`<p style="text-align:center;margin:12pt 0 2pt;font-weight:bold;">${mdInline(line)}</p>`);
      continue;
    }
    if (phuLucHead && /^\(/.test(line)) {
      paras.push(`<p style="text-align:center;margin:0 0 2pt;font-style:italic;">${mdInline(line)}</p>`);
      continue;
    }
    if (phuLucHead) {
      paras.push(`<p style="text-align:center;margin:0 0 2pt;font-weight:bold;">${mdInline(line)}</p>`);
      continue;
    }
    if (/^Nơi nhận:/i.test(line)) {
      collectingNn = true;
      noiNhan = noiNhan ?? [];
      continue;
    }
    if (collectingNn && /^[-–•]\s*/.test(line)) {
      noiNhan!.push(line.replace(/^[-–•]\s*/, ""));
      continue;
    }
    if (isSignBlock(line)) {
      if (/^TM\.|KT\.|TL\./i.test(line)) signOrg = signOrg ?? line;
      else signTitle = signTitle ?? line;
      pendingSignName = true;
      continue;
    }
    if (pendingSignName) {
      // Bỏ qua dòng "(Chữ ký)"; dòng sau chức danh là họ tên người ký → giữ để in chân trang
      if (isSignPlaceholder(line)) continue;
      pendingSignName = false;
      if (isPersonName(line) && (signerName === null || signerName === line)) {
        signerName = line;
        continue;
      }
    }
    collectingNn = false;
    if (/^Phần thứ\s+\S+/i.test(line)) {
      paras.push(`<p style="text-align:center;margin:3pt 0 3pt;font-weight:bold;">${mdInline(line)}</p>`);
      afterPhanThu = true;
      sawSection = true;
      continue;
    }
    if (afterPhanThu && isAllCaps(line)) {
      paras.push(`<p style="text-align:center;margin:0 0 3pt;font-weight:bold;">${mdInline(line)}</p>`);
      continue;
    }
    afterPhanThu = false;
    if (isRomanHeading(line) || isNumHeading(line) || /^(Khẩu hiệu hành động|Mục tiêu|Dự báo tình hình)\s*:/i.test(line)) {
      const sub = /^\d+\.\d+\./.test(line); // mục con x.y. → đậm nghiêng (cả 2 mẫu đều vậy)
      paras.push(
        `<p style="text-align:justify;text-indent:${indent};margin:${isNumHeading(line) ? "0pt" : "3pt"} 0 3pt;font-weight:bold;${sub ? "font-style:italic;" : ""}">${mdInline(line)}</p>`
      );
      sawSection = true;
      continue;
    }
    if (isDivider(line)) {
      phuLucHead = false;
      paras.push(`<p style="text-align:center;margin:0 0 6pt;">-----------</p>`);
      continue;
    }
    // Trích yếu công văn "V/v …" — chữ thường nghiêng căn giữa ngay dưới số - ký hiệu (QĐ 27-HĐ mục 5)
    if (/^V\/v/i.test(line)) {
      if (trichYeuCv === line) continue;
      paras.push(`<p style="text-align:center;margin:0 0 3pt;font-style:italic;">${mdInline(line)}</p>`);
      continue;
    }
    // "Kính gửi:" / "Đồng kính gửi:" — đứng, đậm (29-HD mục 3b)
    if (/^(Đồng kính gửi|Kính gửi)\s*:/i.test(line)) {
      paras.push(`<p style="text-align:justify;text-indent:${indent};margin:0 0 6pt;font-weight:bold;">${mdInline(line)}</p>`);
      continue;
    }
    // cụm dẫn nhập ngắn kết thúc ":" → in nghiêng (Ưu điểm:/Hạn chế:/Học tập và làm theo…:)
    const m = !line.startsWith("- ") && !line.startsWith("|") ? line.match(/^([A-ZÀ-ỸĐ][^:.!?]{1,80}):\s*(.*)$/u) : null;
    if (m) {
      const [, lead, tail] = m;
      paras.push(
        `<p style="text-align:justify;text-indent:${indent};margin:0 0 3pt;"><i>${mdInline(lead)}:</i>${tail ? ` ${mdInline(tail)}` : ""}</p>`
      );
      continue;
    }
    // khẩu hiệu/câu dẫn ngắn trước đề mục đầu tiên → đậm căn giữa (mẫu BCCT)
    if (!sawSection && !inPhuLuc && !line.startsWith("- ") && line.length < 150 && !/[.!?…]$/.test(line)) {
      paras.push(`<p style="text-align:center;margin:0 0 3pt;font-weight:bold;">${mdInline(line)}</p>`);
      continue;
    }
    // đoạn văn thường (gạch đầu dòng "- …" giữ nguyên, thụt đầu dòng như mẫu)
    paras.push(
      `<p style="text-align:justify;text-indent:${indent};margin:${bcct ? "3pt 0 1pt" : "0 0 3pt"};">${mdInline(line)}</p>`
    );
  }
  flushTable();

  // Khối thể thức đầu trang — bảng 2 ô theo 100% chuẩn Hướng dẫn 29-HD/TWĐTN-VP và Mẫu 3
  const upper = i.upperOrgName ?? "ĐOÀN TNCS HỒ CHÍ MINH";
  const ngayThang = formatDiaDiemNgayThang(place, null);
  const [cotTrai, cotPhai] = chiaCotDauTrang([dv?.coQuanCapTren ?? "", dv?.coQuanBanHanh ?? org], [
    { text: upper, pt: 15, dam: true },
    { text: ngayThang, pt: 13 },
  ]);
  const note = i.draftNote ?? "(Dự thảo)";
  const headerTable = bcct
    ? `<table style="width:100%;border:none;border-collapse:collapse;">
<tr>
  <td style="width:51%;border:none;text-align:center;vertical-align:top;">
    <p style="margin:0;font-size:14pt;font-weight:bold;">${esc(org)}</p>
    <p style="margin:0;font-size:14pt;">***</p>
    <p style="margin:0;font-size:12pt;font-weight:bold;font-style:italic;">${esc(note)}</p>
  </td>
  <td style="width:49%;border:none;text-align:right;vertical-align:top;">
    <p style="margin:0;font-size:15pt;font-weight:bold;"><u>${esc(upper)}</u></p>
  </td>
</tr>
</table>`
    : `<table style="width:100%;border:none;border-collapse:collapse;">
<tr>
  <td style="width:${cotTrai}%;border:none;text-align:center;vertical-align:top;">
    ${dv?.coQuanCapTren ? `<p style="margin:0;font-size:14pt;">${esc(dv.coQuanCapTren)}</p>` : ""}
    <p style="margin:0;font-size:14pt;font-weight:bold;">${esc(dv?.coQuanBanHanh ?? org)}</p>
    <p style="margin:0;font-size:14pt;">***</p>
    <p style="margin:0;font-size:14pt;">Số: ${escSpace(i.docSymbol ?? (dv ? `     -${vietTat}/${dv.kyHieuCoQuan}` : `-${vietTat}/TĐTN`))}</p>
    ${trichYeuCv ? `<p style="margin:2pt 0 0;font-size:12pt;font-style:italic;">${esc(trichYeuCv)}</p>` : ""}
    ${note ? `<p style="margin:0;font-size:12pt;font-style:italic;">${esc(note)}</p>` : ""}
  </td>
  <td style="width:${cotPhai}%;border:none;text-align:center;vertical-align:top;">
    <p style="margin:0;font-size:15pt;font-weight:bold;"><u>${esc(upper)}</u></p>
    <p style="margin:4pt 0 0;font-size:13pt;font-style:italic;">${escSpace(ngayThang)}</p>
  </td>
</tr>
</table>`;

  // MẪU 3: Tên loại văn bản cỡ 16 đứng đậm; trích yếu cỡ 14 đứng đậm; nét rời -----------
  const titlePt = bcct ? 15 : 16;
  const titleHtml = congVan
    ? `<p style="margin:0 0 8pt;">&nbsp;</p>`
    : `<p style="text-align:center;margin:12pt 0 2pt;font-weight:bold;font-size:${titlePt}pt;">${esc(title)}</p>
${subtitles.map((s) => `<p style="text-align:center;margin:0 0 2pt;font-weight:bold;font-size:14pt;">${esc(s)}</p>`).join("\n")}
<p style="text-align:center;margin:2pt 0 8pt;">-----------</p>`;

  // MẪU 3: Nơi nhận 13 đứng đậm, chi tiết 11 đứng; Chữ ký 14 đứng đậm, chức vụ 14 đứng
  const nnMacDinh = dv
    ? [
        ...(congVan ? ["Như trên;"] : []),
        ...(vietTat === "BC" ? dv.noiNhanTheoLoai?.BAO_CAO ?? [] : dv.noiNhanTheoLoai?.MAC_DINH ?? []),
        dv.noiLuu,
      ]
    : ["Ban Bí thư Trung ương Đoàn (để báo cáo);", "Thường trực Thành ủy (để báo cáo);", "Lưu VP."];
  const nn = noiNhan?.length ? noiNhan : nnMacDinh;
  const finalSignOrg = (signOrg ?? (dv ? dv.deKyMacDinh : deriveSignOrg(org))).toUpperCase();
  const footer = `<table style="width:100%;border:none;border-collapse:collapse;margin-top:16pt;">
<tr>
  <td style="width:41%;border:none;vertical-align:top;">
    <p style="margin:0 0 3pt;font-size:13pt;font-weight:bold;">Nơi nhận:</p>
    ${nn
      .map((r) => `<p style="margin:0 0 2pt;font-size:11pt;">- ${esc(r.startsWith("-") ? r.slice(1).trim() : r)}</p>`)
      .join("\n")}
  </td>
  <td style="width:59%;border:none;text-align:center;vertical-align:top;">
    ${finalSignOrg ? `<p style="margin:0;font-size:14pt;font-weight:bold;">${esc(finalSignOrg)}</p>` : ""}
    <p style="margin:4pt 0 0;font-size:14pt;">${esc((signTitle ?? i.signTitle ?? dv?.chucVuKyMacDinh ?? "BÍ THƯ").toUpperCase())}</p>
    <p style="margin:24pt 0;">&nbsp;</p>
    ${signerName ? `<p style="margin:0;font-size:14pt;font-weight:bold;">${esc(signerName)}</p>` : ""}
  </td>
</tr>
</table>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4; margin: 2cm 2cm 2cm 3cm; }
  body { font-family: "Times New Roman", serif; font-size: 14pt; color: #000; }
  p { margin: 0; }
</style>
</head>
<body>
${headerTable}
${titleHtml}
${paras.join("\n")}
${footer}
</body>
</html>`;
}

/** Tải bản nháp AI thành .doc — cùng cơ chế với downloadWordDoc */
export function downloadDraftWordDoc(fileName: string, input: DraftWordInput): void {
  const html = buildDraftWordHtml(input);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Ngày tháng dạng văn bản: "ngày 27 tháng 9 năm 2026" */
export function vnDateStr(d: Date): string {
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export interface ReportBuildInput {
  store: StoreApi;
  orgUnitId: number;
  templateId: string;
  docCode: string;
  title: string;
  bases: string[];
  greeting?: string;
  periodLabel: string;
  signerName: string;
  signerPosition: string;
  recipients: string[];
}

/** Gom số liệu từ dữ liệu đơn vị đã nhập trên hệ thống để điền vào văn bản */
export function buildReportWordData(input: ReportBuildInput): WordDocData {
  const { store, orgUnitId } = input;
  const org = store.orgById(orgUnitId);
  const acts = store.activities.filter((a) => a.orgUnitId === orgUnitId);
  const asgs = store.taskAssignments.filter((a) => a.orgUnitId === orgUnitId);
  const posts = store.publishedPosts.filter((p) => p.authorOrgUnitName === org?.name);
  const participantTotal = acts.reduce((s, a) => s + (a.participantCount ?? 0), 0);
  const confirmed = acts.filter((a) => a.confirmStatus === "CONFIRMED").length;
  const completed = asgs.filter((a) => a.progressStatus === "COMPLETED").length;
  const avgRate = asgs.length > 0 ? Math.round(asgs.reduce((s, a) => s + a.completionRate, 0) / asgs.length) : 0;
  const scores = store.scores.filter((s) => s.orgUnitId === orgUnitId);
  const scoreTotal = Math.round(scores.reduce((s, x) => s + x.points, 0) * 10) / 10;

  const summary = [
    `Trong ${input.periodLabel}, ${org?.name ?? "đơn vị"} đã triển khai ${acts.length} hoạt động (được xác nhận: ${confirmed}) với tổng ${participantTotal.toLocaleString("vi-VN")} lượt đoàn viên, thanh niên tham gia.`,
    `Về nhiệm vụ thi đua: ${asgs.length > 0 ? `theo dõi ${asgs.length} nhiệm vụ, trong đó ${completed} nhiệm vụ hoàn thành, tiến độ bình quân đạt ${avgRate}%.` : "chưa có nhiệm vụ được giao trong kỳ."}`,
    `Công tác truyền thông: ${posts.length} tin bài đã xuất bản trên Cổng thông tin điện tử.`,
    scores.length > 0
      ? `Điểm thi đua tích lũy theo Bộ tiêu chí hiện hành: ${scoreTotal} điểm.`
      : `Chưa có số liệu chấm điểm trong kỳ báo cáo.`,
  ];

  const actTable: WordTable = {
    title: "Bảng 1. Các hoạt động đã triển khai trong kỳ",
    headers: ["Tên hoạt động", "Thời gian", "Số người tham gia", "Trạng thái"],
    rows: acts.slice(0, 20).map((a) => [
      a.title,
      a.startDate,
      (a.participantCount ?? 0).toLocaleString("vi-VN"),
      a.confirmStatus === "CONFIRMED" ? "Đã xác nhận" : a.status === "DRAFT" ? "Bản nháp" : "Chờ xác nhận",
    ]),
  };

  const taskTable: WordTable = {
    title: "Bảng 2. Tiến độ nhiệm vụ thi đua",
    headers: ["Nhiệm vụ", "Hạn hoàn thành", "Tiến độ", "Trạng thái"],
    rows: asgs.slice(0, 20).map((a) => {
      const t = store.tasks.find((x) => x.id === a.taskId);
      return [
        `${t?.code ?? ""} — ${t?.title ?? a.taskId}`,
        a.dueDate,
        `${a.completionRate.toFixed(0)}%`,
        a.progressStatus === "COMPLETED" ? "Hoàn thành" : a.progressStatus === "OVERDUE" ? "Quá hạn" : a.progressStatus === "IN_PROGRESS" ? "Đang thực hiện" : "Chưa bắt đầu",
      ];
    }),
  };

  return {
    docCode: input.docCode,
    orgUnitName: (org?.name ?? "ĐOÀN CƠ SỞ").toUpperCase(),
    orgUnitAddress: org?.address,
    title: input.title.toUpperCase(),
    greeting: input.greeting,
    bases: input.bases,
    sections: [
      {
        heading: "II. KẾT QUẢ THỰC HIỆN",
        paragraphs: summary,
        tables: [actTable, taskTable],
      },
      {
        heading: "III. ĐÁNH GIÁ CHUNG VÀ KIẾN NGHỊ",
        paragraphs: [
          `Đánh giá chung: đơn vị cơ bản hoàn thành các nội dung công tác trong ${input.periodLabel}; một số nhiệm vụ cần tiếp tục theo dõi tiến độ và bổ sung minh chứng.`,
          "Kiến nghị, đề xuất: đề nghị cấp trên quan tâm hỗ trợ kinh phí hoạt động, tập huấn nghiệp vụ sử dụng hệ thống và gia hạn thời gian cho các nhiệm vụ chưa hoàn thành có lý do chính đáng.",
        ],
      },
    ],
    place: (org?.adminUnitName ?? "Hà Nội").split(",")[0],
    dateStr: vnDateStr(new Date()),
    signerPosition: input.signerPosition.toUpperCase(),
    signerOrgShort: undefined,
    signerName: input.signerName,
    recipients: input.recipients,
  };
}

/** Mẫu trắng — không số liệu, giữ khung thể thức */
export function buildTemplateWordData(opts: {
  orgUnitName: string;
  docCode: string;
  title: string;
  bases: string[];
  outline: string[];
  signerName: string;
  signerPosition: string;
  recipients: string[];
}): WordDocData {
  return {
    docCode: opts.docCode,
    orgUnitName: opts.orgUnitName.toUpperCase(),
    title: opts.title.toUpperCase(),
    bases: opts.bases,
    // buildWordHtml đã render sẵn mục "I. CĂN CỨ" — chỉ emit các phần nội dung tiếp theo
    sections: opts.outline
      .filter((o) => !/^I\.\s*CĂN CỨ/i.test(o))
      .map((o) => ({ heading: o, paragraphs: ["………"] })),
    place: "…",
    dateStr: `ngày … tháng … năm ${new Date().getFullYear()}`,
    signerPosition: opts.signerPosition.toUpperCase(),
    signerName: opts.signerName,
    recipients: opts.recipients,
  };
}


/**
 * Xuất file Word (.doc / .docx) từ object Structured Output theo Hướng dẫn 29-HD/TWĐTN-VP
 * Căn lề chuẩn A4: trên 20mm, dưới 20mm, trái 30mm, phải 20mm. Font Times New Roman 14pt.
 * Bảng 2 cột không viền cho khối Tiêu đề/Cơ quan ban hành và khối Chữ ký/Nơi nhận.
 */
export function exportStructuredWordHtml(data: VanBanStructuredOutput): string {
  const soKyHieu = normalizeVanBanSoKyHieu(data.so_ky_hieu);
  const ngayThang = normalizeVanBanNgayThang(data.dia_diem_ngay_thang);
  const noiNhan = normalizeNoiNhanList(data.noi_nhan);
  const isCongVan = !!data.trich_yeu_cong_van || /[-/]CV\b/i.test(soKyHieu);

  // Header Table 2 cột — độ rộng theo nội dung để tên cơ quan / ngày tháng không xuống dòng vô lý
  const [cotTrai, cotPhai] = chiaCotDauTrang([data.co_quan_cap_tren ?? "", data.co_quan_ban_hanh], [
    { text: data.tieu_de || "ĐOÀN TNCS HỒ CHÍ MINH", pt: 15, dam: true },
    { text: ngayThang, pt: 13 },
  ]);
  const headerHtml = `
<table style="width:100%;border:none;border-collapse:collapse;margin-bottom:12pt;">
  <tr>
    <td style="width:${cotTrai}%;border:none;text-align:center;vertical-align:top;padding:0 6pt 0 0;">
      ${data.co_quan_cap_tren ? `<p style="margin:0;font-size:14pt;font-family:'Times New Roman',serif;">${esc(data.co_quan_cap_tren.toUpperCase())}</p>` : ""}
      <p style="margin:0;font-size:14pt;font-weight:bold;font-family:'Times New Roman',serif;">${esc(data.co_quan_ban_hanh.toUpperCase())}</p>
      <p style="margin:0;font-size:14pt;font-family:'Times New Roman',serif;">***</p>
      <p style="margin:0;font-size:14pt;font-family:'Times New Roman',serif;">${escSpace(soKyHieu)}</p>
      ${isCongVan && data.trich_yeu_cong_van ? `<p style="margin:4pt 0 0;font-size:12pt;font-style:italic;font-family:'Times New Roman',serif;">${esc(data.trich_yeu_cong_van)}</p>` : ""}
    </td>
    <td style="width:${cotPhai}%;border:none;text-align:center;vertical-align:top;padding:0 0 0 6pt;">
      <p style="margin:0;font-size:15pt;font-weight:bold;font-family:'Times New Roman',serif;"><u>${esc(data.tieu_de || "ĐOÀN TNCS HỒ CHÍ MINH")}</u></p>
      <p style="margin:4pt 0 0;font-size:13pt;font-style:italic;font-family:'Times New Roman',serif;">${escSpace(ngayThang)}</p>
    </td>
  </tr>
</table>`;

  // Tiêu đề văn bản (Nếu không phải công văn)
  let titleHtml = "";
  if (!isCongVan && data.ten_loai_vb) {
    titleHtml = `
<p style="text-align:center;margin:14pt 0 2pt;font-weight:bold;font-size:16pt;font-family:'Times New Roman',serif;">${esc(data.ten_loai_vb.toUpperCase())}</p>
${data.trich_yeu_vb ? data.trich_yeu_vb.split("\n").map((t) => `<p style="text-align:center;margin:0;font-weight:bold;font-size:14pt;font-family:'Times New Roman',serif;">${esc(t)}</p>`).join("") : ""}
<p style="text-align:center;margin:2pt 0 10pt;font-size:14pt;font-family:'Times New Roman',serif;">-----------------</p>`;
  }

  // Kính gửi (nếu có)
  const kinhGuiHtml = data.kinh_gui
    ? `<p style="text-align:justify;margin:10pt 0 6pt;font-weight:bold;font-size:14pt;font-family:'Times New Roman',serif;">${esc(data.kinh_gui)}</p>`
    : "";

  // Thân bài (nội dung) — ưu tiên khối có cấu trúc (đúng kiểu chữ từng cấp đề mục), không có thì đọc văn bản thuần
  const contentLines = data.noi_dung_blocks?.length ? [] : data.noi_dung_html_hoac_markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bodyHtml = contentLines
    .map((line) => {
      // Đề mục La Mã: I. KẾT QUẢ...
      if (isRomanHeading(line)) {
        return `<p style="text-align:justify;text-indent:1.27cm;margin:6pt 0 3pt;font-weight:bold;font-size:14pt;font-family:'Times New Roman',serif;">${mdInline(line)}</p>`;
      }
      // Khoản: 1. Công tác...
      if (/^\d+\.\s+\S/.test(line)) {
        return `<p style="text-align:justify;text-indent:1.27cm;margin:4pt 0 2pt;font-weight:bold;font-size:14pt;font-family:'Times New Roman',serif;">${mdInline(line)}</p>`;
      }
      // Điểm: 1.1. Hoạt động... -> đậm nghiêng
      if (/^\d+\.\d+\.\s+\S/.test(line)) {
        return `<p style="text-align:justify;text-indent:1.27cm;margin:3pt 0 2pt;font-weight:bold;font-style:italic;font-size:14pt;font-family:'Times New Roman',serif;">${mdInline(line)}</p>`;
      }
      // Điểm cấp 2: 1.1.2. -> nghiêng thường
      if (/^\d+\.\d+\.\d+\.\s+\S/.test(line)) {
        return `<p style="text-align:justify;text-indent:1.27cm;margin:2pt 0 2pt;font-style:italic;font-size:14pt;font-family:'Times New Roman',serif;">${mdInline(line)}</p>`;
      }
      // Đoạn văn chuẩn thụt lùi 1.27cm
      return `<p style="text-align:justify;text-indent:1.27cm;margin:0 0 3pt;font-size:14pt;line-height:1.2;font-family:'Times New Roman',serif;">${mdInline(line)}</p>`;
    })
    .join("\n") + (data.noi_dung_blocks?.length ? structuredBlocksHtml(data.noi_dung_blocks) : "");

  // Footer Table 2 cột: Nơi nhận & Chữ ký
  const footerHtml = `
<table style="width:100%;border:none;border-collapse:collapse;margin-top:16pt;">
  <tr>
    <td style="width:45%;border:none;vertical-align:top;padding:0 6pt 0 0;">
      <p style="margin:0 0 3pt;font-size:13pt;font-weight:bold;font-family:'Times New Roman',serif;">Nơi nhận:</p>
      ${noiNhan
        .map((r) => `<p style="margin:0 0 2pt;font-size:11pt;font-family:'Times New Roman',serif;">${esc(r)}</p>`)
        .join("\n")}
    </td>
    <td style="width:55%;border:none;text-align:center;vertical-align:top;padding:0 0 0 6pt;">
      ${data.the_thuc_de_ky ? `<p style="margin:0;font-size:14pt;font-weight:bold;font-family:'Times New Roman',serif;">${esc(data.the_thuc_de_ky.toUpperCase())}</p>` : ""}
      <p style="margin:3pt 0 0;font-size:14pt;font-family:'Times New Roman',serif;">${esc(data.chuc_vu_ky.toUpperCase())}</p>
      <p style="margin:24pt 0;">&nbsp;</p>
      ${data.ten_nguoi_ky ? `<p style="margin:0;font-size:14pt;font-weight:bold;font-family:'Times New Roman',serif;">${esc(data.ten_nguoi_ky)}</p>` : ""}
    </td>
  </tr>
</table>`;

  const docTitle = data.ten_loai_vb ? `${data.ten_loai_vb} - ${data.trich_yeu_vb || ""}` : (data.trich_yeu_cong_van || "Van ban Doan");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(docTitle)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page {
  size: 210mm 297mm; /* Khổ A4 */
  margin: 20mm 20mm 20mm 30mm; /* Lề chuẩn: trên 20, dưới 20, phải 20, trái 30mm */
  mso-page-orientation: portrait;
}
body {
  font-family: 'Times New Roman', serif;
  font-size: 14pt;
  line-height: 1.2;
  color: #000;
  margin: 0;
  padding: 0;
}
p {
  margin: 0;
  padding: 0;
}
table {
  border-collapse: collapse;
}
</style>
</head>
<body>
${headerHtml}
${titleHtml}
${kinhGuiHtml}
${bodyHtml}
${footerHtml}
${phuLucHtml(data)}
</body>
</html>`;
}

/* ── Khối nội dung có cấu trúc (noi_dung_blocks) & phụ lục — dùng cho báo cáo tuần ── */

const TNR = "font-family:'Times New Roman',serif;";

function structuredTableHtml(b: NoiDungBlock, fontPt: number): string {
  const ws = b.colWidths ?? [];
  const tong = ws.reduce((a, x) => a + x, 0) || 1;
  const w = (i: number) => (ws[i] ? `width:${Math.round((ws[i] / tong) * 100)}%;` : "");
  const cell = "border:1pt solid #000;padding:3pt 5pt;vertical-align:top;";
  const head = b.header?.length
    ? `<tr>${b.header.map((h, i) => `<td style="${cell}${w(i)}text-align:center;font-weight:bold;">${esc(h)}</td>`).join("")}</tr>`
    : "";
  const rows = (b.rows ?? [])
    .map((r) => `<tr>${r.map((c, i) => `<td style="${cell}${w(i)}${i === 0 ? "text-align:center;" : ""}">${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:4pt 0 6pt;font-size:${fontPt}pt;${TNR}">${head}${rows}</table>`;
}

/** Kiểu chữ theo cấp đề mục 29-HD: mục IN HOA đậm; khoản đậm; điểm 1.1. nghiêng đậm; 1.1.1. nghiêng; gạch đầu dòng thường */
export function structuredBlocksHtml(blocks: NoiDungBlock[], fontPt = 14): string {
  const para = (style: string, html: string) =>
    `<p style="text-align:justify;text-indent:1.27cm;font-size:${fontPt}pt;line-height:1.2;${TNR}${style}">${html}</p>`;
  const center = (style: string, html: string) => `<p style="text-align:center;font-size:${fontPt}pt;${TNR}${style}">${html}</p>`;
  return blocks
    .map((b) => {
      // Xuống dòng trong một khối (VD "BAN THƯỜNG VỤ …\nQUYẾT ĐỊNH:") giữ nguyên trong Word
      const t = esc(b.text).replace(/\n/g, "<br>");
      switch (b.kieu) {
        case "phan":
          return center("margin:8pt 0 0;font-weight:bold;font-size:15pt;", t);
        case "tieu_de_phan":
        case "quyet_dinh":
        case "tieu_de_giua":
          return center("margin:2pt 0 4pt;font-weight:bold;", t);
        case "ghi_chu_giua":
          return center("margin:0 0 4pt;font-style:italic;", t);
        case "muc":
          return para("margin:6pt 0 3pt;font-weight:bold;", t);
        case "khoan":
          return para("margin:4pt 0 2pt;font-weight:bold;", t);
        case "diem":
          return para("margin:3pt 0 2pt;font-weight:bold;font-style:italic;", t);
        case "diem2":
          return para("margin:2pt 0 2pt;font-style:italic;", t);
        case "gach":
          return para("margin:0 0 3pt;", `- ${t}`);
        case "bang":
          return structuredTableHtml(b, Math.min(fontPt, 13));
        default:
          return para("margin:0 0 3pt;", t);
      }
    })
    .join("\n");
}

/** Phụ lục: sang trang mới, tên "PHỤ LỤC", trích yếu, dòng "(Kèm theo …)", gạch ngang, rồi nội dung */
function phuLucHtml(data: VanBanStructuredOutput): string {
  return (data.phu_luc ?? [])
    .map(
      (p) => `<br clear="all" style="mso-special-character:line-break;page-break-before:always">
<p style="text-align:center;margin:0;font-weight:bold;font-size:14pt;${TNR}">${esc(p.tieu_de)}</p>
<p style="text-align:center;margin:0;font-weight:bold;font-size:14pt;${TNR}">${esc(p.trich_yeu)}</p>
${p.ghi_chu ? `<p style="text-align:center;margin:0;font-style:italic;font-size:14pt;${TNR}">${esc(p.ghi_chu)}</p>` : ""}
<p style="text-align:center;margin:2pt 0 8pt;font-size:14pt;${TNR}">-----------</p>
${structuredBlocksHtml(p.blocks, 13)}`
    )
    .join("\n");
}

/** Tải file Word (.doc) dựng từ văn bản có cấu trúc (khối thể thức + nội dung + phụ lục) */
export function downloadStructuredWordDoc(fileName: string, data: VanBanStructuredOutput): void {
  const html = exportStructuredWordHtml(data);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
