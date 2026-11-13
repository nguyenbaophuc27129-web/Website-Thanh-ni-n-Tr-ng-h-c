import { NextRequest, NextResponse } from "next/server";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { EMPTY_SECTION_SENTENCE, MO_DAU_PREFIX, NV_GROUPS } from "@/data/bao-cao-agent";
import { SKILL_THE_THUC_29HD } from "@/data/the-thuc-van-ban";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   "CHỈNH SỬA BẢN NHÁP BÁO CÁO BẰNG AI" — chat chỉnh nháp 1 lượt
   ════════════════════════════════════════════════════════════════════
   Cấu trúc prompt tuân thủ nghiêm ngặt chỉ đạo:
   1. TRÊN ĐẦU:
      - [YÊU CẦU CHỈNH SỬA CỦA CÁN BỘ / NGƯỜI DÙNG] (Prompt)
      - [BẢN NHÁP HIỆN TẠI CẦN BIÊN TẬP] (Nội dung)
   2. XUỐNG DƯỚI CÙNG:
      - [BỘ KỸ NĂNG THỂ THỨC VĂN BẢN ĐOÀN 100% THEO HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 3]
        (Học đúng 100% thể thức từ A -> Z, từ cách trình bày tới từng dấu gạch,
         dấu ba sao, tiêu đề, số ký hiệu, ngày tháng, thụt dòng, nơi nhận, chữ ký)
   ════════════════════════════════════════════════════════════════════ */

const EDIT_SYSTEM_PROMPT = [
  "Bạn là biên tập viên văn bản hành chính cao cấp của Đoàn TNCS Hồ Chí Minh.",
  "Nhiệm vụ: Tiếp nhận bản nháp văn bản/báo cáo và yêu cầu chỉnh sửa của cán bộ, sau đó xuất ra TOÀN BỘ bản báo cáo ĐÃ CHỈNH SỬA HOÀN CHỈNH.",
  "YÊU CẦU CHÍNH TRỊ - HÀNH CHÍNH BẮT BUỘC:",
  "- Giữ nguyên 100% các dữ kiện, con số, chỉ tiêu có trong bản nháp (không tự ý thêm, không tự xoá, không làm tròn số).",
  "- Tuân thủ tuyệt đối văn phong hành chính chính trị của Đoàn TNCS Hồ Chí Minh.",
  "- Định dạng plain-text thuần: TUYỆT ĐỐI KHÔNG dùng markdown (#, ##, **, *), KHÔNG dùng bảng markdown; gạch đầu dòng dùng duy nhất '- '.",
  "- Chỉ trả về duy nhất toàn văn bản báo cáo đã chỉnh, không thêm lời chào, không giải thích.",
].join("\n");

async function editWithAI(content: string, instruction: string): Promise<{ content: string; model: string }> {
  // CẤU TRÚC PROMPT: Prompt & Nội dung ở TRÊN ĐẦU — Skill thể thức 29-HD ở DƯỚI CÙNG
  const user = [
    "════════════════════════════════════════════════════════════════",
    "[YÊU CẦU CHỈNH SỬA CỦA CÁN BỘ / NGƯỜI DÙNG — PROMPT CHÍNH]",
    instruction,
    "",
    "════════════════════════════════════════════════════════════════",
    "[BẢN NHÁP HIỆN TẠI — NỘI DUNG ĐẦU VÀO CẦN BIÊN TẬP]",
    content,
    "",
    "════════════════════════════════════════════════════════════════",
    "[BỘ KỸ NĂNG & QUY CHUẨN THỂ THỨC VĂN BẢN ĐOÀN — CHUẨN 100% HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 3]",
    "Văn bản báo cáo xuất ra phải tuân thủ nghiêm ngặt 100% từng dóng gạch, dấu phân cách, căn lề và thể thức đề ký sau đây:",
    SKILL_THE_THUC_29HD,
    "",
    "KHUNG ĐỀ CƯƠNG BÁO CÁO ĐOÀN CẦN BẢO TOÀN KHI BIÊN TẬP:",
    "- Khối thể thức đầu văn bản (bảng 2 ô): Ô trái (Cơ quan ban hành + *** + Số: ...-BC/...), Ô phải (ĐOÀN TNCS HỒ CHÍ MINH có đường kẻ ngang bằng độ dài chữ + địa danh ngày tháng nghiêng).",
    "- Tiêu đề 3 dòng canh giữa: BÁO CÁO (in hoa đứng đậm) / kết quả công tác Đoàn và phong trào thanh thiếu nhi / thời gian kỳ báo cáo, dưới có đường kẻ ngang nét rời '-----------'.",
    `- Câu mở đầu bắt đầu "${MO_DAU_PREFIX}" … như sau:`,
    "- Phần I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP gồm đủ 06 mục lớn đúng thứ tự: " +
      NV_GROUPS.map((g) => `${g.num}. ${g.title}`).join("; ") +
      ". Mục 1, 5, 6 viết thành đoạn mở đầu bằng nhãn nội dung (không số hiệu); mục 2, 3, 4 dùng tiểu mục có số hiệu (2.1., …) với mỗi hoạt động một gạch đầu dòng '- '. Mục lớn không có hoạt động giữ câu \"" +
      EMPTY_SECTION_SENTENCE +
      "\".",
    "- Phần II. KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031 (dạng bảng: STT | chỉ tiêu, nhiệm vụ đột phá | kết quả trong kỳ).",
    "- Phần III. ĐÁNH GIÁ CHUNG (Ưu điểm: / Hạn chế:).",
    "- Phần IV. PHƯƠNG HƯỚNG … TỚI (TỪ NGÀY … ĐẾN NGÀY …).",
    "- Phần V. ĐỀ XUẤT, KIẾN NGHỊ (chỉ có khi bản nháp có đề xuất, nếu không có thì bỏ hẳn phần V).",
    "- Khối kết: Cột trái 'Nơi nhận:' (chữ Nơi nhận đậm, danh sách có '- ' và ';', dòng lưu cuối có dấu '.'); Cột phải 'TM. BAN CHẤP HÀNH...' / chức danh 'BÍ THƯ' / để trống chỗ ký và họ tên.",
    "",
    "HÃY XUẤT TOÀN VĂN BẢN BÁO CÁO ĐÃ BIÊN TẬP HOÀN CHỈNH:",
  ].join("\n");

  const { text, model } = await callAI({
    system: EDIT_SYSTEM_PROMPT,
    user,
    maxTokens: 8000,
    temperature: 0.15,
  });
  return { content: cleanAiText(text), model };
}

/** POST /api/ai/chinh-bao-cao — { content, instruction } → { ok, content, model } */
export async function POST(request: NextRequest) {
  // Chỉ cán bộ + giới hạn lượt theo tài khoản và trần AI chung
  const gate = await guardRequest(request, {
    access: "staff",
    bucket: "ai-chinh-bao-cao",
    windowMs: 10 * 60_000,
    perAccount: 20,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as
    | { content?: string; instruction?: string }
    | null;
  const content = payload?.content?.trim() ?? "";
  const instruction = payload?.instruction?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ ok: false, error: "Chưa có bản nháp để chỉnh sửa." }, { status: 400 });
  }
  if (!instruction) {
    return NextResponse.json({ ok: false, error: "Nhập yêu cầu chỉnh sửa." }, { status: 400 });
  }
  if (content.length > 24_000 || instruction.length > 500) {
    return NextResponse.json({ ok: false, error: "Nội dung hoặc yêu cầu quá dài." }, { status: 413 });
  }

  try {
    const { content: edited, model } = await editWithAI(content, instruction);
    if (!edited) throw new Error("AI trả về nội dung rỗng");
    return NextResponse.json({ ok: true, content: edited, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Chỉnh báo cáo thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
