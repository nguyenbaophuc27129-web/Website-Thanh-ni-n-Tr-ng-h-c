/* ============================================================
   BỘ CÂU HỎI MINIGAME "THỬ THÁCH SÁNG TẠO UAV"
   ============================================================
   !!! LƯU Ý: Đây là 12 câu MẪU để chạy thử website.
   Khi Ban Tổ chức gửi bộ câu hỏi thật, chỉ cần thay nội dung
   mảng QUESTIONS bên dưới theo đúng định dạng:

   {
     q:    'Nội dung câu hỏi',
     a:    ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
     c:    0,        // index đáp án đúng: 0 = A, 1 = B, 2 = C, 3 = D
   }

   - Số câu hỏi thay đổi tự động (thêm/bớt phần tử trong mảng).
   - Hiện tại web hỗ trợ 4 đáp án cho mỗi câu.
   ============================================================ */

const QUESTIONS = [
  {
    q: 'UAV là viết tắt của cụm từ nào?',
    a: ['Unmanned Aerial Vehicle', 'Universal Aviation Vehicle', 'United Air Vehicle', 'Unmanned Auto Vessel'],
    c: 0,
  },
  {
    q: 'Lực nào chủ yếu giúp cánh của máy bay không người lái tạo độ cao khi bay?',
    a: ['Lực nâng (lift) do chênh lệch áp suất khí trên và dưới cánh', 'Lực hấp dẫn của Trái Đất', 'Lực ma sát với không khí', 'Lực đẩy ngang của gió'],
    c: 0,
  },
  {
    q: 'Máy bay không người lái loại quadcopter có mấy cánh quạt (rotor)?',
    a: ['2', '4', '6', '8'],
    c: 1,
  },
  {
    q: 'Thiết bị nào giúp UAV xác định vị trí của chính mình trên không?',
    a: ['Hệ thống định vị toàn cầu GPS', 'Máy quay hành trình', 'Đèn LED báo hiệu', 'Còi báo động'],
    c: 0,
  },
  {
    q: 'Trước khi điều khiển flycam/UAV bay tại một khu vực, người điều khiển nên làm gì?',
    a: ['Bay ngay vì flycam cỡ nhỏ không cần bất kỳ quy định nào', 'Tìm hiểu và tuân thủ quy định, xin phép cơ quan có thẩm quyền tại khu vực cấm/không bay', 'Chỉ cần tắt đèn LED của flycam', 'Bay ở độ cao càng cao càng tốt để tránh va chạm'],
    c: 1,
  },
  {
    q: 'Trong nông nghiệp, UAV được ứng dụng phổ biến nhất để làm gì?',
    a: ['Chăm sóc thú cưng', 'Phun thuốc bảo vệ thực vật và giám sát mùa vụ', 'Vẽ tranh trên cánh đồng', 'Thu hoạch cá'],
    c: 1,
  },
  {
    q: 'Nguồn năng lượng phổ biến nhất của UAV dân dụng cỡ nhỏ hiện nay là gì?',
    a: ['Động cơ xăng hai kỳ', 'Pin sạc (thường là pin lithium polymer - LiPo)', 'Điện mặt trời trên toàn bộ thân máy', 'Nhựa sinh học'],
    c: 1,
  },
  {
    q: 'Khi mất kết nối giữa UAV và bộ điều khiển (remote), hầu hết UAV hiện đại sẽ làm gì?',
    a: ['Rơi ngay lập tức', 'Bay tiếp theo hướng cũ vô thời hạn', 'Tự động quay về điểm cất cánh (Return to Home) hoặc hạ cánh an toàn', 'Xả pin và dừng hoạt động'],
    c: 2,
  },
  {
    q: 'Vai trò của trí tuệ nhân tạo (AI) trong UAV hiện đại là gì?',
    a: ['Chỉ để trang trí giao diện điều khiển', 'Giúp nhận diện, theo dõi mục tiêu và tự động hóa hành trình bay', 'Thay thế hoàn toàn pin lithium', 'Không liên quan gì đến UAV'],
    c: 1,
  },
  {
    q: 'Ứng dụng nào của UAV được cho là có tiềm năng lớn trong y tế khẩn cấp?',
    a: ['Giao hàng thực phẩm chơi thử', 'Chở khách du lịch', 'Giao vận vật tư y tế, máu, vaccine đến vùng khó tiếp cận', 'Dọn nhà vệ sinh'],
    c: 2,
  },
  {
    q: 'Thành phần nào dưới đây KHÔNG thuộc nhóm thiết bị thường có trên một UAV quadcopter?',
    a: ['Máy bay không gian ba chiều (3D printer)', 'Motor và cánh quạt', 'Bộ điều khiển bay (flight controller)', 'Pin nguồn'],
    c: 0,
  },
  {
    q: 'Sinh viên muốn bắt đầu nghiên cứu, chế tạo UAV có thể bắt đầu từ đâu?',
    a: ['Phải chờ tốt nghiệp mới được nghiên cứu', 'Tìm hiểu qua các câu lạc bộ, cuộc thi sáng tạo khoa học kỹ thuật và hướng dẫn của giảng viên', 'Mua flycam rồi bay tự do không cần tìm hiểu', 'Chỉ có trường hàng không mới được phép nghiên cứu UAV'],
    c: 1,
  },
];
