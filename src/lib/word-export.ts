/**
 * Xuất văn bản Word (.doc) đúng thể thức văn bản hành chính:
 * quốc hiệu - tiêu ngữ, tên cơ quan, số/ký hiệu, căn cứ, nội dung, nơi nhận, chữ ký.
 * Cách tiếp cận: HTML với header MS Word, tải về .doc mở trực tiếp bằng Word/LibreOffice.
 */
import type { useStore } from "@/lib/store-context";

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
}

const isThucTheLine = (s: string): boolean =>
  /^ĐOÀN TNCS HỒ CHÍ MINH$/i.test(s.trim()) ||
  /^BAN (CHẤP HÀNH|THƯỜNG VỤ)/i.test(s.trim()) ||
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
const TITLE_RE = /^(báo cáo|chương trình|kế hoạch|nghị quyết|chỉ thị|hướng dẫn|tổng kết)\b/i;
const isDateLine = (s: string): boolean => /ngày\s+\d+\s+tháng\s+\d+\s+năm/i.test(s.trim());
const isAllCaps = (s: string): boolean => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  return letters.length > 6 && letters === letters.toLocaleUpperCase("vi-VN");
};

/** escape + chuyển **đậm** markdown thành <b> */
const mdInline = (s: string): string =>
  s
    .split(/\*\*(.+?)\*\*/g)
    .map((seg, k) => (k % 2 === 1 ? `<b>${esc(seg)}</b>` : esc(seg)))
    .join("");

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
  const lines = i.draft.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());

  // 1) Bắt khối tiêu đề (BÁO CÁO…/phụ đề/kẻ ngang) ở đầu bản nháp nếu AI tự sinh
  let title = i.docTitle ? i.docTitle.toUpperCase() : "";
  const subtitles: string[] = i.docSubtitles ? [...i.docSubtitles] : [];
  let start = 0;
  if (!title) {
    let k = 0;
    while (k < lines.length && k < 15) {
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
  if (!title) title = "BÁO CÁO";

  const rest = lines.slice(start);
  const bcct = /^Phần thứ\s/im.test(rest.join("\n"));
  const indent = bcct ? "1.25cm" : "1cm";
  const org = i.orgUnitName.trim().toUpperCase();
  const place = i.place ?? "TP. Hồ Chí Minh";
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
    if (collectingNn && /^[-•]\s*/.test(line)) {
      noiNhan!.push(line.replace(/^[-•]\s*/, ""));
      continue;
    }
    collectingNn = false;
    if (isSignBlock(line)) {
      if (/^TM\.|KT\.|TL\./i.test(line)) signOrg = signOrg ?? line;
      else signTitle = signTitle ?? line;
      pendingSignName = true;
      continue;
    }
    if (pendingSignName) {
      // Bỏ qua dòng "(Chữ ký)"; dòng sau chức danh là họ tên người ký → giữ để in chân trang
      if (isSignPlaceholder(line)) continue;
      if (signerName === null && isPersonName(line)) signerName = line;
      pendingSignName = false;
    }
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
      paras.push(`<p style="text-align:center;margin:0 0 3pt;font-style:italic;">${mdInline(line)}</p>`);
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

  // Khối thể thức đầu trang — bảng 2 ô theo đúng 2 mẫu gốc
  const upper = i.upperOrgName ?? "ĐOÀN TNCS HỒ CHÍ MINH";
  const note = i.draftNote ?? "(Dự thảo)";
  const headerTable = bcct
    ? `<table style="width:100%;border:none;border-collapse:collapse;">
<tr>
  <td style="width:51%;border:none;text-align:center;">
    <p style="margin:0;font-size:11pt;font-weight:bold;">${esc(org)}</p>
    <p style="margin:0;font-size:11pt;">***</p>
    <p style="margin:0;font-size:11pt;font-weight:bold;font-style:italic;">${esc(note)}</p>
  </td>
  <td style="width:49%;border:none;text-align:right;vertical-align:top;">
    <p style="margin:0;font-size:15pt;font-weight:bold;">${esc(upper)}</p>
  </td>
</tr>
</table>`
    : `<table style="width:100%;border:none;border-collapse:collapse;">
<tr>
  <td style="width:41%;border:none;text-align:center;">
    <p style="margin:0;font-size:13pt;">${esc(org)}</p>
    <p style="margin:0;font-size:13pt;">***</p>
    <p style="margin:0;font-size:13pt;">Số: ${esc(i.docSymbol ?? "-BC/TĐTN")}</p>
    <p style="margin:0;font-size:12pt;font-style:italic;">${esc(note)}</p>
  </td>
  <td style="width:59%;border:none;text-align:center;">
    <p style="margin:0;font-size:13pt;font-weight:bold;">${esc(upper)}</p>
    <p style="margin:0;font-size:14pt;font-style:italic;">${esc(place)}, ${esc(vnDateStr(new Date()))}</p>
  </td>
</tr>
</table>`;

  const titlePt = bcct ? 15 : 11;
  const titleHtml = `<p style="text-align:center;margin:10pt 0 0;font-weight:bold;font-size:${titlePt}pt;">${esc(title)}</p>
${subtitles.map((s) => `<p style="text-align:center;margin:0;font-weight:bold;">${esc(s)}</p>`).join("\n")}
<p style="text-align:center;margin:0 0 6pt;">-----------</p>`;

  const nn = noiNhan ?? ["Ban Bí thư Trung ương Đoàn (để báo cáo);", "Thường trực Thành ủy (để báo cáo);", "Lưu VP."];
  const finalSignOrg = (signOrg ?? deriveSignOrg(org)).toUpperCase();
  const footer = `<table style="width:100%;border:none;border-collapse:collapse;margin-top:16pt;">
<tr>
  <td style="width:41%;border:none;vertical-align:top;">
    <p style="margin:0 0 2pt;font-size:12pt;font-weight:bold;font-style:italic;">Nơi nhận:</p>
    ${nn
      .map((r) => `<p style="margin:0 0 2pt;font-size:11pt;">- ${esc(r.startsWith("-") ? r.slice(1).trim() : r)}</p>`)
      .join("\n")}
  </td>
  <td style="width:59%;border:none;text-align:center;vertical-align:top;">
    <p style="margin:0;font-size:14pt;font-weight:bold;">${esc(finalSignOrg)}</p>
    <p style="margin:18pt 0;">&nbsp;</p>
    <p style="margin:0;font-weight:bold;">${esc((signTitle ?? i.signTitle ?? "BÍ THƯ").toUpperCase())}</p>
    ${signerName ? `<p style="margin:24pt 0 0;font-weight:bold;">${esc(signerName)}</p>` : ""}
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
  body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; }
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
