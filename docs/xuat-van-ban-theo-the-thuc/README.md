# Tài liệu tính năng: Xuất văn bản/báo cáo theo thể thức từ dữ liệu hệ thống

Bộ tài liệu đề xuất cho Chương trình **Thanh niên Trường học** — mô tả cơ chế
**"mẫu văn bản sẵn + ô số liệu tự điền từ DB đơn vị"** để xuất Word/PDF đúng thể thức.

## Mục lục

| File | Nội dung | Dành cho ai |
|---|---|---|
| [01-tong-quan.md](./01-tong-quan.md) | Bài toán, nguyên lý "mẫu + slot dữ liệu", luồng nghiệp vụ | Toàn thể |
| [02-the-thuc-van-ban.md](./02-the-thuc-van-ban.md) | Chuẩn thể thức văn bản (Nghị định 30/2020/NĐ-CP áp dụng cho cơ quan Đoàn), bố cục, font, lề | Anh Cường (code thể thức), tổ soạn mẫu |
| [03-kho-mau-va-trich-can-cu.md](./03-kho-mau-va-trich-can-cu.md) | Phân loại văn bản, danh mục mẫu, **trích căn cứ**, danh mục slot số liệu và bảng DB nguồn | Tổ soạn mẫu, dev |
| [04-ky-thuat-sinh-van-ban.md](./04-ky-thuat-sinh-van-ban.md) | Cách code: template DOCX + placeholder, engine render, API đề xuất, kiểm thử | Dev |
| [05-vi-du-bao-cao-thang.md](./05-vi-du-bao-cao-thang.md) | Ví dụ hoàn chỉnh: mẫu Báo cáo tháng + bảng ánh xạ từng ô số liệu → bảng/cột DB | Tất cả |

## Ý chính trong 1 câu

> Đơn vị nhập liệu trên hệ thống → chọn **mẫu văn bản** (đã soạn sẵn đúng thể thức, có chỗ trống dạng `{{ten_bien}}`) → hệ thống **truy suất số liệu từ DB** điền vào → hiện **bản xem trước** → người dùng chỉnh phần chữ ký/nhận định → bấm xuất → nhận **file Word** in ra được ngay.

## Việc cần Ban TNTH TW xác nhận

1. Văn bản hướng dẫn thể thức riêng của TW Đoàn (nếu có) để bổ sung vào mục **căn cứ** — hiện tài liệu áp dụng chung Nghị định 30/2020/NĐ-CP về công tác văn thư.
2. Quy tắc **số hiệu văn bản** của hệ thống (VD: số vào sổ + ký hiệu đơn vị `TNTH-BD` + năm).
3. Danh sách **căn cứ pháp lý chính thức** dùng cho phần "Trích căn cứ" của từng loại mẫu.
4. **Thẩm quyền ký** từng loại văn bản (Bí thư / Phó Bí thư trực nào).
