# Website Thanh niên Trường học (Prototype demo)

Prototype giao diện đầy đủ chức năng theo đặc tả CSDL (43 bảng) và dự thảo chức năng của Chương trình **Thanh niên Trường học** — Đoàn TNCS Hồ Chí Minh. Chạy hoàn toàn bằng **mock data**, không cần backend/CSDL.

## Chạy dự án

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build production
```

## Công nghệ

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS 4 (`@theme`: palette `doan` đỏ #DA251D, `vang` vàng #FFCD29)
- lucide-react, recharts
- Fonts: Noto Serif (tiêu đề) + Be Vietnam Pro (nội dung), hỗ trợ tiếng Việt

## Tài khoản demo (đăng nhập `/dang-nhap`, mật khẩu chung `demo123`)

| Tài khoản | Đơn vị | Vai trò |
|---|---|---|
| `tw.admin` | Ban TNTH — TW Đoàn | QUAN_TRI_TW |
| `bd.province` | Tỉnh Đoàn Bình Dương | QUAN_TRI_TINH |
| `hc.hiepthanh` | Đoàn Phường Hiệp Thành | QUAN_TRI_CAP3 |
| `thpt.chanhphu` | Đoàn THPT Chánh Phú Hưng | DON_VI |
| `btv.tw` | Ban biên tập TW | BIEN_TAP_VIEN |

Phiên đăng nhập lưu `localStorage["tnth_demo_user"]`.

## Bản đồ trang

**Website công khai** (`(public)`): `/` trang chủ · `/tin-tuc` (+ chi tiết) · `/van-ban` · `/phan-anh` (+ tra cứu mã `PA-2026-XXXXX` + thread) · `/tai-nguyen` · `/bang-xep-hang` · `/gioi-thieu` · AI chat widget (rule-based).

**Khu quản trị** (`(dashboard)/quan-tri`, yêu cầu đăng nhập):

| Route | Chức năng |
|---|---|
| `/quan-tri` | Tổng quan: StatCards + 4 biểu đồ + cảnh báo quá hạn |
| `/quan-tri/hoat-dong` | R1 — CRUD hoạt động, nộp, xác nhận cấp trên |
| `/quan-tri/xuat-ban` | R2 — biên tập bài từ hoạt động đã xác nhận, đăng/gỡ/nổi bật |
| `/quan-tri/nhiem-vu` | R3 — bộ tiêu chí, cây nhiệm vụ I→I.1, giao chỉ tiêu nhiều cấp |
| `/quan-tri/nhiem-vu/phan-cong/[id]` | Phân bổ chỉ tiêu (60 = 25+20+15), cập nhật kết quả append-only |
| `/quan-tri/nhiem-vu/xac-nhan` | Hàng chờ xác nhận / yêu cầu bổ sung / trả lại |
| `/quan-tri/nhiem-vu/cham-diem` | 3 phương thức: AUTO_AGGREGATE · MANUAL_CONFIRM · EXPERT_REVIEW |
| `/quan-tri/bao-cao` | R4 — báo cáo kỳ + "Tạo nháp AI" (giả lập) + xuất Word/PDF/Excel |
| `/quan-tri/thong-ke` | R5 — 4 biểu đồ + lọc kỳ + xuất Excel |
| `/quan-tri/bang-xep-hang` | R6 — tổng hợp kỳ BXH từ điểm, "chốt kỳ" công bố |
| `/quan-tri/van-ban` | R7 — ban hành theo recipient_scope, theo dõi đã đọc |
| `/quan-tri/thong-bao` | Trung tâm thông báo + chuông topbar |
| `/quan-tri/phan-anh` | R8 — hộp tiếp nhận, thread + ghi chú nội bộ, đổi trạng thái |
| `/quan-tri/tai-nguyen` | R9 — kho tài liệu, is_public, download_count |
| `/quan-tri/he-thong/…` | Cây đơn vị 4 cấp · tài khoản (tạo mới + nhập từ file Excel/CSV, kiểm tra đủ cột, xem trước lỗi) · ma trận phân quyền · danh mục · cài đặt |

## Phạm vi giả lập

- AI chat + bản nháp báo cáo AI = rule-based/spinner (mock)
- Xuất Word/PDF/Excel, gửi email = toast thông báo
- Ảnh = gradient placeholder; không có API route — mọi trang là client component đọc từ `StoreContext`

## Kiến trúc

```
src/
├─ types/index.ts        # Entity khớp 43 bảng schema (OrgUnit, TaskAssignment, Score…)
├─ data/                 # Mock data tiếng Việt, id khớp chéo giữa các bảng
├─ lib/                  # auth-context (5 role), store-context (state + nghiệp vụ), toast, utils
├─ components/ui         # Button, Card, Input, Modal, Tabs, Badge, Table…
├─ components/public     # SiteHeader/Footer, HeroBanner, NewsCard, AiChatWidget
├─ components/dashboard  # DashboardShell (guard + sidebar theo role), badges, charts
└─ app/                  # (public) · (auth) · (dashboard) — route groups
```

Phân quyền mô phỏng bằng `scopeIds(session)` = đơn vị + toàn bộ cấp dưới (materialized path). Tài liệu tham chiếu: `THIET-KE-SCHEMA (1).md` tại thư mục gốc dự án.

## Tài liệu dự án

Bộ tài liệu đầy đủ cho người đọc (bản demo trình Ban TNTH — TW Đoàn) tại [`docs/`](./docs/README.md):

| File | Nội dung |
|---|---|
| [docs/01-tong-quan-du-an.md](./docs/01-tong-quan-du-an.md) | Mục tiêu, phạm vi demo, công nghệ, cấu trúc thư mục |
| [docs/02-quy-trinh-nghiep-vu.md](./docs/02-quy-trinh-nghiep-vu.md) | Sơ đồ 6 luồng nghiệp vụ chính |
| [docs/03-tai-khoan-phan-quyen.md](./docs/03-tai-khoan-phan-quyen.md) | Mô hình 4 cấp, 5 vai trò, tạo tài khoản & nhập từ file |
| [docs/04-chuc-nang-he-thong.md](./docs/04-chuc-nang-he-thong.md) | Bản đồ trang + tính năng từng route |
| [docs/05-thiet-ke-du-lieu.md](./docs/05-thiet-ke-du-lieu.md) | Tóm tắt CSDL 43 bảng, 8 phân hệ, ánh xạ prototype |
| [docs/xuat-van-ban-theo-the-thuc/](./docs/xuat-van-ban-theo-the-thuc/README.md) | Đề xuất tính năng xuất văn bản đúng thể thức (Nghị định 30/2020/NĐ-CP) |
