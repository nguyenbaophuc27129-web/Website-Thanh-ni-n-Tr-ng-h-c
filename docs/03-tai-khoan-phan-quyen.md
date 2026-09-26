# 3. Tài khoản và phân quyền

## 3.1. Mô hình tổ chức 4 cấp

```
Cấp 1  Ban TNTH — TW Đoàn (id 1)          Ban Biên tập Cổng TNTH (id 2)
   │
   ├─ Cấp 2  Tỉnh Đoàn Bình Dương (12) · TP.HCM (13) · Bắc Giang (14)
   │         Nghệ An (15) · Đà Nẵng (16)
   │             │
   │             ├─ Cấp 3  Đoàn Phường Hiệp Thành (25), Phú Hòa (26),
   │             │         Tương Bình Hiệp (27), Hiệp An (28)…
   │             │
   │             └─ Cấp 4  Đoàn Trường THPT Chánh Phú Hưng (31),
   │                       THCS Hiệp Thành (32)…
   │
   └─ Cấp 4 TRỰC THUỘC TỈNH: THPT Chuyên Bình Dương (60)
            (trường chuyên/PTDTNT do tỉnh quản lý trực tiếp — không qua phường)
```

- Cây đơn vị lưu theo **materialized path** (schema 5.1: cột `path` `/1/12/25/31/`,
  trigger tự sinh) — truy vấn "toàn bộ cấp dưới" bằng `LIKE '/1/12/%'`.
- **Quy tắc 1 đơn vị = 1 tài khoản** (schema 5.2: `org_unit_id` ràng buộc UQ).
- Mỗi đơn vị có: `code` (mã, dùng khi import Excel), tên đầy đủ, tên ngắn,
  cấp, địa bàn hành chính, loại trường (chỉ cấp 4), trạng thái hoạt động.

## 3.2. Vai trò (roles)

| Mã vai trò | Tên | Đơn vị gắn | Nhiệm vụ chính |
|---|---|---|---|
| `QUAN_TRI_TW` | Quản trị Trung ương | Ban TNTH TW | Toàn quyền: cấu hình, phân cấp, chấm điểm TW, chốt xếp hạng quốc gia |
| `QUAN_TRI_TINH` | Quản trị Tỉnh/Thành | Tỉnh Đoàn | Giao nhiệm vụ xuống cấp 3, xác nhận báo cáo, chấm điểm tỉnh, xếp hạng địa bàn |
| `QUAN_TRI_CAP3` | Quản trị cấp Phường/Xã | Đoàn Phường | Quản lý trường thuộc địa bàn, chia chỉ tiêu, xác nhận kết quả trường |
| `DON_VI` | Đơn vị cơ sở | Đoàn Trường | Cập nhật hoạt động, cập nhật kết quả chỉ tiêu, lập báo cáo |
| `BIEN_TAP_VIEN` | Biên tập viên | Ban Biên tập | Biên tập, đăng/gỡ tin bài công khai, quản lý tài nguyên |

## 3.3. Phân quyền theo phạm vi dữ liệu (quan trọng nhất)

Quyền = **vai trò** × **phạm vi đơn vị**:

- `QUAN_TRI_TINH` tại Bình Dương thấy được: Bình Dương (12) + 4 phường + tất cả trường
  dưới các phường + trường trực thuộc tỉnh (60) — **không thấy** TP.HCM hay Bắc Giang.
- `DON_VI` chỉ thao tác trên đơn vị của chính mình.
- Khi chia chỉ tiêu: tổng chỉ tiêu giao cho cấp con **không được vượt** chỉ tiêu của mình.

Ma trận quyền chức năng chi tiết: xem trang **Hệ thống → Phân quyền** trong hệ thống
(ma trận vai trò × 22 quyền, gom theo module Hoạt động/Nhiệm vụ/Đánh giá/Báo cáo/
Xuất bản/Văn bản/Phản ánh/Tài nguyên/Hệ thống — ánh xạ bảng `role_permissions`).

## 3.4. Tạo tài khoản

**Cách 1 — Tạo đơn lẻ** (trang Hệ thống → Tài khoản → "Thêm tài khoản"):

1. Chọn đơn vị trong phạm vi của mình (Tỉnh thấy phường + trường; cấp 3 thấy trường;
   TW thấy từ cấp tỉnh trở xuống). Trường trực thuộc tỉnh nằm ngay trong danh sách.
2. Vai trò **tự theo cấp đơn vị**: cấp 2 → Quản trị Tỉnh, cấp 3 → Quản trị cấp 3, cấp 4 → Đơn vị cơ sở.
3. Nhập: username (≥3 ký tự: chữ, số, `.`, `_`, `-`), password, họ tên, email, SĐT, chức vụ, trạng thái.

**Cách 2 — Nhập từ file Excel/CSV** (nút "Nhập từ file"):

- Cột **y chang schema 5.2 `accounts` + `account_roles`**:

```csv
username,email,phone,password,org_unit_code,contact_person,contact_position,role_code,status
thpt.chuyenbd,chuyenbd@bd.edu.vn,0918000111,demo123,BD-THPT-CHUYEN,Trần Đăng Khoa,Bí thư Đoàn Trường,DON_VI,ACTIVE
thcs.kimdong,kimdong@bd.edu.vn,0918000222,demo123,BD-HT-TH-KD,Lý Thị Hoa,Tổng phụ trách Đội,DON_VI,ACTIVE
```

- Bắt buộc: `username`, `email`, `password`, `org_unit_code` (tra `org_units.code`).
  Tùy chọn: `phone`, `contact_person`, `contact_position`, `role_code`, `status`.
- Hệ thống kiểm tra **từng dòng** rồi hiện bảng xem trước ✓/✗ kèm lý do:
  trùng username/email (UQ), đơn vị đã có tài khoản (1 đơn vị = 1 TK),
  `org_unit_code` không thuộc phạm vi, vai trò không khớp cấp đơn vị.
- Chỉ dòng hợp lệ được nhập; file mẫu tải ngay trong hộp thoại (UTF-8, mở Excel chuẩn).
- Nhận thêm biệt danh cột tiếng Việt (`ten_dang_nhap`, `ho_ten`, `ma_don_vi`…).

**Đăng nhập:** tài khoản tạo mới đăng nhập được ngay tại `/dang-nhap`
với mật khẩu đã đặt (mặc định `demo123`), có đủ phân quyền theo đơn vị/role.

## 3.5. Quản lý trạng thái tài khoản

| Trạng thái | Ý nghĩa | Thao tác |
|---|---|---|
| `PENDING` | Chờ duyệt | "Duyệt" → ACTIVE |
| `ACTIVE` | Đang hoạt động | "Khóa" → LOCKED |
| `LOCKED` | Bị khóa (sai mật khẩu nhiều lần — `failed_login_count`, `locked_until`) | "Mở khóa" → ACTIVE |
| `DISABLED` | Vô hiệu hóa | — |

## 3.6. Tài khoản demo

Đăng nhập tại `/dang-nhap` (bấm nhanh 1 trong 5 thẻ, hoặc nhập tay):

| Username | Đơn vị | Vai trò | Dùng để demo |
|---|---|---|---|
| `tw.admin` | Ban TNTH — TW Đoàn | QUAN_TRI_TW | Toàn quyền, cài đặt hệ thống, văn bản toàn quốc |
| `bd.province` | Tỉnh Đoàn Bình Dương | QUAN_TRI_TINH | Giao/chia chỉ tiêu, xác nhận, chấm điểm, BXH tỉnh |
| `hc.hiepthanh` | Đoàn P. Hiệp Thành | QUAN_TRI_CAP3 | Quản lý trường, xác nhận trường |
| `thpt.chanhphu` | Đoàn THPT Chánh Phú Hưng | DON_VI | Tạo hoạt động, cập nhật kết quả, báo cáo |
| `btv.tw` | Ban Biên tập TW | BIEN_TAP_VIEN | Xuất bản tin bài, tài nguyên |

Mật khẩu chung: `demo123`. Phiên lưu `localStorage` (prototype).

> Các tài khoản tạo mới (đơn lẻ hoặc từ file) nằm trong cùng danh sách
> Hệ thống → Tài khoản, lọc theo phạm vi như tài khoản thường.
