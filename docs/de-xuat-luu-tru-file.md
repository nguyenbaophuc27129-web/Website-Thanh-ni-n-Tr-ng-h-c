# Lưu trữ ảnh và tệp tải lên — đã triển khai

Tài liệu này từng là bản **đề xuất** (lưu tệp trên server thay cho base64 trong DB). Đề xuất đã được triển khai; nội dung chính thức nằm ở:

- **`DEPLOY.md`, mục "Tệp tải lên (ảnh, video, văn bản)"** — thư mục `/srv/tnth/uploads`, Caddy phục vụ `/uploads/*`, bảng `media_files`, dọn tệp mồ côi, chuyển máy.
- **`src/lib/server/media.ts`** — luật từng phân hệ (`KIND_RULES`: loại tệp, dung lượng, ai được tải), xử lý ảnh (WebP, xoá EXIF), kiểm chữ ký tệp.
- **`POST /api/uploads`** (`src/app/api/uploads/route.ts`) — điểm tải lên duy nhất, bắt buộc đăng nhập.

## Khác với bản đề xuất ban đầu

| Đề xuất cũ | Thực tế |
|---|---|
| Endpoint `POST /api/files`, trả `{id, url}`, nghiệp vụ lưu `file_id` | `POST /api/uploads` (`multipart` hoặc JSON `{kind, url}` để tải từ đường dẫn), trả `{url, mime, size…}`; cột nghiệp vụ lưu thẳng **đường dẫn `/uploads/...`**, không có khoá ngoại `file_id` |
| Bảng `files` | Bảng `media_files` (migration `0026`): đường dẫn, mã băm, người tải, dung lượng — dùng để chống trùng và dọn tệp mồ côi, không phải khoá tham chiếu |
| Tách `public/` và `private/`, tệp riêng tư qua `GET /api/files/{id}` có kiểm quyền | **Không tách**: mọi tệp ở `/uploads/<phân hệ>/<năm>/<tháng>/<sha256>.<đuôi>`, Caddy phục vụ thẳng; tên theo mã băm nội dung nên không đoán được. Chỉ kiểm quyền **tải lên** theo phân hệ (`bai-viet`, `van-ban` chỉ cán bộ) |
| Khách tải khi gửi phản ánh | Bắt buộc đăng nhập (phản ánh của khách đi qua `/api/phan-anh`, không đính kèm tệp) |
| Video không tải lên, dùng link YouTube | Có nhận video (`mp4`/`mov`/`webm`) cho diễn đàn và tài nguyên, giữ nguyên tệp |
| Ảnh: giữ bản gốc đã làm sạch + `thumb` 400px + `cover` 1200px | Chỉ một bản WebP: xoay đúng chiều, xoá EXIF/GPS, cạnh dài ≤ 2000px; không nhận SVG |
| Ảnh ≤ 10MB, Word/PDF ≤ 20MB | Theo phân hệ và loại tệp (`KIND_RULES`): ảnh bài viết/đóng góp 10MB; diễn đàn ảnh 2MB, video 15MB; văn bản/tài nguyên/dự án 25MB |
| Xem trước Word (`mammoth`/LibreOffice), trích chữ tìm kiếm | Chưa làm — tệp Office/nén/txt luôn tải xuống (`Content-Disposition: attachment`) |
| Chuyển dữ liệu cũ bằng script một lần | `scripts/migrate-media.mts`; ngoài ra `POST /api/store` tự chuyển base64 lọt vào cột tệp thành tệp trên đĩa |
| Dọn rác bằng cron hằng đêm | `scripts/clean-orphan-media.mts`, chạy tay (chưa đặt lịch), có chốt chặn 50% |
| Sao lưu `uploads` cùng DB, chép ra ngoài máy | Chưa: `deploy/db-backup.sh` chỉ sao lưu DB; phải chép cả `/srv/tnth/uploads` khi chuyển máy |

## Còn mở

- Sao lưu thư mục tệp ra ngoài ổ đĩa chứa DB và dọn tệp mồ côi theo lịch: xem `docs/VIEC-TON-DONG.md` (mục Vận hành).
