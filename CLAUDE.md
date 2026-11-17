@AGENTS.md

# Quy ước làm việc

- Luôn trả lời bằng tiếng Việt (code, lệnh, tên file giữ nguyên).
- Trước khi thay đổi bất cứ thứ gì (code, cấu hình, DB, deploy, push), phải báo cáo trước và chờ người dùng đồng ý. Báo cáo gồm:
  - **Những gì sẽ thay đổi**: file, thành phần, lệnh sẽ chạy.
  - **Phạm vi ảnh hưởng**: phần nào của web/hệ thống bị tác động.
  - **Lý do thay đổi**.
  - **Ảnh hưởng sau thay đổi**: kết quả mong đợi, rủi ro, cách quay lại bản cũ.
- Việc chỉ đọc/kiểm tra để tìm hiểu thì không cần hỏi. Đồng ý cho một thay đổi không có nghĩa là đồng ý cho thay đổi tiếp theo.
- Việc viết code giao chính cho model Sonnet. Hạn chế dùng sub-agent, trừ khi người dùng yêu cầu hoặc phê duyệt.
- Trong lúc code, nếu phát hiện lỗi, vấn đề UI/UX hoặc điều gì ảnh hưởng đến hệ thống và trải nghiệm người dùng (khách, đoàn viên, quản trị viên, cán bộ các cấp), phải báo ngay cho người dùng để phân tích bằng Opus. Không tự ý bỏ qua hay âm thầm sửa rộng ra ngoài phạm vi đã được đồng ý.
