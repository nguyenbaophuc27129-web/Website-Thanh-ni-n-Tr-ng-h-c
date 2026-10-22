# Cổng thông tin Thanh niên Trường học (TNTH)

Website cổng thông tin điện tử **Thanh niên Trường học** — Đoàn TNCS Hồ Chí Minh: công khai tin bài, quản lý hoạt động – thi đua 4 cấp Đoàn, diễn đàn ẩn danh cho đoàn viên, chương trình Học sinh 3 tốt, dự án tình nguyện, thi kiến thức trực tuyến.

**Hệ thống đã nối CSDL PostgreSQL thật**: đăng nhập qua bảng `accounts` + phiên `auth_sessions`, toàn bộ dữ liệu nghiệp vụ đồng bộ hai chiều giữa ứng dụng và CSDL qua API snapshot (chi tiết ở [Kiến trúc dữ liệu](#kiến-trúc-dữ-liệupostgresql)). Chưa cấu hình CSDL → web tự dùng dữ liệu mẫu trong bộ nhớ, demo không bao giờ gãy.

---

## Tính năng chính

### Công khai
- **Trang chủ** portal cao cấp: hero tối glow, stats bar kính mờ, tin tiêu điểm bento, carousel truyện ánh sáng, story-flow bảng số liệu đêm, infographic CountUp, fanbox Facebook nhúng thật, chatbot trợ lý ảo.
- **Tin tức** `/tin-tuc`: newsfeed 4 cột, tìm kiếm ⌘K, lọc chuyên mục, 6 nút chuyên mục đặc biệt (Gương mặt HSSV 3 tốt, Mỗi ngày một tin tốt, Khoa học trẻ, Công dân toàn cầu, Tôi là Đảng viên trẻ, Tin hoạt động Đoàn), nhập tin tự động từ đường link (đọc og:title/og:description/og:image).
- **Diễn đàn ẩn danh** `/dien-dan`: đoàn viên đăng bài/bình luận bằng **bí danh ngẫu nhiên** (không lộ danh tính), kèm ảnh (≤4×2MB) + video (≤1×15MB), thả cảm xúc; AI kiểm duyệt gắn cờ → hàng đợi duyệt của Ban biên tập; tác giả thấy khối "bị từ chối" kèm lý do.
- **Học sinh 3 tốt** `/hoc-sinh-3-tot`: hồ sơ thành tích theo quy chế TW (QĐ 317 + TB 630/2025) — 3 nhóm **Đạo đức · Học tập · Thể lực** và **12 tiêu chí phụ** có thống kê theo dõi, thêm mục **Thành tích khác** (chứng chỉ, công bố khoa học); tài liệu quy chế riêng tại `/hoc-sinh-3-tot/quy-che`; cấp trên AI xét duyệt hạng Xã/Tỉnh/Trung ương.
- **Dự án tình nguyện** `/du-an-tinh-nguyen`: nộp dự án kèm file báo cáo (≤5MB), tải **mẫu báo cáo phương pháp thực hiện (.doc)**, bản đồ 34 tỉnh vị trí dự án.
- **Thi kiến thức** `/thi-kien-thuc`: làm bài thật 7 dạng câu hỏi (trắc nghiệm, đúng/sai, điền khuyết, tự luận…), đề **thích ứng** theo năng lực, tự chấm + chấm tay tự luận.
- **Tài nguyên** `/tai-nguyen`: 4 nhóm (thiết kế · văn bản · truyền thông · biểu mẫu) + 2 nhóm clip tuyên truyền, lọc định dạng, văn bản chỉ đạo ISSUED tự xuất hiện trong nhóm "Tài nguyên văn bản", tải miễn phí.
- **Phản ánh** `/phan-anh`: gửi không cần đăng nhập, kèm minh chứng, tra cứu tiến độ theo mã `PA-2026-XXXXX`.
- **Bảng xếp hạng** `/bang-xep-hang`: podium Top 3, thanh glow, công bố theo tháng/quý.

### Khu quản trị `/quan-tri` (đăng nhập mới vào được)
| Nhóm | Phân hệ |
|---|---|
| Hoạt động | CRUD hoạt động, minh chứng, điểm danh QR, xác nhận cấp trên |
| Nội dung | Biên tập – xuất bản tin, duyệt đóng góp bài/tài nguyên của đoàn viên, quản lý tài nguyên |
| Nhiệm vụ | Bộ tiêu chí thi đua, cây nhiệm vụ nhiều cấp, phân bổ chỉ tiêu, chấm điểm từng điều kiện, **AI phân tích công văn → lượng hoá chỉ tiêu/KPI → nháp giao việc** |
| Báo cáo | Báo cáo kỳ, bản nháp AI, xuất Word/Excel, thống kê biểu đồ, bảng xếp hạng |
| Văn bản | Ban hành văn bản theo phạm vi nhận, theo dõi đã đọc, thông báo văn bản mới |
| Cộng đồng | Quản trị diễn đàn (duyệt/từ chối/ẩn), danh bạ Đoàn trường, dự án tình nguyện, hồ sơ HS3T + AI xét |
| Truyền thông | Kỳ thi (tạo đề theo ma trận độ khó + chuyên mục) |
| Giám sát | Dashboard trực tiếp (feed realtime + đèn đỏ quá hạn), nhắc deadline D-7/D-3, trung tâm thông báo |
| Hệ thống | Cây đơn vị 4 cấp, tài khoản (nhập Excel/CSV có kiểm tra lỗi, khoá/mở), phân quyền theo chức danh, danh mục, cài đặt |

> Chức năng **"Cấp và tra cứu chứng nhận"** và **quản lý nhà tài trợ** đã được bãi bỏ theo yêu cầu giai đoạn 01 (không còn route, không còn bảng dữ liệu tương ứng).

---

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **React 19** + TypeScript |
| Giao diện | **Tailwind CSS 4** (`@theme` trong `globals.css`, palette `doan` xanh #2563eb), framer-motion, swiper, lucide-react, recharts, react-qr-code |
| Font | Noto Serif (tiêu đề) + Be Vietnam Pro (nội dung) |
| CSDL | **PostgreSQL** qua `pg` (pool, SSL theo tunnel) — schema 43 bảng, migrations 0002–0013 trong `db/migrations/` |
| Xác thực | Đăng nhập DB thật: mật khẩu scrypt, phiên cookie `tnth_session` httpOnly (DB chỉ lưu SHA-256); mất mạng tự fallback tài khoản demo `localStorage` |
| API | 14 route: 5 AI (`/api/ai/*`), xác thực (`/api/auth/*`), tài khoản (`/api/accounts`), đồng bộ store (`/api/store`), đọc bài từ link, gửi email (nodemailer, tùy chọn) |

## Chạy dự án

```bash
npm install        # Node.js >= 20.9 (khuyến nghị 24 — chạy được các script .mts)
npm run dev        # http://localhost:3000
npm run build      # build production
npm run start      # chạy bản đã build
```

Biến môi trường (`.env.local`) — **đều tùy chọn**, không có cấu hình vẫn chạy demo đầy đủ bằng dữ liệu mẫu:

| Biến | Dùng cho |
|---|---|
| `DATABASE_URL` | Nối PostgreSQL (VD qua SSH tunnel: `postgres://user:pass@127.0.0.1:5433/tnth_dev?sslmode=disable`) |
| `AI_PROVIDER` | `gemini` (mặc định) hoặc `claude` |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | AI thật cho 5 route `/api/ai/*` (`AI_MODEL` đổi model nếu cần) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Gửi email kết quả phản ánh thật |

## Danh sách tài khoản mẫu (Môi trường phát triển & Thử nghiệm)

> [!IMPORTANT]
> Mật khẩu dùng thử chỉ phục vụ phát triển nội bộ. Khi đưa vào vận hành thí điểm chính thức, quản trị viên bắt buộc phải cấu hình mật khẩu mạnh riêng biệt và tuân thủ [Hướng dẫn triển khai an toàn](./db/DEPLOY-PROD.md).

| Tài khoản | Đơn vị | Vai trò |
|---|---|---|
| `tw.admin` | Ban TNTH — TW Đoàn | Quản trị Trung ương |
| `bd.province` | Tỉnh Đoàn Bình Dương | Quản trị cấp tỉnh |
| `hc.hiepthanh` | Đoàn Phường Hiệp Thành | Quản trị cấp 3 |
| `thpt.chanhphu` | Đoàn THPT Chánh Phú Hưng | Đơn vị cơ sở |
| `btv.tw` | Ban biên tập TW | Biên tập viên |
| `dv.demo` | Đoàn THPT Chánh Phú Hưng | Đoàn viên (diễn đàn + HS3T + tài khoản cá nhân) |
| `cv.hs3t`, `cv.kiemtra`, `ctv.tintuc`, `ctv.duan` | TW | 4 tài khoản TW giới hạn quyền theo chức danh (thử phân quyền) |

Ngoài ra DB còn có tài khoản minh hoạ (ids 101+, đủ trạng thái PENDING/LOCKED/DISABLED) và 2 học sinh mô phỏng `hs.mophong1/2` (ids 901/902 — hồ sơ HS3T mẫu gắn vào đây).

Đoàn viên có thể **tự đăng ký** tại `/dang-ky` (ghi thẳng vào DB; chọn đơn vị thuộc 3 cấp: tỉnh/thành phố · xã/phường/đặc khu · trường/cơ sở).

## Kiến trúc dữ liệu — PostgreSQL

### Đồng bộ hai chiều store ↔ CSDL

Ứng dụng giữ state phía client (React Context). Khi có CSDL:

1. **Mở web** → `store-context` gọi `GET /api/store` nạp snapshot từ DB (DB thắng khi có dữ liệu; khách chưa đăng nhập chỉ nhận nhóm public).
2. **Mọi thay đổi** (đăng bài, phản ánh, HS3T, thi, chấm điểm…) → tự đẩy `POST /api/store` sau 1,2 giây debounce, **theo nhóm kín khoá ngoại** (VD sửa hoạt động = đẩy kèm liên kết chuyên mục, link, điểm danh, tin bài) trong **1 transaction** (xoá-đi-chèn-lại đúng thứ tự FK).
3. **DB trống + admin đăng nhập lần đầu** → app tự đẩy toàn bộ dữ liệu mẫu lên DB (không cần nạp tay).
4. **Mất kết nối DB** → mọi thao tác vẫn chạy trên bộ nhớ, demo không gãy.

Bảng ánh xạ 35 entity nằm ở `src/lib/server/store-tables.ts` (mỗi entity: bảng đích + kiểu từng cột + xử lý riêng: `bigint[]` ↔ number[], DATE ↔ chuỗi ngày, CHECK STAFF/CITIZEN của phản ánh…).

### Migrations

`db/migrations/0002–0013` — chạy bằng runner tích hợp (tự ghi bảng `schema_migrations`, idempotent):

```bash
node scripts/db-migrate.mjs          # áp các file chưa chạy
node scripts/db-migrate.mjs --list   # xem trạng thái
```

File SQL là **bất biến** — sửa schema mới luôn thêm file, không sửa file cũ. Chi tiết triển khai lên CSDL thật xem [`db/DEPLOY-PROD.md`](./db/DEPLOY-PROD.md).

### Script hỗ trợ (yêu cầu `DATABASE_URL` + tunnel nếu DB ở xa)

| Script | Công dụng |
|---|---|
| `node scripts/db-check.mjs` | Kiểm tra kết nối + phân vùng |
| `node scripts/db-introspect.mjs [bảng]` | Soi cấu trúc bảng/ràng buộc thật trước khi viết SQL |
| `node scripts/db-migrate.mjs` | Chạy migrations |
| `node scripts/db-seed-dev.mts` | Seed đơn vị + tài khoản cho **tnth_dev** (KHÔNG chạy trên prod) |
| `node scripts/db-smoke-sync.mts [port]` | Smoke 28 bước: đăng nhập, sync toàn bộ 35 entity, roundtrip kiểu dữ liệu, ghi công khai, đăng ký + khoá TK (exit 1 nếu fail) |

## Bản đồ trang (52 trang + 14 API)

**Công khai:** `/` · `/tin-tuc` (+`[slug]`) · `/dien-dan` (+`[id]`) · `/hoc-sinh-3-tot` (+`/quy-che`) · `/du-an-tinh-nguyen` · `/thi-kien-thuc` (+`[code]`) · `/tai-nguyen` · `/van-ban`* · `/bang-xep-hang` · `/phan-anh` (+`/tra-cuu`, `[code]`) · `/diem-danh/[activityId]` · `/gioi-thieu` · `/huong-dan` · `/dang-nhap` · `/dang-ky` · `/tai-khoan`

> \* Văn bản đã gộp vào `/tai-nguyen` theo nav mới; trang `/van-ban` còn giữ để truy cập trực tiếp.

**Quản trị `/quan-tri`:** tổng quan · `hoat-dong` (+`tao-moi`, `[id]`) · `xuat-ban` · `dong-gop` · `tai-nguyen` · `nhiem-vu` (+`phan-cong/[id]`, `xac-nhan`, `cham-diem`, `ai-phan-tich`) · `bao-cao` · `thong-ke` · `bang-xep-hang` · `van-ban` · `dien-dan` · `phan-anh` · `danh-ba` · `du-an` · `hs3t` · `thi` · `chuong-trinh` · `truc-tiep` · `thong-bao` · `he-thong/{don-vi, tai-khoan, phan-quyen, danh-muc, cai-dat}`

Phân quyền: quyền theo vai trò + bảng 15 chức danh TW (`src/data/chuc-danh-quyen.ts`) — tài khoản TW khớp chức danh là giới hạn đúng nhóm quyền; tài khoản cơ sở luôn dùng quyền vai trò. Dữ liệu giới hạn theo `scopeIds(session)` = đơn vị + toàn bộ cấp dưới (materialized path).

## Nối AI thật

5 route `/api/ai/*` (phân tích công văn, nháp báo cáo, chatbot, kiểm duyệt diễn đàn, xét HS3T) gọi AI thật qua lớp dùng chung `src/lib/ai-client.ts` (Gemini mặc định hoặc Claude, đổi bằng `AI_PROVIDER`):

- **Phân tích công văn** → tự lượng hoá thành chỉ tiêu/KPI + thời hạn cho từng cấp (nháp giao việc).
- **Xét HS3T** → đề xuất hạng kèm lý do, luôn neo theo kết quả tính rule theo quy chế.
- Không cấu hình key → tự chạy fallback rule-based, demo không bao giờ gãy.

## Triển khai lên tên miền thật

```bash
npm run build
npm run start        # hoặc: PORT=80 npm run start / đặt sau Nginx reverse proxy
```

Checklist triển khai:

1. **CSDL**: chạy `db/migrations/0002–0013` trên CSDL thật (hướng dẫn chi tiết + lưu ý schema tại [`db/DEPLOY-PROD.md`](./db/DEPLOY-PROD.md)), tạo tài khoản ban đầu, điền `DATABASE_URL` vào `.env.local`.
2. **AI/SMTP**: điền key vào `.env.local` trên máy chủ, **không** commit key vào repo.
3. **Media**: ảnh/video đang lưu base64 trong DB (dữ liệu mẫu) → chuyển lên object storage (S3/MinIO) khi sản lượng tăng.
4. **Thương hiệu**: logo `public/logo.png`, link fanpage/hotline/email trong `site-footer.tsx`, tiêu đề trong `layout.tsx`.
5. **Kiểm tra sau triển khai**: `node scripts/db-smoke-sync.mts [port]` — 28/28 PASS là sẵn sàng.

## Tài liệu dự án

| File | Nội dung |
|---|---|
| [`db/DEPLOY-PROD.md`](./db/DEPLOY-PROD.md) | Danh sách migration + các bước đưa DB vào vận hành thật |
| [`db/README.md`](./db/README.md) | Schema gốc + quy ước làm việc với CSDL |
| [`docs/01-tong-quan-du-an.md`](./docs/01-tong-quan-du-an.md) | Mục tiêu, phạm vi, công nghệ, cấu trúc thư mục |
| [`docs/02-quy-trinh-nghiep-vu.md`](./docs/02-quy-trinh-nghiep-vu.md) | Sơ đồ các luồng nghiệp vụ chính |
| [`docs/03-tai-khoan-phan-quyen.md`](./docs/03-tai-khoan-phan-quyen.md) | Mô hình 4 cấp, 6 vai trò, tạo tài khoản & nhập từ file |
| [`docs/04-chuc-nang-he-thong.md`](./docs/04-chuc-nang-he-thong.md) | Bản đồ trang + tính năng từng route |
| [`docs/05-thiet-ke-du-lieu.md`](./docs/05-thiet-ke-du-lieu.md) | Tóm tắt CSDL 43 bảng, ánh xạ prototype |
| [`docs/xuat-van-ban-theo-the-thuc/`](./docs/xuat-van-ban-theo-the-thuc/README.md) | Đề xuất xuất văn bản đúng Nghị định 30/2020/NĐ-CP |

---

© 2026 Ban Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh.
