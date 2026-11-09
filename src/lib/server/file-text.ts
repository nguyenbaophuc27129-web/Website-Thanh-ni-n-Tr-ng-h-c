/* ════════════════════════════════════════════════════════════════════
   TRÍCH VĂN BẢN THÔ TỪ FILE ĐÍNH KÈM (PDF / DOCX / TXT) — chạy server-side
   Nền dùng chung cho: route /api/ai/trich-van-ban + RAG doc-context.
   Giới hạn: PDF scan (ảnh) không có lớp chữ → trả text rỗng, caller
   phải hướng dẫn người dùng dán tay.
   ════════════════════════════════════════════════════════════════════ */

/** Trần ký tự trích ra từ 1 file — đủ cho phân tích/RAG, tránh phình prompt */
export const MAX_EXTRACT_CHARS = 60_000;

function decodeDataUrl(dataUrl: string): Buffer {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Buffer.from(base64, "base64");
}

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** Chuẩn hoá text trích ra: bỏ ký tự điều khiển, gộp dòng trống liên tiếp. */
function normalizeText(raw: string, cap: number): string {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > cap ? `${cleaned.slice(0, cap)}\n[…đã cắt do văn bản quá dài]` : cleaned;
}

/**
 * Trích text từ data URL (data:…;base64,…). Ném Error với thông điệp
 * tiếng Việt thân thiện khi định dạng không hỗ trợ.
 */
export async function extractTextFromDataUrl(
  fileName: string,
  dataUrl: string,
  capChars = MAX_EXTRACT_CHARS,
): Promise<string> {
  const ext = extOf(fileName);
  const buffer = decodeDataUrl(dataUrl);
  if (buffer.length === 0) throw new Error("Tệp rỗng hoặc dữ liệu base64 không hợp lệ.");

  if (ext === "txt" || ext === "md" || ext === "csv") {
    return normalizeText(buffer.toString("utf8"), capChars);
  }

  if (ext === "docx") {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ?? "";
    if (!text.trim()) throw new Error("Tệp Word không có nội dung chữ để trích.");
    return normalizeText(text, capChars);
  }

  if (ext === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join("\n") : text;
    if (!merged.trim()) {
      throw new Error(
        "PDF không có lớp chữ (có thể là file scan ảnh) — vui lòng dán nội dung văn bản bằng tay."
      );
    }
    return normalizeText(merged, capChars);
  }

  throw new Error(
    "Định dạng tệp chưa hỗ trợ — chỉ nhận .pdf, .docx, .txt. Với tệp .doc (Word cũ) hãy lưu lại thành .docx."
  );
}
