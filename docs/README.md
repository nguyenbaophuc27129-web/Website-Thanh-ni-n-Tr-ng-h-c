# Tài liệu dự án — Website Thanh niên Trường học

Bộ tài liệu mô tả **website demo Chương trình Thanh niên Trường học** (Đoàn TNCS Hồ Chí Minh):
website công khai + khu quản trị 4 cấp, phục vụ demo trình Ban Thanh niên Trường học — TW Đoàn.

## Mục lục

### Phần I — Dự án hiện có (prototype)

| File | Nội dung |
|---|---|
| [01-tong-quan-du-an.md](./01-tong-quan-du-an.md) | Mục tiêu, phạm vi demo, công nghệ, hướng dẫn chạy, cấu trúc thư mục |
| [02-quy-trinh-nghiep-vu.md](./02-quy-trinh-nghiep-vu.md) | Các luồng nghiệp vụ: hoạt động → xác nhận → xuất bản → nhiệm vụ → chấm điểm → xếp hạng → báo cáo |
| [03-tai-khoan-phan-quyen.md](./03-tai-khoan-phan-quyen.md) | Mô hình 4 cấp, 5 vai trò, phạm vi dữ liệu, tạo tài khoản & nhập từ file |
| [04-chuc-nang-he-thong.md](./04-chuc-nang-he-thong.md) | Bản đồ trang: website công khai + 9 phân hệ quản trị, tính năng từng trang |
| [05-thiet-ke-du-lieu.md](./05-thiet-ke-du-lieu.md) | Tóm tắt thiết kế CSDL 43 bảng theo 8 phân hệ, ánh xạ sang prototype |

### Phần II — Tính năng đề xuất: Xuất văn bản theo thể thức

Thư mục [xuat-van-ban-theo-the-thuc/](./xuat-van-ban-theo-the-thuc/README.md):

| File | Nội dung |
|---|---|
| [01-tong-quan](./xuat-van-ban-theo-the-thuc/01-tong-quan.md) | Nguyên lý "mẫu + ô số liệu tự điền từ DB", luồng nghiệp vụ |
| [02-the-thuc-van-ban](./xuat-van-ban-theo-the-thuc/02-the-thuc-van-ban.md) | Chuẩn thể thức (Nghị định 30/2020/NĐ-CP), bố cục, font, lề, checklist soi lỗi |
| [03-kho-mau-va-trich-can-cu](./xuat-van-ban-theo-the-thuc/03-kho-mau-va-trich-can-cu.md) | Phân loại văn bản, kho mẫu, danh mục trích căn cứ, danh mục ô số liệu |
| [04-ky-thuat-sinh-van-ban](./xuat-van-ban-theo-the-thuc/04-ky-thuat-sinh-van-ban.md) | Kỹ thuật: DOCX template + docxtemplater, slot JSON, API, kiểm thử |
| [05-vi-du-bao-cao-thang](./xuat-van-ban-theo-the-thuc/05-vi-du-bao-cao-thang.md) | Ví dụ mẫu Báo cáo tháng BC-T01 + bảng ánh xạ từng ô → DB |

## Tóm tắt nhanh

- **Tham chiếu CSDL:** `THIET-KE-SCHEMA (1).md` — đặc tả 43 bảng, 8 phân hệ (nguồn sự thật).
- **Prototype:** Next.js 16 + TypeScript + Tailwind 4, chạy 100% mock data, không cần backend.
- **Tài khoản demo:** 5 vai trò × 4 cấp — xem [03](./03-tai-khoan-phan-quyen.md#63-tài-khoản-demo).

## Cần Ban TNTH TW xác nhận

1. Văn bản hướng dẫn thể thức của TW Đoàn (nếu có) — bổ sung vào [mục căn cứ](./xuat-van-ban-theo-the-thuc/03-kho-mau-va-trich-can-cu.md#33-danh-mục-trích-căn-cứ-citation_refs).
2. Quy tắc **số hiệu văn bản** thống nhất (`số/TNTH-{ký hiệu đơn vị}`?).
3. Danh sách **căn cứ pháp lý chính thức** cho từng loại mẫu.
4. **Thẩm quyền ký** từng loại văn bản theo cấp.
