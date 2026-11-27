/* ============================================================
   BỘ CÂU HỎI MINIGAME "THỬ THÁCH SÁNG TẠO UAV"
   ============================================================
   NGUỒN: File "2026.11.27. Câu hỏi minigames.docx" Ban Tổ chức gửi ngày 27/11/2026
   (12 câu + bảng đáp án chính thức ở mục "IV. Đáp án và cơ sở kiểm tra").

   Định dạng mỗi câu:
   {
     q:    'Nội dung câu hỏi',
     a:    ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
     c:    index đáp án đúng: 0 = A, 1 = B, 2 = C, 3 = D
   }
   - Số câu hỏi thay đổi tự động (thêm/bớt phần tử trong mảng).
   - Web hỗ trợ 4 đáp án cho mỗi câu; thứ tự câu và đáp án được xáo trộn khi thi.
   - Lưu ý: nếu Ban Tổ chức nhập câu hỏi vào trang Quản trị (admin.html),
     bộ trong database quiz_questions sẽ được dùng TRƯỚC bộ này.
   ============================================================ */

const QUESTIONS = [
  {
    q: 'UAV là viết tắt của cụm từ tiếng Anh nào?',
    a: ['Universal Aviation Vehicle', 'Unmanned Aerial Vehicle', 'United Aerospace Vehicle', 'Unmanned Automatic Vision'],
    c: 1,
  },
  {
    q: 'Một thiết bị bay loại quadcopter thông thường có bao nhiêu rotor tạo lực nâng?',
    a: ['2', '3', '6', '4'],
    c: 3,
  },
  {
    q: 'Trong lĩnh vực nông nghiệp, UAV có thể được sử dụng trực tiếp để thực hiện nhiệm vụ nào sau đây?',
    a: ['Phân tích ADN của cây trồng trong phòng thí nghiệm', 'Đo trực tiếp độ pH của đất từ trên cao bằng camera RGB thông thường', 'Phun thuốc bảo vệ thực vật', 'Thay đổi cấu trúc di truyền của hạt giống'],
    c: 2,
  },
  {
    q: 'GPS trên UAV chủ yếu được sử dụng để thực hiện chức năng nào?',
    a: ['Tăng dung lượng pin', 'Xác định vị trí địa lý', 'Tăng lực nâng của cánh quạt', 'Đo nhiệt độ động cơ'],
    c: 1,
  },
  {
    q: 'Bộ điều khiển bay (Flight Controller) trên UAV có chức năng chính là gì?',
    a: ['Lưu trữ hình ảnh và video', 'Sạc điện cho pin', 'Tiếp nhận dữ liệu cảm biến và tính toán tín hiệu điều khiển để ổn định, điều khiển chuyển động bay', 'Chuyển đổi ánh sáng mặt trời thành điện năng'],
    c: 2,
  },
  {
    q: 'Cảm biến IMU thông thường tích hợp hai loại cảm biến cơ bản nào?',
    a: ['Cảm biến gia tốc và cảm biến vận tốc góc', 'Cảm biến nhiệt độ và độ ẩm', 'Camera và cảm biến siêu âm', 'Cảm biến ánh sáng và áp suất'],
    c: 0,
  },
  {
    q: 'Chuyển động quay của UAV quanh trục đứng của hệ tọa độ gắn với thân thiết bị được gọi là gì?',
    a: ['Roll', 'Pitch', 'Throttle', 'Yaw'],
    c: 3,
  },
  {
    q: 'Trong cùng điều kiện hoạt động, việc tăng khối lượng tải trọng của một UAV multirotor thường dẫn đến hệ quả nào?',
    a: ['Thời gian bay luôn tăng gấp đôi', 'Mức tiêu thụ năng lượng tăng và thời gian bay có xu hướng giảm', 'Dung lượng pin tự động tăng', 'UAV không còn chịu tác dụng của trọng lực'],
    c: 1,
  },
  {
    q: 'ESC (Electronic Speed Controller) trong hệ thống UAV có chức năng chính là gì?',
    a: ['Xác định tọa độ địa lý', 'Truyền hình ảnh về trạm điều khiển', 'Điều chỉnh công suất điện cấp cho động cơ để điều khiển tốc độ quay', 'Đo độ cao của UAV'],
    c: 2,
  },
  {
    q: 'Trong một hệ thống UAV tìm kiếm người mất tích vào ban đêm, thiết bị nào phù hợp nhất để phát hiện người thông qua bức xạ nhiệt do cơ thể phát ra?',
    a: ['Camera ảnh nhiệt', 'Camera RGB thông thường không có nguồn chiếu sáng', 'Cảm biến GPS', 'Cảm biến độ ẩm không khí'],
    c: 0,
  },
  {
    q: 'Một UAV có khả năng sử dụng hình ảnh từ camera để tự động nhận diện phương tiện giao thông. Công nghệ nào phù hợp nhất để thực hiện nhiệm vụ này?',
    a: ['Công nghệ in 3D', 'Công nghệ nhận dạng giọng nói', 'Thị giác máy tính (Computer Vision)', 'Công nghệ sạc không dây'],
    c: 2,
  },
  {
    q: 'Một nhóm sinh viên muốn phát triển UAV phục vụ kiểm tra đường dây điện. Trước khi lựa chọn động cơ, cảm biến và thiết kế phần cứng, nhóm nên thực hiện công việc nào đầu tiên theo quy trình thiết kế kỹ thuật?',
    a: ['Xác định nhiệm vụ, yêu cầu kỹ thuật, điều kiện vận hành và các ràng buộc an toàn', 'Mua động cơ có công suất lớn nhất trên thị trường', 'Thiết kế logo và bao bì cho sản phẩm', 'Chế tạo ngay nguyên mẫu mà không cần xác định yêu cầu'],
    c: 0,
  },
];
