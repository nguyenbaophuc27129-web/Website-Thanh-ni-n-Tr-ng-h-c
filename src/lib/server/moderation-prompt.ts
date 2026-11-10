import { callAI } from "@/lib/ai-client";

/* ══════════════════════════════════════════════════════════════════════
   PROMPT KIỂM DUYỆT DÙNG CHUNG (SERVER-ONLY)
   Trước đây bị nhân bản ở 2 nơi: /api/ai/kiem-duyet và lib/server/binh-chon.
   Giờ chỉ giữ 1 bản duy nhất — sửa nội dung kiểm duyệt ở đây là cả hệ
   thống (diễn đàn ẩn danh + bình chọn HS3T + bình chọn Đoàn trường) cùng
   áp dụng. Key AI nằm 100% phía BE (env), không bao giờ xuống client.
   ══════════════════════════════════════════════════════════════════════ */

export const MODERATE_SYSTEM_PROMPT =
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

/** Schema thống nhất — ép AI trả đúng cấu trúc (Gemini responseSchema / Claude prompt-lock) */
export const VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["CLEAN", "FLAGGED"] },
    reason: { type: "STRING" },
  },
  required: ["verdict", "reason"],
  propertyOrdering: ["verdict", "reason"],
};

export function parseVerdict(raw: string): { verdict: "CLEAN" | "FLAGGED"; reason?: string } {
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

/** Gọi AI kiểm duyệt (key BE-only); caller tự fallback rule khi throw. */
export async function moderateWithAI(text: string): Promise<{ verdict: "CLEAN" | "FLAGGED"; reason?: string; model?: string }> {
  const { text: raw, model } = await callAI({
    system: MODERATE_SYSTEM_PROMPT,
    user: text,
    maxTokens: 300,
    temperature: 0,
    json: true,
    jsonSchema: VERDICT_SCHEMA,
  });
  return { ...parseVerdict(raw), model };
}
