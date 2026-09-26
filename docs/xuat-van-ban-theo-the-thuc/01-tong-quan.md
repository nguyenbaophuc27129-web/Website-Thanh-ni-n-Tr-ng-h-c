# 1. Tổng quan tính năng: Xuất văn bản theo thể thức

## 1.1. Bài toán

Hiện tại khi cần báo cáo/công văn, cán bộ Đoàn phải:

1. Mở lại file Word mẫu cũ, xóa số liệu cũ.
2. Đi lục số liệu ở nhiều nơi (bảng nhiệm vụ, tin bài, hoạt động…), tự gõ lại.
3. Tự trình bày thể thức — dễ sai font, lề, vị trí chữ ký, sót nơi nhận.

**Đề xuất:** hệ thống giữ sẵn **mẫu văn bản đúng thể thức**; ô số liệu được **tự điền từ dữ liệu đơn vị đã nhập trên hệ thống**; người dùng bấm xuất là nhận file Word in ra được ngay.

## 1.2. Nguyên lý: Mẫu + ô dữ liệu (slot)

Một văn bản = **2 lớp tách biệt**:

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  MẪU VĂN BẢN (template)      │     │  DỮ LIỆU (từ DB đơn vị)      │
│  - Thể thức, font, lề cố định │     │  - Số hoạt động trong kỳ     │
│  - Chỗ trống: {{so_hoat_dong}}│  +  │  - Tỷ lệ hoàn thành chỉ tiêu │
│  - Câu chữ khung có sẵn       │     │  - Tổng lượt tham gia        │
└──────────────┬───────────────┘     └──────────────┬───────────────┘
               │            ENGINE RENDER            │
               └──────────────┬──────────────────────┘
                              ▼
                FILE WORD (.docx) đúng thể thức, in ra được
```

- **Mẫu** do cấp trên (Ban TNTH TW) soạn 1 lần, quản lý tập trung → tất cả đơn vị dùng chung, không lệch thể thức.
- **Số liệu** không gõ tay — lấy đúng từ DB (`activities`, `task_assignments`, `scores`, `published_posts`…) theo kỳ và đơn vị → luôn khớp với những gì đơn vị đã nhập.
- **Phần con người** vẫn được giữ: nhận xét, kiến nghị, chữ ký — người dùng nhập/trình bày trước khi xuất.

## 1.3. Luồng nghiệp vụ

```
Đơn vị nhập liệu (hoạt động, kết quả nhiệm vụ…)
        │
        ▼
Vào mục "Báo cáo/Văn bản" → chọn loại văn bản cần xuất (truy suất kho mẫu)
        │
        ▼
Chọn kỳ + phạm vi → hệ thống tự điền số liệu vào các ô {{...}}
        │
        ▼
XEM TRƯỚC: số liệu bị khóa (không sửa được), phần chữ/nhận định được phép sửa
        │
        ▼
Bấm "Xuất Word" → tải file .docx đúng thể thức (hoặc in trực tiếp)
        │
        ▼
Ghi lịch sử xuất (ai, khi nào, mẫu nào) vào DB
```

## 1.4. Vì sao làm theo cách này

| Vấn đề | Cách giải quyết |
|---|---|
| Thể thức lệch mỗi đơn vị một kiểu | Mẫu tập trung, sửa 1 nơi áp dụng cho toàn hệ thống |
| Số liệu không khớp giữa báo cáo và hệ thống | Ô số liệu khóa cứng, chỉ sinh từ DB |
| Lập báo cáo mất công gõ lại | Chọn kỳ là xong — phần lớn nội dung tự điền |
| Cấp trên khó tổng hợp | Cùng 1 mẫu → số liệu đồng nhất cấu trúc, dễ cộng gộp |

## 1.5. Phạm vi giai đoạn đầu (MVP)

1. 1 loại văn bản: **Báo cáo tháng** (mẫu BC-T01) — xem ví dụ ở [05-vi-du-bao-cao-thang.md](./05-vi-du-bao-cao-thang.md).
2. Xuất file **.docx** đúng thể thức; PDF là bước sau.
3. Số liệu tự điền: hoạt động, nhiệm vụ/chỉ tiêu, điểm thi đua, tin bài.
4. Phần nhập tay: nhận xét, đánh giá, kiến nghị, tên người ký.
