# 4. Hướng dẫn kỹ thuật sinh văn bản

## 4.1. Chọn định dạng mẫu: DOCX + placeholder

**Khuyến nghị: file .docx chứa placeholder dạng `{{ten_bien}}`** (không soạn mẫu bằng HTML/Markdown),
vì:

| Tiêu chí | DOCX template | HTML → PDF | Markdown |
|---|---|---|---|
| Giữ nguyên thể thức (font, lề, bảng, trang) | ✅ nguyên bản | ⚠️ phải CSS lại từ đầu | ❌ |
| Chỉnh sửa mẫu bằng Word (ai cũng biết) | ✅ | ❌ | ⚠️ |
| Xuất ra Word in được | ✅ | ⚠️ | ❌ |
| Chèn bảng số liệu động | ✅ (loop) | ✅ | ⚠️ |

Mẫu soạn trong Word: thể thức đặt cứng, chỗ số liệu đặt placeholder, ví dụ:

```
Trong kỳ báo cáo, đơn vị đã triển khai {{so_hoat_dong}} hoạt động
với tổng {{tong_luot_tham_gia}} lượt đoàn viên tham gia.
```

## 4.2. Thư viện render (đã kiểm chứng phổ biến)

| Ngôn ngữ | Thư viện | Đặc điểm |
|---|---|---|
| **Node.js** | [`docxtemplater`](https://docxtemplater.com) | Điền vào mẫu có sẵn — **giữ 100% thể thức**, hỗ trợ `{#loop}` bảng số liệu, module ảnh, HTML. Phù hợp dự án Next.js hiện tại |
| Node.js | `docx` (dolanmiu/docx) | Sinh văn bản bằng code thuần — kiểm soát tốt nhưng thể thức phải code từng dòng |
| **Python** | `docxtpl` (python-docx-template) | Tương tự docxtemplater, cú pháp Jinja2 `{% ... %}` — nếu backend là Python |
| Python | `python-docx` | Sinh bằng code, kèm `soffice --convert-to pdf` nếu cần PDF |

> Prototype hiện tại là Next.js → chọn hướng **docxtemplater**.

## 4.3. Khai báo slot (slot_config JSON) đi kèm mỗi mẫu

```json
{
  "template_code": "BC-T01",
  "slots": [
    { "key": "so_hoat_dong",  "label": "Số hoạt động trong kỳ", "type": "number",
      "source": { "table": "activities", "agg": "COUNT",
                  "filter": { "org_scope": true, "period": "start_date" } },
      "editable": false },
    { "key": "phan_dinh_danh_gia", "label": "Nhận xét, đánh giá", "type": "text",
      "editable": true, "multiline": true },
    { "key": "bang_nhiem_vu", "label": "Bảng nhiệm vụ", "type": "table",
      "columns": ["Mã", "Nhiệm vụ", "Chỉ tiêu", "Đạt", "%"],
      "source": { "table": "task_assignments JOIN assignment_targets", "group_by": "task" },
      "editable": false }
  ],
  "citations": [1, 2, 3]
}
```

Quy ước:
- `editable: false` → điền xong **khóa**, người dùng chỉ xem.
- `type: table` → render bằng loop của docxtemplater (`{#bang_nhiem_vu} ... {/bang_nhiem_vu}`).
- Số định dạng theo locale `vi-VN` (dấu chấm ngăn cách nghìn, phẩy thập phân).

## 4.4. Luồng xử lý đề xuất

```
POST /api/reports/:id/export
  ├─ 1. Load template (.docx) + slot_config
  ├─ 2. Truy vấn DB theo {org_unit_id, period} → data map
  ├─ 3. Cộng chuỗi citation_refs (sort_order) → can_cu[]
  ├─ 4. merge() bằng docxtemplater → buffer .docx
  ├─ 5. Kiểm tra thể thức (2.5): font, thành phần bắt buộc → chặn/cảnh báo
  ├─ 6. Lưu bản xuất vào bảng files + ghi report_exports (ai, khi nào, mẫu)
  └─ 7. Trả stream .docx cho trình duyệt tải về
```

Bước xem trước: render xong bước 4 → chuyển PDF (LibreOffice headless `soffice --convert-to pdf`
hoặc service Gotenberg) → hiển thị `<iframe>` để người dùng soát trước khi bấm xuất chính thức.

## 4.5. Lưu vào CSDL (khớp schema hiện có)

- Bản gốc mẫu: bảng **`files`** (kho file dùng chung đã có trong thiết kế).
- Lịch sử xuất: bảng **`report_exports`** đã có sẵn — thêm cột `template_code`, `snapshot_data` (JSON số liệu đã điền, để đối chiếu về sau).
- Mẫu & căn cứ: 2 bảng mới `document_templates`, `citation_refs` (xem [03](./03-kho-mau-va-trich-can-cu.md)).

## 4.6. Kịch bản kiểm thử trước bàn giao

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Xuất BC-T01 cho đơn vị cấp 4 | Đúng font/lề theo ND30, đủ quốc hiệu→nơi nhận |
| 2 | Sửa số liệu gốc rồi xuất lại | File mới phản ánh số mới; bản cũ giữ nguyên trong report_exports |
| 3 | Đơn vị chưa nhập chỉ tiêu | Ô bảng nhiệm vụ hiện `—`, không lỗi; cảnh báo thiếu dữ liệu |
| 4 | Trích căn cứ có biến {tỉnh} | Thay đúng tên tỉnh của đơn vị xuất |
| 5 | Mở file bằng Word/LibreOffice/Google Docs | Trình bày không lệch |
| 6 | Số > 1000 hiển thị | `1.250` (vi-VN) không phải `1,250` |
