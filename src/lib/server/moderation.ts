import { aiConfigError } from "@/lib/ai-client";
import { moderateWithAI as moderateWithAIShared } from "@/lib/server/moderation-prompt";
import { ruleModerate } from "@/lib/ai-moderation";
import type { ModerationResult } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   KIỂM DUYỆT NỘI DUNG Ở MÁY CHỦ — dùng chung cho /api/ai/kiem-duyet và
   các API ghi của đoàn viên (diễn đàn, bài đóng góp, dự án tình nguyện).
   - Gọi AI qua lib/ai-client.ts (Gemini/Claude theo AI_PROVIDER).
   - AI lỗi / chưa có key / quá thời gian → luật dự phòng `ruleModerate`.
   - Trình duyệt KHÔNG được gửi verdict: API luôn tự tính bằng hàm này.
   ════════════════════════════════════════════════════════════════════ */

/** Thời gian chờ AI tối đa — quá hạn thì dùng luật để người dùng không phải đợi lâu */
const AI_TIMEOUT_MS = 15_000;

/** Chỉ hỏi AI — ném lỗi khi chưa cấu hình key / gọi lỗi (nơi gọi tự xử lý).
 *  Lời nhắc + schema + phân tích kết quả: một bản duy nhất ở moderation-prompt.ts */
export async function moderateWithAI(text: string): Promise<ModerationResult> {
  return moderateWithAIShared(text);
}

/** Kiểm duyệt dùng cho API ghi: AI trước, lỗi thì luật dự phòng — không bao giờ ném lỗi */
export async function moderateServer(text: string): Promise<ModerationResult> {
  // Chưa cấu hình AI → dùng luật luôn, không ghi log mỗi lần
  if (aiConfigError()) return ruleModerate(text);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS);
    });
    return await Promise.race([moderateWithAI(text), timeout]);
  } catch (err) {
    console.warn("[TNTH][AI] Kiểm duyệt AI lỗi, dùng luật dự phòng:", err instanceof Error ? err.message : err);
    return ruleModerate(text);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
