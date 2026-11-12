-- 0027: Mã bí mật của lượt thi trực tuyến — chỉ người đã bắt đầu lượt thi mới nộp được bài.
-- Máy chủ sinh mã ngẫu nhiên khi gọi POST /api/thi/bat-dau, trả mã gốc cho trình duyệt
-- và chỉ lưu SHA-256 của mã (64 ký tự hex). Lượt thi cũ (trước bản này) để NULL — không nộp tiếp được.
-- Điểm do máy chủ chấm từ đáp án trong DB, trình duyệt không gửi điểm nữa.

alter table quiz_attempts add column if not exists access_token varchar(64);
