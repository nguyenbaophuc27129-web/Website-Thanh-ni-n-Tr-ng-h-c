import type { ModerationResult } from "@/types";

/**
 * Kiểm duyệt nội dung Diễn đàn ẩn danh.
 * - Client luôn gọi `moderateText` → POST /api/ai/kiem-duyet.
 * - API lỗi (chưa nối key AI, mạng…) → fallback `ruleModerate` cục bộ để
 *   demo không bao giờ gãy (cùng pattern với ai-chat-widget).
 */

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

/** Bộ quy tắc heuristic thuần (pure) — first-match-wins, reason tiếng Việt */
export function ruleModerate(text: string): ModerationResult {
  const lower = ` ${text.toLowerCase()} `;

  const profane = includesAny(lower, PROFANITY);
  if (profane) {
    return { verdict: "FLAGGED", reason: `Ngôn từ không phù hợp (phát hiện "${profane.trim()}")`, model: "tnth-rule-v1" };
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

/**
 * Gọi API kiểm duyệt (máy chủ); lỗi → fallback quy tắc cục bộ.
 * Đảm bảo tối thiểu `minDelay` ms để giao diện không nhấp nháy.
 */
export async function moderateText(text: string, minDelay = 800): Promise<ModerationResult> {
  const started = Date.now();
  let result: ModerationResult;
  try {
    const res = await fetch("/api/ai/kiem-duyet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; verdict?: ModerationResult["verdict"]; reason?: string; model?: string }
      | null;
    if (!res.ok || !data?.ok || !data.verdict) throw new Error(data?.reason ?? `HTTP ${res.status}`);
    result = { verdict: data.verdict, reason: data.reason, model: data.model };
  } catch {
    result = ruleModerate(text);
  }
  const elapsed = Date.now() - started;
  if (elapsed < minDelay) await new Promise((r) => setTimeout(r, minDelay - elapsed));
  return result;
}
