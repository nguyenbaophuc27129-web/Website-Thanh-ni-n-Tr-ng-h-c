-- ═══ 0031 — Bình chọn HS3T xác thực Gmail + lọc phiếu trùng tự động (10/11/2026) ═══
-- Chỉ đạo lãnh đạo 09/11: bỏ bắt buộc ĐK đoàn viên; xác thực Google; 1 Gmail bình chọn
-- 1 lần cho 1 gương — lần 2 bị lọc thành phiếu KHÔNG HỢP LỆ (ghi nhận, không cộng điểm).

-- 1) Phiếu có thể thuộc về Gmail (khách) thay vì tài khoản hệ thống
ALTER TABLE hs3t_votes ALTER COLUMN voter_account_id DROP NOT NULL;
ALTER TABLE hs3t_votes ADD COLUMN IF NOT EXISTS voter_email varchar(254);
ALTER TABLE hs3t_votes ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT true;
ALTER TABLE hs3t_votes ADD COLUMN IF NOT EXISTS invalid_reason varchar(60);

-- 2) Bỏ ràng buộc 1 phiếu/tài khoản/chiến dịch (mô hình cũ "đổi phiếu")
ALTER TABLE hs3t_votes DROP CONSTRAINT IF EXISTS hs3t_votes_campaign_voter_uq;

-- 3) Chống trùng: mỗi (chiến dịch, gương) chỉ 1 phiếu HỢP LỆ cho mỗi định danh.
--    Phiếu KHÔNG HỢP LỆ (is_valid=false) không vi phạm index → vẫn ghi nhận được.
CREATE UNIQUE INDEX IF NOT EXISTS hs3t_votes_valid_acc_uq
  ON hs3t_votes (campaign_id, story_id, voter_account_id)
  WHERE is_valid AND voter_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hs3t_votes_valid_email_uq
  ON hs3t_votes (campaign_id, story_id, lower(voter_email))
  WHERE is_valid AND voter_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS hs3t_votes_invalid_idx
  ON hs3t_votes (campaign_id)
  WHERE NOT is_valid;

-- 4) Ý nghĩa minigame mới (thay câu cũ nhắc "Cổng Thanh niên Trường học")
UPDATE vote_campaigns
   SET gift_note = 'Nhằm vinh danh những hành trình phấn đấu đẹp nhất của tuổi trẻ học đường, câu chuyện nhận được nhiều lượt bình chọn và sự đồng hành nhất sẽ trở thành nguồn cảm hứng của minigame truyền thông số — cùng phần quà vinh danh từ Ban Tổ chức trao tặng khi cổng bình chọn khép lại.'
 WHERE code = 'HS3T-2026';
