import type { ModerationResult } from "@/types";

/**
 * Bộ quy tắc kiểm duyệt dự phòng (diễn đàn, bài đóng góp, dự án…).
 * - Kết quả kiểm duyệt do MÁY CHỦ tính (src/lib/server/moderation.ts): gọi AI
 *   trước, AI lỗi / chưa có key thì dùng `ruleModerate` dưới đây.
 * - Trình duyệt không còn tự tính rồi gửi verdict lên — gửi kèm cũng bị bỏ qua.
 */

/** Phát ngôn chính trị phản động — chặn thẳng bằng quy tắc (không chờ AI) */
const REACTIONARY = [
  "phản động", "lật đổ", "chống đảng", "chống nhà nước", "xuyên tạc",
  "đảo chính", "phi tập trung hóa chính trị", "đa đảng là", "cộng sản sụp đổ",
  "chế độ cộng sản đói nghèo", "cách mạng tháng tám là", "hồ chí minh sai",
  // Phản động ngầm dạng "kinh tế": đề cao thị trường tự do / tư nhân như
  // ĐỘNG LỰC CHÍNH TRỊ, ngầm phủ nhận kinh tế nhà nước + định hướng XHCN
  "thị trường tự do", "động lực kinh tế chính trị", "tư nhân là động lực kinh tế chính trị",
  "kế hoạch hoá sản xuất", "kế hoạch hóa sản xuất",
];

const PROFANITY = [
  "địt", "đít", "lồn", "cặc", "buồi", "đũy", "đú", "vãi", "clgt", "dm ", "đm ",
  "dcm", "nitk", "mẹ mày", "mo má", "con chó", "thằng chó", "ngu như bò", "đần",
];

const BANNED_TOPICS = [
  "cá độ", "cờ bạc", "lô đề", "đánh đề", "vay nóng", "vay tiền nhanh",
  "ma túy", "thuốc lá điện tử", "vape", "cần sa", "heroin", "trâm cảm",
  "hacking", "hack like", "lừa đảo", "vi bằng", "súng", "dao bấm",
];

const SPAM_DOMAINS = [
  "bit.ly", "tinyurl", "t.me/joinchat", "wefinh", "gambino", "789bet", "f8bet",
  "hi88", "jun88", "shbet", "new88", "mb66", "qh88", "sunwin", "go88",
];

function includesAny(lower: string, words: string[]): string | null {
  for (const w of words) {
    if (lower.includes(w)) return w;
  }
  return null;
}

/**
 * Từ tục phải khớp NGUYÊN TỪ — so chuỗi con sẽ chặn nhầm từ thường
 * ("đú" trong "đúng", "lồn" trong "lồng").
 */
const escapeRe = (w: string) => w.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
const PROFANITY_RES = PROFANITY.map((w) => ({
  word: w.trim(),
  re: new RegExp("(?<![\\p{L}\\p{N}])" + escapeRe(w.trim()) + "(?![\\p{L}\\p{N}])", "u"),
}));

function profaneWord(lower: string): string | null {
  for (const { word, re } of PROFANITY_RES) {
    if (re.test(lower)) return word;
  }
  return null;
}

/** Bộ quy tắc heuristic thuần (pure) — first-match-wins, reason tiếng Việt */
export function ruleModerate(text: string): ModerationResult {
  const lower = ` ${text.toLowerCase()} `;

  // Chính trị phản động — mức nghiêm trọng nhất, chặn trước mọi quy tắc khác
  const reactionary = includesAny(lower, REACTIONARY);
  if (reactionary) {
    return { verdict: "FLAGGED", reason: "Nội dung chính trị nhạy cảm / chống phá (phát hiện từ khóa cấm)", model: "tnth-rule-v1" };
  }

  const profane = profaneWord(lower);
  if (profane) {
    return { verdict: "FLAGGED", reason: `Ngôn từ không phù hợp (phát hiện "${profane}")`, model: "tnth-rule-v1" };
  }

  const banned = includesAny(lower, BANNED_TOPICS);
  if (banned) {
    return { verdict: "FLAGGED", reason: `Nội dung nhạy cảm / cấm (phát hiện "${banned}")`, model: "tnth-rule-v1" };
  }

  // Số điện thoại: 09/08/03/05 + 8 chữ số
  if (/(?:^|\D)(09|08|03|05|07)\d{7,8}(?:\D|$)/.test(text)) {
    return { verdict: "FLAGGED", reason: "Có thể chứa số điện thoại cá nhân (chống lừa đảo)", model: "tnth-rule-v1" };
  }

  const domain = includesAny(lower, SPAM_DOMAINS);
  if (domain || /https?:\/\//i.test(text)) {
    return { verdict: "FLAGGED", reason: domain ? `Liên kết đáng ngờ (phát hiện "${domain}")` : "Chứa liên kết ngoài — cần kiểm duyệt", model: "tnth-rule-v1" };
  }

  // VIẾT HOA TOÀN BỘ ≥ 20 chữ cái
  const letters = text.replace(/[^a-zA-ZÀ-ỹ]/g, "");
  if (letters.length >= 20 && text === text.toUpperCase() && /[A-ZÀ-Ỹ]/.test(text)) {
    return { verdict: "FLAGGED", reason: "Nội dung viết hoa toàn bộ (spam)", model: "tnth-rule-v1" };
  }

  // Ký tự lặp vô nghĩa: "xeeeeee", "!!!!!!"
  if (/(.)\1{4,}/.test(text)) {
    return { verdict: "FLAGGED", reason: "Ký tự lặp bất thường (spam)", model: "tnth-rule-v1" };
  }

  // Từ lặp liên tiếp: "hay hay hay hay"
  if (/\b(\S{2,})(\s+\1){3,}\b/i.test(text)) {
    return { verdict: "FLAGGED", reason: "Nội dung lặp lồng lồng (spam)", model: "tnth-rule-v1" };
  }

  return { verdict: "CLEAN", model: "tnth-rule-v1" };
}
