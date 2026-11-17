/* ════════════════════════════════════════════════════════════════════
   SẠCH ĐẦU RA AI — KHÔNG BAO GIỜ HIỆN KÝ TỰ "*" (markdown thô)
   ════════════════════════════════════════════════════════════════════
   Áp SERVER-SIDE ở mọi route trả văn bản cho người dùng (chat, tro-ly,
   nhap-bao-cao, chinh-bao-cao). Văn bản hành chính Đoàn giữ nguyên dòng
   và chữ in-hoa, không markdown: **đậm** → đậm, ### tiêu đề → tiêu đề,
   gạch đầu dòng (dấu gạch, sao, cộng) → "- " (gạch nối theo 29-HD, kể cả dòng Nơi nhận), xoá mọi dấu * rời còn sót.
   ════════════════════════════════════════════════════════════════════ */

export function cleanAiText(raw: string): string {
  let text = raw ?? "";

  // Bóc fence ```...``` (giữ nội dung bên trong)
  text = text.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

  // Thẻ HTML AI tự chèn (<b>, <u>, <br>, <p>…) — văn bản hành chính là chữ thuần, thẻ sẽ hiện nguyên văn trong Word
  text = stripHtmlTags(text);

  // Heading markdown "### Tiêu đề" → chỉ còn chữ tiêu đề
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Đậm/nghiêng: **x** → x, __x__ → x, rồi *x* → x
  text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  text = text.replace(/__([^_\n]+)__/g, "$1");
  text = text.replace(/\*([^*\n]+)\*/g, "$1");

  // Gạch đầu dòng markdown "- "/"* "/"+ " đầu dòng → "- " (29-HD: gạch đầu dòng và Nơi nhận dùng dấu gạch nối)
  text = text.replace(/^\s*[-*+–]\s+/gm, "- ");

  // Dấu * rời còn sót (số nhân, in đậm gãy…) — xoá hẳn
  text = text.replace(/\*/g, "");

  // Gộp dòng trống liên tiếp và trim hai đầu
  text = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

/**
 * Gỡ thẻ HTML khỏi văn bản AI: <br>, </p>, </div>, </li>, </tr> → xuống dòng; thẻ khác (<b>, <u>, <i>, <strong>…) bỏ đi;
 * giải mã vài thực thể thường gặp. Chỉ khớp "<" ngay trước chữ cái hoặc "/" nên không đụng "< 10", "<=".
 */
export function stripHtmlTags(raw: string): string {
  return (raw ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}
