-- ============================================================
-- PATCH LOG + CHỐNG GIAN LẬN — Workshop UAV 2026
-- Dán TOÀN BỘ file này vào Supabase SQL Editor -> Run -> xong
-- Chạy TRƯỚC sự kiện. Chạy lại nhiều lần đều an toàn.
-- ============================================================
-- Việc 1: Thêm 2 cột vào bảng players:
--   violations  = số lần thí sinh rời khỏi màn hình khi đang thi
--   answer_log  = nhật ký từng lần chọn đáp án (jsonb):
--                 [{q, question, answer, correct, sec_left, at}, ...]
-- Việc 2: Ban Tổ chức (email trong admin_emails, đã đăng nhập) được ĐỌC
--         chi tiết bảng players (kèm SĐT trao giải, vi phạm, log đáp án).
--         Sinh viên (anon) vẫn CHỈ được gửi kết quả, không đọc được gì.
-- ============================================================

-- ---------- 1) Cột mới ----------
alter table public.players add column if not exists violations int not null default 0;
alter table public.players add column if not exists answer_log jsonb;

-- ---------- 2) Admin được đọc chi tiết kết quả ----------
drop policy if exists "Admin doc ket qua chi tiet" on public.players;
create policy "Admin doc ket qua chi tiet"
  on public.players for select
  to authenticated
  using (public.is_admin());
grant select on public.players to authenticated;

-- Lưu ý:
-- - v_leaderboard KHÔNG thêm cột mới -> bảng vàng công khai trên web không đổi,
--   số lần vi phạm và log đáp án CHỈ Ban Tổ chức đăng nhập mới thấy (admin.html).
-- - Web đã tự chịu lỗi: nếu patch này chưa chạy, kết quả vẫn được lưu bình
--   thường (chỉ thiếu 2 cột mới), không mất điểm của thí sinh.
-- - Dọn dữ liệu TEST trước sự kiện: chạy XOA-DU-LIEU-TEST.sql như bình thường.
