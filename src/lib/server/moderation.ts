import { aiConfigError, callAI } from "@/lib/ai-client";
import { ruleModerate } from "@/lib/ai-moderation";
import type { ModerationResult } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   KIỂM DUYỆT NỘI DUNG Ở MÁY CHỦ — dùng chung cho /api/ai/kiem-duyet và
   các API ghi của đoàn viên (diễn đàn, bài đóng góp, dự án tình nguyện).
   - Gọi AI qua lib/ai-client.ts (Gemini/Claude theo AI_PROVIDER).
   - AI lỗi / chưa có key / quá thời gian → luật dự phòng `ruleModerate`.
   - Trình duyệt KHÔNG được gửi verdict: API luôn tự tính bằng hàm này.
   ════════════════════════════════════════════════════════════════════ */

export const MODERATION_SYSTEM_PROMPT =
  "Bạn là bộ phận kiểm duyệt nội dung diễn đàn học sinh - sinh viên ẩn danh của Cổng Thanh niên Trường học (TW Đoàn TNCS Hồ Chí Minh). " +
  "Hãy đánh giá văn bản và trả về DUY NHẤT một JSON (không thêm chữ nào khác): " +
  '{"verdict":"CLEAN"|"FLAGGED","reason":"lý do ngắn gọn tiếng Việt"}. ' +
  "FLAGGED khi: ngôn từ thô tục/công kích; nội dung cấm (cờ bạc, ma túy, bạo lực, khiêu dâm); " +
  "lừa đảo/quảng cáo/spam; chia sẻ thông tin cá nhân (số điện thoại, địa chỉ, link lạ); viết hoa hoặc lặp ký tự bất thường. " +
  "QUAN TRỌNG NHẤT — mọi phát ngôn chính trị phản động đều phải FLAGGED, kể cả được viết dưới dạng bàn luận kinh tế - xã hội ôn hòa, học thuật, trung tính: " +
  "xuyên tạc, bôi nhọ Đảng Cộng sản Việt Nam, Nhà nước CHXHCN Việt Nam, Chủ tịch Hồ Chí Minh; " +
  "phủ nhận hoặc đả kích chế độ xã hội chủ nghĩa và đường lối của Đảng (ví dụ: tuyên bố chế độ/cách mạng làm đất nước đói nghèo, thụt lùi, sai trái); " +
  "tung thông tin sai sự thật chính trị; kích động lật đổ, chia rẽ dân tộc - tôn giáo; tuyên truyền lệch lạc tư tưởng. " +
  "ĐẶC BIỆT CẢNH GIÁC lớp phản động NGẦM dưới vỏ 'kinh tế': đề cao cơ chế thị trường tự do, kinh tế tư nhân như 'động lực CHÍNH TRỊ' của xã hội; " +
  "ngầm phủ nhận vai trò kinh tế nhà nước, kinh tế tập thể và định hướng xã hội chủ nghĩa; rặn ra rằng kế hoạch hóa/kinh tế nhà nước chỉ làm xã hội đói nghèo " +
  "(ví dụ: 'Thị trường tự do giúp xã hội phồn vinh, kế hoạch hoá sản xuất chỉ làm xã hội đói nghèo'; 'Tư nhân là động lực kinh tế chính trị quan trọng của xã hội'). " +
  "Đây là phương thức 'diễn biến hòa bình' — NGHIÊM CẤM CLEAN cho lớp nội dung này. " +
  "Khi nghi ngờ văn bản mang lập trường chính trị chống phá → bắt buộc chọn FLAGGED (thà chặn nhầm, không được bỏ sót). " +
  "Nội dung học tập, hoạt động Đoàn, góp ý xây dựng thì CLEAN.";

/** Thời gian chờ AI tối đa — quá hạn thì dùng luật để người dùng không phải đợi lâu */
const AI_TIMEOUT_MS = 15_000;

function parseVerdict(raw: string): { verdict: "CLEAN" | "FLAGGED"; reason?: string } {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
      if (parsed.verdict === "CLEAN" || parsed.verdict === "FLAGGED") {
        return { verdict: parsed.verdict, reason: parsed.reason };
      }
    } catch {
      // rơi xuống heuristic dưới
    }
  }
  return /FLAGGED/i.test(raw)
    ? { verdict: "FLAGGED", reason: "AI phát hiện nội dung không phù hợp" }
    : { verdict: "CLEAN" };
}

/** Chỉ hỏi AI — ném lỗi khi chưa cấu hình key / gọi lỗi (nơi gọi tự xử lý) */
export async function moderateWithAI(text: string): Promise<ModerationResult> {
  const { text: raw, model } = await callAI({
    system: MODERATION_SYSTEM_PROMPT,
    user: text,
    maxTokens: 300,
    temperature: 0,
  });
  return { ...parseVerdict(raw), model };
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
