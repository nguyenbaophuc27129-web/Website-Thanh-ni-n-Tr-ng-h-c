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
