/* ════════════════════════════════════════════════════════════════════
   SẠCH ĐẦU RA AI — KHÔNG BAO GIỜ HIỆN KÝ TỰ "*" (markdown thô)
   ════════════════════════════════════════════════════════════════════
   Áp SERVER-SIDE ở mọi route trả văn bản cho người dùng (chat, tro-ly,
   nhap-bao-cao, chinh-bao-cao). Văn bản hành chính Đoàn giữ nguyên dòng
   và chữ in-hoa, không markdown: **đậm** → đậm, ### tiêu đề → tiêu đề,
   gạch đầu dòng -/* → "– ", xoá mọi dấu * rời còn sót.
   ════════════════════════════════════════════════════════════════════ */

export function cleanAiText(raw: string): string {
  let text = raw ?? "";

  // Bóc fence ```...``` (giữ nội dung bên trong)
  text = text.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

  // Heading markdown "### Tiêu đề" → chỉ còn chữ tiêu đề
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Đậm/nghiêng: **x** → x, __x__ → x, rồi *x* → x
  text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  text = text.replace(/__([^_\n]+)__/g, "$1");
  text = text.replace(/\*([^*\n]+)\*/g, "$1");

  // Gạch đầu dòng markdown "- "/"* " đầu dòng → gạch ngang tiếng Việt
  text = text.replace(/^\s*[-*]\s+/gm, "– ");
  text = text.replace(/^\s*\+\s+/gm, "– ");

  // Dấu * rời còn sót (số nhân, in đậm gãy…) — xoá hẳn
  text = text.replace(/\*/g, "");

  // Gộp dòng trống liên tiếp và trim hai đầu
  text = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}
