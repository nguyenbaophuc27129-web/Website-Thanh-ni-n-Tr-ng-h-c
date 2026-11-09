import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { callAI } from "@/lib/ai-client";
import { cleanAiText } from "@/lib/ai-text";
import { EMPTY_SECTION_SENTENCE, MO_DAU_PREFIX, NV_GROUPS } from "@/data/bao-cao-agent";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   "CHỈNH SỬA BẢN NHÁP BÁO CÁO BẰNG AI" — chat chỉnh nháp 1 lượt
   ════════════════════════════════════════════════════════════════════
   Body: { content, instruction } → { ok, content } (bản đã chỉnh).
   Quy tắc: giữ KHUNG ĐỀ CƯƠNG theo đặc tả agent báo cáo (06 mục lớn
   NV1-NV6, số hiệu tiểu mục, phần II/III/IV, Nơi nhận, chỗ ký để trống)
   + toàn bộ số liệu gốc; chỉ biên tập theo yêu cầu; KHÔNG markdown.
   ════════════════════════════════════════════════════════════════════ */

const EDIT_SYSTEM_PROMPT =
  "Bạn là biên tập viên văn bản của Đoàn TNCS Hồ Chí Minh. Người dùng gửi bạn 1 bản nháp báo cáo đang theo KHUNG ĐỀ CƯƠNG đặc tả agent báo cáo " +
  "công tác Đoàn nhiệm kỳ 2026 - 2031 cùng 1 yêu cầu chỉnh sửa. Hãy trả về TOÀN BỘ bản báo cáo ĐÃ CHỈNH theo đúng yêu cầu.\n" +
  "KHUNG phải GIỮ NGUYÊN khi chỉnh (trừ khi yêu cầu là sửa chính phần đó):\n" +
  "- Khối thể thức (ĐOÀN TNCS HỒ CHÍ MINH / Ban Chấp hành Đoàn + tên đơn vị, Số: …-BC-…, địa danh ngày tháng năm) và tên báo cáo 3 dòng (BÁO CÁO / kết quả công tác Đoàn và phong trào thanh thiếu nhi / tên kỳ từ ngày … đến ngày …).\n" +
  `- Câu mở đầu bắt đầu "${MO_DAU_PREFIX}" … như sau:\n` +
  "- Phần I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP gồm đủ 06 mục lớn đúng thứ tự: " +
  NV_GROUPS.map((g) => `${g.num}. ${g.title}`).join("; ") +
  ". Mục 1, 5, 6 viết thành đoạn mở đầu bằng nhãn nội dung (không số hiệu); mục 2, 3, 4 dùng tiểu mục có số hiệu (2.1., …) với mỗi hoạt động một gạch đầu dòng. Mục lớn không có hoạt động giữ câu \"" + EMPTY_SECTION_SENTENCE + "\".\n" +
  "- Phần II. KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031 (bảng STT | chỉ tiêu, nhiệm vụ đột phá | kết quả trong kỳ).\n" +
  "- Phần III. ĐÁNH GIÁ CHUNG (Ưu điểm: / Hạn chế:), phần IV. PHƯƠNG HƯỚNG … TỚI, phần V. ĐỀ XUẤT, KIẾN NGHỊ (nếu có), Nơi nhận + TM. … + BÍ THƯ + chỗ ký để trống họ tên.\n" +
  "Bắt buộc: GIỮ nguyên mọi con số và số liệu có sẵn (không tự thêm, không tự xoá, không làm tròn), chỉ biên tập đúng yêu cầu; " +
  "không dùng tính từ cảm xúc; mỗi hoạt động vẫn ở đúng mục, không lặp. " +
  "Viết plain-text thuần: KHÔNG markdown, KHÔNG dấu *, KHÔNG ký tự #; gạch đầu dòng dùng '- '. Trả duy nhất nội dung báo cáo, không giải thích.";

async function editWithAI(content: string, instruction: string): Promise<{ content: string; model: string }> {
  const user = [
    "[YÊU CẦU CHỈNH SỬA]",
    instruction,
    "",
    "[BẢN NHÁP HIỆN TẠI]",
    content,
  ].join("\n");
  const { text, model } = await callAI({
    system: EDIT_SYSTEM_PROMPT,
    user,
    maxTokens: 6000,
    temperature: 0.2,
  });
  return { content: cleanAiText(text), model };
}

/** POST /api/ai/chinh-bao-cao — { content, instruction } → { ok, content, model } */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session = null;
  if (token) {
    try {
      session = await sessionFromToken(token);
    } catch {
      session = null;
    }
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để dùng chức năng này." }, { status: 401 });
  }
  if (session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "Chức năng dành cho cán bộ quản trị." }, { status: 403 });
  }

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
