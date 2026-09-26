# 4. Chức năng hệ thống — bản đồ trang

> Toàn bộ route của prototype. Mọi trang là client component đọc dữ liệu từ `StoreContext`.

## 4.1. Website công khai (không cần đăng nhập)

| Route | Trang | Tính năng chính |
|---|---|---|
| `/` | Trang chủ | Hero banner, tin NỔI BẬT, tin mới nhất, tóm tắt BXH, link Học sinh 3 tốt (từ `system_settings`), sơ đồ chương trình |
| `/tin-tuc` | Danh sách tin bài | Lọc nhóm nội dung, tìm kiếm theo từ khóa, phân trang |
| `/tin-tuc/[slug]` | Chi tiết tin | Nội dung đầy đủ, ảnh, lượt xem (+1 khi mở), tin liên quan, nguồn (đơn vị/hoạt động) |
| `/van-ban` | Văn bản công khai | Lọc nhóm văn bản/năm, xem chi tiết, tải file đính kèm |
| `/phan-anh` | Gửi phản ánh kiến nghị | Form không cần tài khoản: chủ đề, tiêu đề, nội dung, họ tên, email, SĐT, đơn vị → nhận **mã tra cứu `PA-2026-XXXXX`** |
| `/phan-anh/tra-cuu` | Tra cứu theo mã | Nhập mã → xem thread trao đổi + trạng thái (KHÔNG thấy ghi chú nội bộ) |
| `/phan-anh/[code]` | Chi tiết phản ánh | Thread công khai: câu hỏi + trả lời công khai, trạng thái xử lý |
| `/tai-nguyen` | Kho tài nguyên | Chỉ hiện `is_public`, lọc loại tài nguyên, tải file (tăng `download_count`) |
| `/bang-xep-hang` | Bảng xếp hạng công khai | Chọn kỳ đã chốt (FINALIZED), lọc cấp đơn vị/kiểu xếp hạng, huy chương Hạng 1–3 |
| `/gioi-thieu` | Giới thiệu | Mục tiêu chương trình, mô hình 4 cấp, các phân hệ |
| (mọi trang) | AI chat widget | Chat nổi góc phải — giả lập rule-based: trả lời về chương trình, cách gửi phản ánh, tra cứu mã, link các trang |

## 4.2. Đăng nhập

| Route | Trang | Tính năng |
|---|---|---|
| `/dang-nhap` | Đăng nhập | Bấm nhanh 1 trong 5 thẻ tài khoản demo, hoặc nhập tay username + password (`demo123`). Bao gồm cả tài khoản tạo mới. Phiên lưu `localStorage` |

## 4.3. Khu quản trị — `/quan-tri` (19 trang, theo phân hệ)

### Tổng quan

| Route | Tính năng |
|---|---|
| `/quan-tri` | Thẻ số liệu theo phạm vi (hoạt động, nhiệm vụ, tin bài, phản ánh mới) · 4 biểu đồ · hàng chờ cần xử lý · deadline đếm ngược · thông báo chưa đọc |

### R1 — Hoạt động

| Route | Tính năng |
|---|---|
| `/quan-tri/hoat-dong` | Danh sách hoạt động trong phạm vi, lọc trạng thái/nhóm nội dung/đơn vị, tìm kiếm |
| `/quan-tri/hoat-dong/tao-moi` | Form tạo (DRAFT): tiêu đề, tóm tắt, thời gian, địa điểm, số người tham gia, nhóm nội dung, link FB/website/báo |
| `/quan-tri/hoat-dong/[id]` | Chi tiết + luồng trạng thái: DRAFT → Nộp (SUBMITTED) → cấp trên Xác nhận (CONFIRMED) / Yêu cầu bổ sung (NEEDS_INFO → sửa → REVISED) / Trả lại (REJECTED) · nhật ký `activity_reviews` · đơn vị chỉ sửa được hoạt động của mình |

### R2 — Xuất bản

| Route | Tính năng |
|---|---|
| `/quan-tri/xuat-ban` | Danh sách bài (PUBLISHED/UNPUBLISHED/SCHEDULED/DRAFT) · **tạo bài từ hoạt động đã xác nhận** (tiêu đề báo chí + lead gợi ý từ tóm tắt) · đăng / gỡ / gắn NỔI BẬT / hẹn giờ đăng — bài đăng hiện ngay trên `/tin-tuc` |

### R3 — Nhiệm vụ, Chỉ tiêu & Đánh giá

| Route | Tính năng |
|---|---|
| `/quan-tri/nhiem-vu` | Danh sách bộ tiêu chí theo năm + cây nhiệm vụ phân cấp I → I.1 → I.1.a (điểm tối đa, hạn chót, phương thức chấm) |
| `/quan-tri/nhiem-vu/[id]` | Chi tiết bộ tiêu chí · **giao/chia chỉ tiêu nhiều cấp** (TW → tỉnh → phường → trường), chặn chia VƯỢT, cảnh báo còn dư, tổng con = chỉ tiêu cha |
| `/quan-tri/nhiem-vu/phan-cong/[id]` | Cập nhật kết quả theo kỳ (**append-only**), tự tính `completion_rate`, trạng thái NOT_STARTED → IN_PROGRESS → COMPLETED / OVERDUE, badge deadline D-7 xanh / D-3 vàng / QUÁ HẠN đỏ |
| `/quan-tri/nhiem-vu/xac-nhan` | Hàng chờ kết quả chờ xác nhận: Xác nhận / Yêu cầu bổ sung / Trả lại (ghi `assignment_reviews` + sinh thông báo) |
| `/quan-tri/nhiem-vu/cham-diem` | Chấm điểm thi đua theo 3 phương thức: AUTO_AGGREGATE (tự tính = tỷ lệ đạt × điểm tối đa) / MANUAL_CONFIRM (nhập tay + ghi chú) / EXPERT_REVIEW (hội đồng) |

### R4 — Báo cáo

| Route | Tính năng |
|---|---|
| `/quan-tri/bao-cao` | Danh sách báo cáo theo kỳ (tháng/quý/năm/đột xuất) · tạo báo cáo · **"Tạo nháp AI"** (giả lập: tổng hợp hoạt động/nhiệm vụ/tin bài thành bản nháp 4 đoạn) · chốt (FINALIZED) · xuất Word/PDF/Excel (toast demo) + lịch sử xuất |

### R5 — Thống kê

| Route | Tính năng |
|---|---|
| `/quan-tri/thong-ke` | 5 biểu đồ (hoạt động theo đơn vị, xu hướng theo tháng, tiến độ nhiệm vụ, điểm thi đua, lượt xem tin bài) · lọc năm/quý · xuất Excel (toast demo) |

### R6 — Xếp hạng

| Route | Tính năng |
|---|---|
| `/quan-tri/bang-xep-hang` | Danh sách kỳ xếp hạng (DRAFT/FINALIZED) · tạo kỳ: chọn phạm vi + cấp đơn vị + kiểu BY_SCORE / BY_TASK_RESULT / BY_ACTIVITY_COUNT · bảng hạng NHÁP → **"Chốt kỳ"** → công khai tại `/bang-xep-hang` |

### R7 — Văn bản

| Route | Tính năng |
|---|---|
| `/quan-tri/van-ban` | Ban hành văn bản, chọn phạm vi nhận: ALL_DESCENDANTS / DIRECT_CHILDREN / SELECTED (chọn đơn vị cụ thể) · tab đã ban hành / đã nhận · **theo dõi tỷ lệ đã đọc** từng đơn vị · thu hồi · đánh dấu đã đọc |

### Thông báo

| Route | Tính năng |
|---|---|
| `/quan-tri/thong-bao` | Trung tâm thông báo: chưa đọc/đã đọc, đánh dấu đã đọc, đánh dấu tất cả · chuông 🔔 trên topbar có badge đếm · sinh tự động khi: giao nhiệm vụ, sắp hạn/qua hạn, kết quả được xác nhận/cần bổ sung, văn bản mới, tin đăng, phản ánh có trả lời |

### R8 — Phản ánh

| Route | Tính năng |
|---|---|
| `/quan-tri/phan-anh` | Hộp tiếp nhận theo trạng thái (Mới / Đang xử lý / Đã xử lý / Đóng) · tìm theo mã PA · thread trao đổi: **trả lời công khai** (người dân thấy) hoặc **ghi chú nội bộ** (chỉ cán bộ) · đổi trạng thái |

### R9 — Tài nguyên

| Route | Tính năng |
|---|---|
| `/quan-tri/tai-nguyen` | Quản lý kho tài nguyên: thêm/sửa/lưu trữ · bật/tắt công khai (`is_public`) · số lượt tải · phân loại tài nguyên |

### Hệ thống

| Route | Tính năng |
|---|---|
| `/quan-tri/he-thong/don-vi` | Cây tổ chức 4 cấp (mở/thu gom) · chi tiết đơn vị: code, cấp, địa bàn, loại trường · tài khoản thuộc đơn vị |
| `/quan-tri/he-thong/tai-khoan` | Danh sách tài khoản theo phạm vi · **tạo đơn lẻ** (vai trò tự theo cấp đơn vị) · **nhập từ file Excel/CSV** (kiểm tra từng dòng, bảng xem trước ✓/✗, file mẫu UTF-8) · duyệt / khóa / mở khóa theo trạng thái PENDING/ACTIVE/LOCKED/DISABLED |
| `/quan-tri/he-thong/phan-quyen` | Ma trận vai trò × 22 quyền gom theo module (Hoạt động/Nhiệm vụ/Đánh giá/Báo cáo/Xuất bản/Văn bản/Phản ánh/Tài nguyên/Hệ thống) — ánh xạ `role_permissions` |
| `/quan-tri/he-thong/danh-muc` | Quản lý bảng danh mục dùng chung: nhóm nội dung, nhóm văn bản, chủ đề phản ánh, loại tài nguyên, loại hình trường |
| `/quan-tri/he-thong/cai-dat` | Cấu hình hệ thống (`system_settings`): tên chương trình, link Học sinh 3 tốt, thông báo marquee trang chủ… |

## 4.4. Phân quyền theo phạm vi — áp dụng mọi trang

- `scopeIds(tài khoản)` = đơn vị của tôi + toàn bộ cấp dưới (mô phỏng materialized path `/1/12/25/31/`).
- `QUAN_TRI_TINH` Bình Dương: thấy 12 + 4 phường + các trường dưới phường + trường trực thuộc tỉnh (60); **không thấy** tỉnh khác.
- `DON_VI`: chỉ thao tác trên đơn vị của chính mình.
- `BIEN_TAP_VIEN`: thấy toàn bộ hoạt động đã xác nhận để biên tập, không thấy cấu hình hệ thống.
- Sidebar (`DashboardShell`) tự ẩn mục theo vai trò.
