import type { Feedback, FeedbackMessage } from "@/types";

export const feedbacks: Feedback[] = [
  {
    id: 1, trackingCode: "PA-2026-000101", senderName: "Nguyễn Thị Hồng Nhung",
    senderEmail: "nhungnt@gmail.com", senderPhone: "0905123456",
    senderOrgText: "Liên chi đoàn Trường THCS Nguyễn Trãi, TP Thủ Dầu Một",
    feedbackTopicId: 2, title: "Đề nghị gia hạn deadline nhiệm vụ tin bài tháng 9",
    content: "Đoàn trường đang bận tổ chức khai giảng và hội thi ATGT nên chưa kịp đăng đủ 7 bài tin. Đề nghị Đoàn phường gia hạn thêm 10 ngày để chúng tôi hoàn thành chỉ tiêu II.1.",
    status: "IN_PROGRESS", assignedAccountId: 4, submittedAt: "2026-09-18T03:00:00Z",
  },
  {
    id: 2, trackingCode: "PA-2026-000102", senderName: "Trần Văn Phúc",
    senderEmail: "phuctv@bd.edu.vn", senderPhone: "0918123456",
    senderOrgText: "Đoàn Trường THPT An Bình",
    feedbackTopicId: 4, title: "Không cập nhật được link minh chứng TikTok",
    content: "Khi dán link TikTok vào hoạt động, hệ thống báo lỗi không hợp lệ dù link vẫn hoạt động bình thường bên ngoài. Mong ban quản trị kiểm tra.",
    status: "RESOLVED", assignedAccountId: 1, submittedAt: "2026-09-15T04:20:00Z",
  },
  {
    id: 3, trackingCode: "PA-2026-000103", senderName: "Lê Minh Châu",
    senderEmail: "chaule@gmail.com", senderPhone: "0356123456",
    senderOrgText: "Học sinh lớp 12A5, Trường THPT Chánh Phú Hưng",
    feedbackTopicId: 3, title: "Góp ý về cách tính điểm tiêu chí truyền thông",
    content: "Em cho rằng tiêu chí II.1 nên tính theo chất lượng bài (được chọn tin nổi bật) chứ không chỉ số lượng bài đăng. Nhiều chi đoàn đăng bài số lượng nhưng nội dung mỏng.",
    status: "NEW", submittedAt: "2026-09-21T07:30:00Z",
  },
  {
    id: 4, trackingCode: "PA-2026-000104", senderName: "Phạm Thị Kim Loan",
    senderEmail: "kimloan.ph@gmail.com", senderPhone: "0977123456",
    senderOrgText: "Phụ huynh học sinh Trường Tiểu học Kim Đồng",
    feedbackTopicId: 1, title: "Đề nghị tổ chức thêm sân chơi cuối tuần cho thiếu nhi",
    content: "Gia đình tôi rất mong Đoàn phường duy trì sân chơi cuối tuần tại công viên phường, trẻ em trong khu phố tham gia rất hào hứng trong 2 lần trước.",
    status: "CLOSED", assignedAccountId: 4, submittedAt: "2026-08-30T02:00:00Z",
  },
  {
    id: 5, trackingCode: "PA-2026-000105", senderName: "Hoàng Văn Đạt",
    senderEmail: "dathv@bg.edu.vn", senderPhone: "0962123456",
    senderOrgText: "Đoàn Trường THPT Bắc Giang",
    feedbackTopicId: 5, title: "Tài khoản đơn vị bị khóa do nhập sai mật khẩu",
    content: "Tài khoản thpt.bacgiang bị khóa sau nhiều lần nhập sai. Đề nghị hỗ trợ mở khóa và đặt lại mật khẩu qua email đã đăng ký.",
    status: "IN_PROGRESS", assignedAccountId: 1, submittedAt: "2026-09-20T05:00:00Z",
  },
  {
    id: 6, trackingCode: "PA-2026-000106", senderName: "Vũ Thanh Hải",
    senderEmail: "haivu@gmail.com",
    senderOrgText: "Đoàn viên Đoàn phường Vinh, Nghệ An",
    feedbackTopicId: 6, title: "Đề nghị bổ sung danh mục chuyên mục tin bài",
    content: "Danh mục hiện thiếu chuyên mục 'Khởi nghiệp - việc làm' trong khi sinh viên rất quan tâm mảng này.",
    status: "RESOLVED", assignedAccountId: 2, submittedAt: "2026-09-10T03:40:00Z",
  },
];

export const feedbackMessages: FeedbackMessage[] = [
  { id: 1, feedbackId: 1, senderType: "STAFF", senderName: "Lê Quốc Hùng", content: "Chào bạn, Đoàn phường đã nhận được kiến nghị. Chúng tôi sẽ lấy ý kiến cấp trên và phản hồi trong 3 ngày làm việc.", isInternalNote: false, sentAt: "2026-09-18T06:00:00Z" },
  { id: 2, feedbackId: 1, senderType: "STAFF", senderName: "Lê Quốc Hùng", content: "(Nội bộ) Cần tham mưu Tỉnh Đoàn xem có thể dịch deadline chỉ tiêu II.1 không, vì ảnh hưởng điểm chung của phường.", isInternalNote: true, sentAt: "2026-09-18T06:05:00Z" },
  { id: 3, feedbackId: 2, senderType: "STAFF", senderName: "Nguyễn Văn Toàn", content: "Lỗi đã được khắc phục vào 17/9. Bạn vui lòng thử lại và phản hồi nếu còn sự cố.", isInternalNote: false, sentAt: "2026-09-17T02:00:00Z" },
  { id: 4, feedbackId: 2, senderType: "CITIZEN", senderName: "Trần Văn Phúc", content: "Cảm ơn ban quản trị, mình đã cập nhật được link bình thường.", isInternalNote: false, sentAt: "2026-09-17T08:30:00Z" },
  { id: 5, feedbackId: 4, senderType: "STAFF", senderName: "Lê Quốc Hùng", content: "Sân chơi cuối tuần sẽ được duy trì định kỳ từ tháng 10. Đoàn phường cảm ơn góp ý của gia đình.", isInternalNote: false, sentAt: "2026-09-02T02:00:00Z" },
  { id: 6, feedbackId: 4, senderType: "STAFF", senderName: "Lê Quốc Hùng", content: "(Nội bộ) Đã chốt kinh phí xã hội hóa với doanh nghiệp đồng hành, thông báo rộng rãi trên fanpage phường.", isInternalNote: true, sentAt: "2026-09-02T02:10:00Z" },
  { id: 7, feedbackId: 5, senderType: "STAFF", senderName: "Nguyễn Văn Toàn", content: "Ban quản trị đã mở khóa tài khoản và gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.", isInternalNote: false, sentAt: "2026-09-20T07:00:00Z" },
  { id: 8, feedbackId: 6, senderType: "STAFF", senderName: "Võ Ngọc Lan", content: "Chuyên mục 'Khởi nghiệp - việc làm' đã được bổ sung trong danh mục nội dung. Cảm ơn đề xuất của bạn.", isInternalNote: false, sentAt: "2026-09-12T02:00:00Z" },
];
