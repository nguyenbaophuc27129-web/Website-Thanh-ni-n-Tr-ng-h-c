/* ============================================================
   CẤU HÌNH WEBSITE MINIGAME - WORKSHOP UAV 2026
   ============================================================
   Sau khi tạo project Supabase (xem HUONG-DAN-DEPLOY.md):
   1. Vào Dashboard -> Project Settings -> API
   2. Copy "Project URL"  -> dán vào SUPABASE_URL
   3. Copy "anon public"  -> dán vào SUPABASE_ANON_KEY
   Nếu để trống -> web chạy chế độ DEMO (lưu trên máy, không
   có bảng vàng chung) - dùng để xem thử giao diện.
   ============================================================ */

const CONFIG = {
  // ----- Kết nối database (Supabase) -----
  SUPABASE_URL: 'https://wpauendpbhxdbyuiniro.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_n6uFLfADy6Uyt7eAIi5qIg_8kFAN7wm',

  // ----- Thông tin chương trình -----
  EVENT: {
    FULL_NAME: 'Workshop "Sinh viên kiến tạo tương lai công nghệ bay không người lái" năm 2026',
    SHORT_NAME: 'Workshop UAV 2026',
    MINIGAME_NAME: 'Thử thách Sáng tạo UAV',
    PANEL_NAME: 'Tọa đàm, giao lưu "Từ ý tưởng đến bầu trời"',
    TIME: '07h30 - 10h30, thứ Hai, ngày 30/11/2026',
    LOCATION: 'Đại học Phenikaa, Hà Nội',
    ORGANIZER: 'Trung tâm Hỗ trợ và Phát triển Sinh viên Việt Nam',
    SUPPORT: 'Ban Tổ chức: Nguyễn Ngọc Anh - 0914.971.970',
  },

  // ----- Luật chơi minigame -----
  QUIZ: {
    TIME_PER_QUESTION: 20,      // số giây cho mỗi câu hỏi
    SHUFFLE_QUESTIONS: true,    // xáo trộn thứ tự câu hỏi
    SHUFFLE_ANSWERS: true,      // xáo trộn thứ tự đáp án
    POINTS_PER_CORRECT: 100,    // điểm mỗi câu đúng
    SPEED_BONUS_MAX: 50,        // thưởng tốc độ tối đa mỗi câu đúng (theo giây còn lại)
  },

  LEADERBOARD_TOP: 20,          // số hạng cao nhất hiển thị trên bảng vàng
  REFRESH_LEADERBOARD_SEC: 20,  // tự động cập nhật bảng vàng (giây)

  // ----- Trang Quản trị (admin.html) -----
  // Mật khẩu để Ban Tổ chức xem dữ liệu + xuất Excel. NÊN ĐỔI trước sự kiện!
  ADMIN_PASSWORD: 'uav2026',
};
