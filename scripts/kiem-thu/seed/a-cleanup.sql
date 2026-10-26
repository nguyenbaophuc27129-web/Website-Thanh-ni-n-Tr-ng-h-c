-- Dọn phản ánh thử của nhóm A để chạy lại test (giới hạn 1 phản ánh / giờ / tài khoản)
SET ROLE coder_dev;
DELETE FROM feedbacks WHERE id <> 271001 AND (sender_account_id IN (927, 928) OR sender_email LIKE '%@example.com' AND title LIKE '[A]%');
