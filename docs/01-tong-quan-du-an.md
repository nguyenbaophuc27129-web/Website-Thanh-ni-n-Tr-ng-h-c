# 1. Tổng quan dự án

## 1.1. Mục tiêu

Xây dựng **website demo Chương trình Thanh niên Trường học** gồm 2 phần:

1. **Website công khai** — cổng thông tin chính thống của Chương trình: tin bài, văn bản,
   bảng xếp hạng, kho tài nguyên, hộp tiếp nhận phản ánh kiến nghị, tra cứu phản ánh theo mã.
2. **Khu quản trị** — hệ thống quản lý 4 cấp cho Đoàn: cập nhật hoạt động, giao–theo dõi
   nhiệm vụ/chỉ tiêu nhiều cấp, chấm điểm thi đua, xếp hạng, lập báo cáo, ban hành văn bản,
   xử lý phản ánh, quản lý tài nguyên và tài khoản.

Mục tiêu demo: trình **Ban Thanh niên Trường học — TW Đoàn** thấy được toàn bộ luồng nghiệp vụ
trước khi đầu tư làm bản chính thức có backend + CSDL.

## 1.2. Phạm vi và giới hạn

| Có trong demo | Chưa có (bản chính thức) |
|---|---|
| Toàn bộ giao diện + nghiệp vụ 9 phân hệ | Backend/API thật, PostgreSQL |
| Dữ liệu mẫu tiếng Việt khớp thiết kế CSDL 43 bảng | Đăng nhập mật khẩu thật, email, OTP |
| 5 tài khoản demo theo 5 vai trò, phân quyền theo cấp | Xác thực nhiều người dùng đồng thời |
| AI chat + nháp báo cáo AI (giả lập rule-based) | Tích hợp AI thật |
| Xuất Word/PDF/Excel (thông báo demo) | Xuất file thật theo thể thức — *xem Phần II* |
| Upload ảnh/file thật | Kho file lưu trữ |

## 1.3. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Giao diện | Tailwind CSS 4, lucide-react (icon), recharts (biểu đồ) |
| Font | Noto Serif (tiêu đề) + Be Vietnam Pro (nội dung) — hỗ trợ tiếng Việt |
| Dữ liệu | Mock data trong `src/data/`, quản lý trạng thái bằng React Context |
| Màu nhận diện | Đỏ #DA251D + vàng #FFCD29 (cờ, sao vàng) — website công khai; dashboard SaaS hiện đại |
| Parse file Excel | xlsx (SheetJS) — cho tính năng nhập tài khoản từ file |

## 1.4. Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production (31 route, không lỗi)
```

Yêu cầu: Node.js 18+. Không cần cấu hình CSDL, không cần biến môi trường.

## 1.5. Cấu trúc thư mục

```
tnth-website/
├─ src/
│  ├─ types/index.ts        # Entity khớp 43 bảng schema (OrgUnit, TaskAssignment, Score…)
│  ├─ data/                 # ~25 file mock tiếng Việt, id khớp chéo giữa các bảng
│  ├─ lib/
│  │  ├─ auth-context.tsx   # Đăng nhập mock 5 vai trò, lưu localStorage
│  │  ├─ store-context.tsx  # Toàn bộ state + nghiệp vụ (tạo/duyệt/xđ/chấm/xếp hạng…)
│  │  ├─ created-accounts.ts# Tài khoản tạo mới (đăng nhập được)
│  │  └─ utils.ts           # Định dạng ngày vi-VN, slug, mã phản ánh PA-2026-XXXXX…
│  ├─ components/
│  │  ├─ ui/                # Button, Card, Input, Modal, Tabs, Badge, Table…
│  │  ├─ public/            # Header/Footer, HeroBanner, NewsCard, AI chat
│  │  ├─ dashboard/         # Shell (sidebar theo vai trò), badge, biểu đồ, cây nhiệm vụ
│  │  └─ charts/            # 5 loại biểu đồ recharts
│  └─ app/
│     ├─ (public)/          # / tin-tuc van-ban phan-anh tai-nguyen bang-xep-hang…
│     ├─ (auth)/dang-nhap/  # Đăng nhập, bấm nhanh tài khoản demo
│     └─ (dashboard)/quan-tri/  # 19 trang quản trị theo phân hệ
└─ docs/                    # Bộ tài liệu này
```

## 1.6. Nguyên tắc triển khai prototype

- **Mọi trang là client component** đọc dữ liệu từ `StoreContext` — phản ánh tức thì giữa
  các trang (đăng bài → thấy ngay trên /tin-tuc) mà không cần server.
- **Phân quyền theo phạm vi**: `scopeIds(tài khoản)` = đơn vị của tôi + toàn bộ cấp dưới
  (mô phỏng materialized path `/1/12/25/31/` trong thiết kế CSDL).
- **Giữ đúng thiết kế CSDL**: tên entity, giá trị trạng thái (DRAFT/SUBMITTED,
  PENDING/CONFIRMED/NEEDS_INFO/REJECTED, AUTO_AGGREGATE/MANUAL_CONFIRM/EXPERT_REVIEW…)
  khớp `THIET-KE-SCHEMA (1).md` để bản chính thức map 1-1.
