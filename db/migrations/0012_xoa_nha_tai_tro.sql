-- 0012: Bỏ chức năng nhà tài trợ — web đã xóa toàn bộ trang quản trị
-- /quan-tri/tai-tro, dải "Nhà tài trợ đồng hành" và entity sponsors phía app
-- (quyết định bỏ tính năng trả quyền lợi nhà tài trợ ở giai đoạn 01).
BEGIN;

DROP TABLE IF EXISTS sponsors;

COMMIT;
