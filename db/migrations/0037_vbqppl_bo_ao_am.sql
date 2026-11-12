-- 0037 (12/11/2026) — YCCN:
-- 1) Thêm nhóm văn bản "Văn bản quy phạm pháp luật" cho kho tài nguyên (tab VBQPPL trên /tai-nguyen)
-- 2) Bỏ chuyên mục "Áo ấm mùa đông, đồng dao vùng cao" (AO_DUA) — bỏ hết mọi liên quan
--    (chỉ có FK tự tham chiếu parent_id; id 5 không có chuyên mục con)

INSERT INTO document_categories (id, code, name, display_order)
OVERRIDING SYSTEM VALUE
VALUES (7, 'VBQPPL', 'Văn bản quy phạm pháp luật', 7)
ON CONFLICT (code) DO NOTHING;

SELECT setval(pg_get_serial_sequence('document_categories', 'id'),
  COALESCE((SELECT max(id) FROM document_categories), 1));

DELETE FROM content_categories WHERE code = 'AO_DUA';
