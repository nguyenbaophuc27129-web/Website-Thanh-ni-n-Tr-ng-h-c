# Đề xuất: lưu trữ ảnh và file tải lên trên server

> Trạng thái: **đề xuất, chưa triển khai** (15/10/2026).
> Phạm vi: ảnh bìa bài viết, ảnh/video diễn đàn, file Word/PDF (tài nguyên, công văn, báo cáo dự án), minh chứng HS3T và phản ánh.

## 1. Hiện trạng

| Chỗ có tải file | Đang lưu thế nào |
|---|---|
| Ảnh bìa bài viết (`quan-tri/xuat-ban`, `tin-tuc`) | Trình duyệt đọc thành chuỗi `data:...;base64,...`, lưu vào cột text `published_posts.cover_data_url` |
| Ảnh/video diễn đàn (`src/lib/forum-media.ts`) | Base64 trong cột jsonb `media` |
| File báo cáo dự án tình nguyện (pdf/doc/docx) | Base64 trong `reportFile.dataUrl` |
| Tài nguyên (`quan-tri/tai-nguyen`) | Chỉ ghi tên tệp, không upload thật |
| Minh chứng HS3T, phản ánh | Chỉ giữ tên file |

Schema đã có sẵn nhưng **chưa dùng**:

- `files`: `storage_path`, `original_name`, `mime_type`, `size_bytes`, `checksum_sha256`, `uploaded_by_account_id`, `deleted_at`.
- Bảng nối `activity_files`, `document_files`; cột `resources.file_id`.

### Vì sao phải đổi

1. **`/api/store` trả toàn bộ dữ liệu trong một lần** (hiện khoảng 100 KB). Base64 lớn hơn file gốc 33%, nên 50 bài có ảnh bìa 2 MB đã đủ làm mỗi lần mở web tải khoảng 130 MB.
2. DB phình nhanh, sao lưu và khôi phục chậm.
3. Ảnh giữ nguyên EXIF, **lộ toạ độ GPS**. Người dùng phần lớn là học sinh chưa đủ tuổi, nên đây là rủi ro về dữ liệu cá nhân.

## 2. Hướng đề xuất

File lưu trên ổ đĩa server, DB chỉ giữ thông tin mô tả trong bảng `files`, dữ liệu nghiệp vụ trỏ tới `file_id`.

- Máy chủ còn khoảng 85 GB trống, đủ cho giai đoạn đầu.
- Phần lưu trữ viết qua một lớp trung gian (`saveFile`, `readFile`, `deleteFile`) để sau này chuyển sang lưu trữ ngoài (S3, MinIO) mà không sửa nghiệp vụ.

### 2.1. Luồng tải lên: `POST /api/files`

1. **Xác thực:** bắt buộc đăng nhập. Riêng phản ánh và minh chứng công khai mở cho khách, nhưng giới hạn tần suất theo IP.
2. **Gửi dạng `multipart/form-data`**, không gửi base64.
3. **Kiểm tra trên server:**
   - Dung lượng theo loại: ảnh ≤ 10 MB, Word/PDF ≤ 20 MB. Video không tải lên; dùng link YouTube (đã có cột `resources.video_url`).
   - Xác định loại file bằng nội dung (magic bytes), không tin đuôi file.
   - Danh sách cho phép: `jpg`, `png`, `webp`, `heic`, `pdf`, `doc`, `docx`, `xls`, `xlsx`. Chặn `.docm`/`.xlsm` (macro), `.exe`, `.html`, `.svg`.
4. **Xử lý ảnh** (thư viện `sharp`): xoá EXIF/GPS, chuyển sang WebP, tạo bản `thumb` (400px) và `cover` (1200px), giữ bản gốc đã làm sạch.
5. **Ghi file:** `uploads/<public|private>/<yyyy>/<mm>/<uuid>.<ext>`. Tên ngẫu nhiên; không bao giờ dùng tên gốc làm đường dẫn.
6. **Ghi DB:** thêm một dòng `files` (kèm SHA-256 để phát hiện trùng), trả về `{ id, url }`.
7. **Gắn vào nghiệp vụ:** bản ghi nghiệp vụ chỉ lưu `file_id`.

### 2.2. Luồng lấy ra: hai loại file

| Loại | Ví dụ | Cách phục vụ |
|---|---|---|
| **Công khai** | Ảnh bìa, tài nguyên đã xuất bản, ảnh diễn đàn đã duyệt | Caddy phục vụ thẳng `uploads/public/`, cache dài hạn (tên file là uuid nên không đổi nội dung) |
| **Riêng tư** | Minh chứng HS3T, phản ánh của người dân, công văn nội bộ, báo cáo dự án | `GET /api/files/{id}`: kiểm tra quyền theo cây đơn vị (`org_units.path`), trả `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` |

Khi một file chuyển từ riêng tư sang công khai (ví dụ bài viết được xuất bản), server di chuyển file từ `private/` sang `public/` và cập nhật `storage_path`.

### 2.3. File Word

- Luôn giữ bản gốc `.docx` để tải về.
- Xem trước trên web, chọn một trong hai:

| Cách | Ưu | Nhược |
|---|---|---|
| `mammoth` (docx → HTML) | Nhẹ, chạy ngay trong web | Mất một phần định dạng (bảng phức tạp, header/footer) |
| LibreOffice headless (docx → PDF) | Giữ đúng thể thức văn bản | Container riêng, tốn khoảng 0,5–1 GB RAM (máy có 5,8 GB), cần hàng đợi |

- Trích chữ để tìm kiếm (đưa vào `search_vector`).

## 3. Thay đổi cần làm

### Hạ tầng
- Container `web` đang `read_only`. Cần gắn volume `uploads` có quyền ghi (uid 1000) vào `/app/uploads`.
- Caddy: thêm `file_server` cho `/uploads/public/*`, chỉnh `request_body max_size` riêng cho `/api/files` (hiện 30 MB cho mọi request).

### Cơ sở dữ liệu (migration mới)
- `published_posts.cover_file_id` thay `cover_data_url`.
- Media diễn đàn, báo cáo dự án, minh chứng HS3T, minh chứng phản ánh: chuyển từ base64 hoặc tên file sang tham chiếu `files.id`.
- Thêm cột `files.visibility` (`PUBLIC`/`PRIVATE`) nếu cần tách quyền rõ ràng.

### Vận hành
- **Dọn rác:** cron hằng đêm xoá file đã tải lên nhưng sau 24 giờ không gắn vào bản ghi nào, và file có `deleted_at` quá 30 ngày.
- **Sao lưu:** `deploy/db-backup.sh` hiện chỉ sao lưu DB. Cần sao lưu thêm `uploads` cùng thời điểm, và **chép ra ngoài máy** (restic/rsync sang lưu trữ ngoài). Hiện bản sao lưu nằm chung ổ với dữ liệu.
- **Chuyển dữ liệu cũ:** script chạy một lần, đọc các trường base64 hiện có, ghi ra file, thay bằng `file_id`.

## 4. Thứ tự triển khai

| Bước | Nội dung | Lý do |
|---|---|---|
| 1 | API upload/download, volume `uploads`, áp dụng cho **ảnh bìa bài viết** | Lớn nhất, dùng nhiều nhất, công khai nên ít rủi ro quyền |
| 2 | Tài nguyên, công văn (`document_files`), báo cáo dự án | File Word/PDF, có kiểm tra quyền |
| 3 | Minh chứng HS3T, phản ánh | Dữ liệu riêng tư, cần kiểm tra quyền chặt |
| 4 | Diễn đàn | Cần luồng kiểm duyệt trước khi chuyển sang công khai |
| 5 | Xem trước Word, sao lưu ngoài máy, cân nhắc lưu trữ ngoài | Hoàn thiện |

## 5. Cần quyết định

1. Xem trước Word: `mammoth` hay LibreOffice?
2. Giới hạn dung lượng mỗi file và tổng dung lượng mỗi đơn vị.
3. Có cho khách (không đăng nhập) tải file khi gửi phản ánh không?
4. Lưu trữ ngoài để sao lưu: dùng dịch vụ nào?
