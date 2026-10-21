import type { QuizQuestion } from "@/types";

/**
 * Ngân hàng câu hỏi thi trực tuyến — 24 câu đủ 7 dạng × 3 độ khó (+3 câu bù pool).
 * Điểm theo độ khó: EASY 5 · MEDIUM 10 · HARD 15.
 */
export const quizQuestions: QuizQuestion[] = [
  /* ---- MCQ 1 đáp án ---- */
  {
    id: 801, topic: "Đoàn TNCS HCM", difficulty: "EASY", type: "MCQ_SINGLE", points: 5,
    stem: "Ngày thành lập Đoàn TNCS Hồ Chí Minh là ngày nào?",
    options: ["26/3/1931", "26/3/1934", "28/3/1931", "26/4/1931"],
    correctIndexes: [0],
  },
  {
    id: 802, topic: "An toàn giao thông", difficulty: "EASY", type: "MCQ_SINGLE", points: 5,
    stem: "Khi đi bộ qua đường có đèn tín hiệu, đèn đỏ có ý nghĩa gì?",
    options: ["Được đi nhanh", "Phải dừng lại", "Đi chéo góc", "Không có ý nghĩa"],
    correctIndexes: [1],
  },
  {
    id: 803, topic: "Kỹ năng số", difficulty: "MEDIUM", type: "MCQ_SINGLE", points: 10,
    stem: "Xác thực hai lớp (2FA) giúp bảo vệ tài khoản bằng cách nào?",
    options: [
      "Đặt mật khẩu dài hơn",
      "Yêu cầu thêm một bước xác nhận riêng ngoài mật khẩu",
      "Đổi mật khẩu mỗi tuần",
      "Ẩn địa chỉ email của bạn",
    ],
    correctIndexes: [1],
  },
  {
    id: 804, topic: "Kỹ năng số", difficulty: "HARD", type: "MCQ_SINGLE", points: 15,
    stem: "Điều nào sau đây là dấu hiệu điển hình của thư lừa đảo (phishing)?",
    options: [
      "Email gửi từ tên miền nội bộ trường, đúng chính tả",
      "Yêu cầu gấp gáp nhập mật khẩu qua đường link lạ",
      "Thông báo lịch sinh hoạt Đoàn định kỳ",
      "Bản tin học tập có đính kèm tài liệu .pdf của trường",
    ],
    correctIndexes: [1],
  },
  /* ---- MCQ nhiều đáp án ---- */
  {
    id: 805, topic: "Kỹ năng số", difficulty: "EASY", type: "MCQ_MULTI", points: 5,
    stem: "Những thông tin nào KHÔNG nên đăng công khai lên mạng xã hội? (chọn nhiều)",
    options: ["Số điện thoại cá nhân", "Tên trường đang học", "Mã CMND/CCCD", "Sở thích âm nhạc"],
    correctIndexes: [0, 2],
  },
  {
    id: 806, topic: "An toàn giao thông", difficulty: "MEDIUM", type: "MCQ_MULTI", points: 10,
    stem: "Người đi xe máy phải thực hiện những điều nào? (chọn nhiều)",
    options: [
      "Đội mũ bảo hiểm đạt chuẩn",
      "Đi đúng phần đường theo tốc độ cho phép",
      "Dùng điện thoại khi lái xe",
      "Bật đèn chiếu sáng thời gian ban đêm",
    ],
    correctIndexes: [0, 1, 3],
  },
  {
    id: 807, topic: "Kỹ năng số", difficulty: "HARD", type: "MCQ_MULTI", points: 15,
    stem: "Nguyên tắc an toàn khi dùng Wi-Fi công cộng? (chọn nhiều)",
    options: [
      "Không đăng nhập tài khoản ngân hàng",
      "Dùng VPN khi cần xử lý dữ liệu nhạy cảm",
      "Tự động kết nối lại mọi mạng mở",
      "Tắt chế độ chia sẻ file",
    ],
    correctIndexes: [0, 1, 3],
  },
  /* ---- Đúng / Sai ---- */
  {
    id: 808, topic: "Đoàn TNCS HCM", difficulty: "EASY", type: "TRUE_FALSE", points: 5,
    stem: "Bác Hồ từng giữ chức Chủ tịch Đoàn TNCS Hồ Chí Minh.",
    options: ["Sai", "Đúng"],
    correctIndexes: [0],
  },
  {
    id: 809, topic: "An toàn giao thông", difficulty: "EASY", type: "TRUE_FALSE", points: 5,
    stem: "Trẻ em dưới 10 tuổi và cao dưới 1,35m không được ngồi hàng ghế trước xe ô tô.",
    options: ["Sai", "Đúng"],
    correctIndexes: [1],
  },
  {
    id: 810, topic: "Kỹ năng số", difficulty: "HARD", type: "TRUE_FALSE", points: 15,
    stem: "Chỉ cần dùng mật khẩu mạnh là tài khoản không thể bị chiếm quyền.",
    options: ["Sai", "Đúng"],
    correctIndexes: [0],
  },
  /* ---- Điền khuyết ---- */
  {
    id: 811, topic: "An toàn giao thông", difficulty: "EASY", type: "FILL", points: 5,
    stem: "Khi tham gia giao thông, người điều khiển xe máy bắt buộc phải đội ………… đạt chuẩn. (1 từ)",
    correctText: "mũ bảo hiểm",
  },
  {
    id: 812, topic: "Đoàn TNCS HCM", difficulty: "MEDIUM", type: "FILL", points: 10,
    stem: "Khẩu hiệu hành động của Đoàn TNCS Hồ Chí Minh: 'Xung …… và sáng tạo'. (1 từ)",
    correctText: "kiên",
  },
  {
    id: 813, topic: "Kỹ năng số", difficulty: "HARD", type: "FILL", points: 15,
    stem: "Hình thức lừa đảo giả mạo website/ngân hàng để đánh cắp mật khẩu thường được gọi là ………… (1 từ, không dấu)",
    correctText: "phishing",
  },
  /* ---- Tự luận ngắn ---- */
  {
    id: 814, topic: "Kỹ năng số", difficulty: "EASY", type: "SHORT_ANSWER", points: 5,
    stem: "Nêu một việc làm giúp bảo vệ thông tin cá nhân trên mạng. (2–3 dòng)",
  },
  {
    id: 815, topic: "Đoàn TNCS HCM", difficulty: "MEDIUM", type: "SHORT_ANSWER", points: 10,
    stem: "Hãy kể tên một phong trào hành động cách mạng của Đoàn đang triển khai ở trường em.",
  },
  {
    id: 816, topic: "An toàn giao thông", difficulty: "HARD", type: "SHORT_ANSWER", points: 15,
    stem: "Trình bày ngắn gọn quy tắc 'rượu bia - tốc độ' mới dành cho người điều khiển xe máy.",
  },
  /* ---- Tự luận dài ---- */
  {
    id: 817, topic: "An toàn giao thông", difficulty: "EASY", type: "LONG_ANSWER", points: 5,
    stem: "Em hãy đề xuất 3 việc làm cụ thể để lớp mình tham gia 'Tháng An toàn giao thông'.",
  },
  {
    id: 818, topic: "Đoàn TNCS HCM", difficulty: "MEDIUM", type: "LONG_ANSWER", points: 10,
    stem: "Phân tích ý nghĩa của 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh' đối với học sinh, sinh viên.",
  },
  {
    id: 819, topic: "Kỹ năng số", difficulty: "HARD", type: "LONG_ANSWER", points: 15,
    stem: "Đề xuất một kế hoạch tuyên truyền 'Kỹ năng số cho học sinh' ở trường em: mục tiêu, nội dung, hình thức và cách đánh giá.",
  },
  /* ---- Tải file minh chứng ---- */
  {
    id: 820, topic: "Đoàn TNCS HCM", difficulty: "EASY", type: "FILE_UPLOAD", points: 5,
    stem: "Tải lên ảnh minh chứng em đã tham gia một hoạt động Đoàn trong tháng này (1 ảnh, ≤ 5MB).",
  },
  {
    id: 821, topic: "An toàn giao thông", difficulty: "MEDIUM", type: "FILE_UPLOAD", points: 10,
    stem: "Đính kèm hình ảnh poster 'Mũ bảo hiểm an toàn của em' mà lớp em thực hiện.",
  },
  {
    id: 822, topic: "Kỹ năng số", difficulty: "HARD", type: "FILE_UPLOAD", points: 15,
    stem: "Tải lên tệp báo cáo sản phẩm số (PDF/ZIP) của dự án Kỹ năng số em đã thực hiện cùng nhóm.",
  },
  /* ---- Bù pool MCQ ---- */
  {
    id: 823, topic: "An toàn giao thông", difficulty: "EASY", type: "MCQ_SINGLE", points: 5,
    stem: "Tín hiệu đèn giao thông màu vàng có ý nghĩa gì?",
    options: [
      "Được đi nhanh",
      "Phải dừng lại trước vạch kẻ đường",
      "Chỉ xe máy được đi",
      "Đường phía trước bị cấm",
    ],
    correctIndexes: [1],
  },
  {
    id: 824, topic: "Kỹ năng số", difficulty: "EASY", type: "MCQ_SINGLE", points: 5,
    stem: "Mật khẩu nào sau đây an toàn nhất?",
    options: ["123456", "ngaysinh0101", "Tn#2026@kY!9x", "abcdefgh"],
    correctIndexes: [2],
  },
];
