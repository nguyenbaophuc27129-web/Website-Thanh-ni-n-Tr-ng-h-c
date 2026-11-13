import { buildDraftWordHtml } from "../.tmp-word.mjs";

const draft = [
  "BÁO CÁO",
  "kết quả công tác Đoàn và phong trào thanh thiếu nhi",
  "tuần từ ngày 06/10/2026 đến ngày 12/10/2026",
  "-----------",
  "",
  "Thực hiện Nghị quyết Đại hội Đoàn XIII, Ban Thường vụ Thành Đoàn báo cáo kết quả công tác tuần như sau:",
  "I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ",
  "1. Công tác tuyên truyền, giáo dục",
  "Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh: Ngày 11/10/2026 Đoàn phường tổ chức tủ sách.",
  "2. Phong trào tuổi trẻ tiên phong",
  "2.1. Tiên phong phát triển khoa học công nghệ",
  "- Ngày 10/10/2026 khởi động Tuần lễ Sinh viên thời đại số.",
  "IV. PHƯƠNG HƯỚNG TUẦN TỚI",
  "- Tiếp tục triển khai Tuần lễ.",
  "",
  "| STT | Chỉ tiêu | Kết quả |",
  "|---|---|---|",
  "| 01 | Chỉ tiêu 3 - Công trình thanh niên | 01 công trình |",
  "",
  "Nơi nhận:",
  "- Ban Bí thư Trung ương Đoàn (để báo cáo);",
  "- Lưu VP.",
  "TM. BAN THƯỜNG VỤ THÀNH ĐOÀN",
  "BÍ THƯ",
].join("\n");

const html = buildDraftWordHtml({ draft, orgUnitName: "BCH ĐOÀN TP. HỒ CHÍ MINH" });
const checks = [
  ["ĐOÀN TNCS HỒ CHÍ MINH", html.includes("ĐOÀN TNCS HỒ CHÍ MINH")],
  ["Số: -BC/TĐTN", html.includes("Số: -BC/TĐTN")],
  ["ngày italic 14pt", html.includes("font-size:14pt;font-style:italic")],
  ["title 11pt bold", html.includes("margin:10pt 0 0;font-weight:bold;font-size:11pt;")],
  ["không 16pt title", !html.includes("font-size:16pt")],
  ["không quốc hiệu nhà nước", !html.includes("Cộng hòa xã hội chủ nghĩa")],
  ["divider", html.includes("-----------")],
  ["heading I đậm indent 1cm", html.includes("text-indent:1cm;margin:3pt 0 3pt;font-weight:bold;")],
  ["mục 2.1 đậm nghiêng", html.includes('font-weight:bold;font-style:italic;">2.1. Tiên phong')],
  ["lead nghiêng", html.includes("<i>Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh:</i>")],
  ["bullet giữ nguyên", html.includes("- Ngày 10/10/2026 khởi động")],
  ["table 14pt", html.includes("font-size:14pt;")],
  ["Nơi nhận label 12pt bold italic", html.includes('font-size:12pt;font-weight:bold;font-style:italic;">Nơi nhận:')],
  ["TM từ draft", html.includes("TM. BAN THƯỜNG VỤ THÀNH ĐOÀN")],
  ["BÍ THƯ", html.includes(">BÍ THƯ<")],
  ["margin page 2-2-2-3", html.includes("margin: 2cm 2cm 2cm 3cm")],
  ["body 11pt", html.includes("font-size: 11pt")],
  ["title 1 lần", (html.match(/font-size:11pt;">BÁO CÁO</g) || []).length === 1],
  ["không trùng Nơi nhận", (html.match(/Nơi nhận:/g) || []).length === 1],
];
let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    fail++;
    console.log("FAIL", name);
  }
}
console.log(fail === 0 ? "SAMPLE1 OK - tat ca check pass" : fail + " checks FAILED");

// Kịch bản 2: BCCT Đại hội
const draft2 = [
  "BÁO CÁO CHÍNH TRỊ",
  "của Ban Chấp hành Trung ương Đoàn khóa XII",
  "-----------",
  "Tự hào, vững tin theo Đảng, tuổi trẻ Việt Nam",
  "xây hoài bão lớn, chung sức, đồng lòng, tiên phong",
  "Phần thứ nhất",
  "ĐÁNH GIÁ KẾT QUẢ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT ĐẠI HỘI XII",
  "I. Kết quả đạt được",
  "1. Công tác tuyên truyền, giáo dục",
  "1.1. Học tập và làm theo tư tưởng Hồ Chí Minh",
  "Các cấp bộ Đoàn đã có nhiều đổi mới về nội dung và phương thức tuyên truyền.",
].join("\n");
const html2 = buildDraftWordHtml({
  draft: draft2,
  orgUnitName: "BAN CHẤP HÀNH TRUNG ƯƠNG ĐOÀN",
  draftNote: "(Dự thảo lần 5)",
});
const checks2 = [
  ["bcct title 15pt", html2.includes('font-size:15pt;">BÁO CÁO CHÍNH TRỊ')],
  ["quốc hiệu 15pt căn phải", html2.includes("text-align:right;vertical-align:top;")],
  ["note dự thảo bold italic", html2.includes('font-weight:bold;font-style:italic;">(Dự thảo lần 5)')],
  ["không dòng Số:", !html2.includes("Số: -BC/TĐTN")],
  ["không dòng ngày", !html2.includes("font-size:14pt;font-style:italic")],
  ["khẩu hiệu đậm giữa", html2.includes('font-weight:bold;">Tự hào, vững tin theo Đảng')],
  ["Phần thứ giữa đậm", html2.includes('text-align:center;margin:3pt 0 3pt;font-weight:bold;">Phần thứ nhất')],
  ["caps sau Phần thứ đậm giữa", html2.includes('font-weight:bold;">ĐÁNH GIÁ KẾT QUẢ')],
  ["indent 1.25cm body", html2.includes("text-indent:1.25cm;margin:3pt 0 1pt;")],
  ["mục 1.1 đậm nghiêng", html2.includes('font-style:italic;">1.1. Học tập')],
  ["signOrg suy ra TW", html2.includes("TM. BAN CHẤP HÀNH TRUNG ƯƠNG ĐOÀN")],
  ["nơi nhận fallback", html2.includes("Ban Bí thư Trung ương Đoàn")],
];
let f2 = 0;
for (const [name, ok] of checks2) {
  if (!ok) {
    f2++;
    console.log("FAIL2", name);
  }
}
console.log(f2 === 0 ? "BCCT OK - tat ca check pass" : f2 + " checks FAILED");
