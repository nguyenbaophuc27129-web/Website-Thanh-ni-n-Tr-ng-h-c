/**
 * Quy tắc trả lời của trợ lý ảo TNTH (thuần, không gọi máy chủ).
 * - Dùng làm MẶC ĐỊNH trong API /api/ai/chat
 * - Dùng làm FALLBACK trong widget khi API không gọi được
 */

export interface ChatReply {
  text: string;
  link?: { href: string; label: string };
}

export function ruleReply(input: string): ChatReply {
  const q = input.toLowerCase();
  if (/(chào|hello|hi|xin chao)/.test(q))
    return { text: "Chào bạn! Mình là trợ lý ảo của Cổng Thanh niên Trường học. Bạn muốn tìm hiểu về tin tức, văn bản, bảng xếp hạng hay gửi phản ánh?" };
  if (/(nhiệm vụ|chỉ tiêu|deadline|hạn)/.test(q))
    return { text: "Nhiệm vụ thi đua được cấp trên giao kèm chỉ tiêu và hạn cuối. Đơn vị nhận nhiệm vụ sẽ thấy nhắc deadline D-7 và D-3 trong khu quản trị. Xem chi tiết trong khu quản trị mục 'Nhiệm vụ & chỉ tiêu'.", link: { href: "/dang-nhap", label: "Đăng nhập khu quản trị" } };
  if (/(xếp hạng|thi đua|điểm)/.test(q))
    return { text: "Bảng xếp hạng thi đua được chốt theo tháng/quý và công bố công khai, xếp theo tổng điểm bộ tiêu chí.", link: { href: "/bang-xep-hang", label: "Xem bảng xếp hạng" } };
  if (/(phản ánh|góp ý|khiếu nại|tra cứu)/.test(q))
    return { text: "Bạn có thể gửi phản ánh không cần đăng nhập. Sau khi gửi, hệ thống cấp mã tra cứu dạng PA-2026-XXXXX để theo dõi tiến độ xử lý.", link: { href: "/phan-anh", label: "Gửi phản ánh" } };
  if (/(văn bản|chỉ thị|nghị quyết|kế hoạch)/.test(q))
    return { text: "Văn bản chỉ đạo, kế hoạch của các cấp được gộp trong khu Tài nguyên — nhóm 'Tài nguyên văn bản'.", link: { href: "/tai-nguyen", label: "Xem tài nguyên văn bản" } };
  if (/(tài nguyên|biểu mẫu|tài liệu|tải)/.test(q))
    return { text: "Kho tài nguyên gồm 4 nhóm: thiết kế, văn bản, truyền thông và biểu mẫu — tải miễn phí.", link: { href: "/tai-nguyen", label: "Vào kho tài nguyên" } };
  if (/(tài khoản|đăng nhập|mật khẩu)/.test(q))
    return { text: "Mỗi đơn vị Đoàn có 1 tài khoản. Bản demo có 5 tài khoản mẫu: tw.admin, bd.province, hc.hiepthanh, thpt.chanhphu, btv.tw (mật khẩu demo123).", link: { href: "/dang-nhap", label: "Trang đăng nhập" } };
  if (/(tin|hoạt động|news)/.test(q))
    return { text: "Tin tức hoạt động từ các Đoàn trường, Đoàn phường được cập nhật liên tục.", link: { href: "/tin-tuc", label: "Xem tin tức" } };
  if (/(cảm ơn|thanks)/.test(q))
    return { text: "Rất vui được giúp bạn! Cần hỗ trợ thêm cứ nhắn mình nhé." };
  return { text: "Mình chưa hiểu rõ câu hỏi của bạn (đây là trợ lý giả lập bản demo). Bạn thử hỏi về: tin tức, nhiệm vụ thi đua, bảng xếp hạng, văn bản, phản ánh hoặc tài nguyên nhé!" };
}
