# Cổng thông tin Thanh niên Trường học (TNTH)

Website cổng thông tin điện tử **Thanh niên Trường học** — Đoàn TNCS Hồ Chí Minh: công khai tin bài, quản lý hoạt động – thi đua 4 cấp Đoàn, diễn đàn ẩn danh cho đoàn viên, chương trình Học sinh 3 tốt, dự án tình nguyện, thi kiến thức trực tuyến.

> ⚠️ **Bản demo giao diện hoàn chỉnh** — chạy bằng dữ liệu mẫu trong bộ nhớ (mock store), chưa nối CSDL thật. Phù dụng trình duyệt chức năng, đào tạo và ra mắt; trước khi vận hành thật cần nối backend/CSDL (xem [Hạn chế & bước tiếp theo](#hạn-chế--bước-tiếp-theo)).

---

## Tính năng chính

### Công khai
- **Trang chủ** portal cao cấp: hero tối glow, stats bar kính mờ, tin tiêu điểm bento, carousel truyện ánh sáng, story-flow bảng số liệu đêm, infographic CountUp, fanbox Facebook nhúng thật, chatbot trợ lý ảo.
- **Tin tức** `/tin-tuc`: newsfeed 4 cột, tìm kiếm ⌘K, lọc chuyên mục, 6 nút chuyên mục đặc biệt (HSSV 3 tốt, Mỗi ngày một tin tốt, Khoa học trẻ…), nhập tin tự động từ đường link (đọc og:title/og:description/og:image).
- **Diễn đàn ẩn danh** `/dien-dan`: đoàn viên đăng bài/bình luận bằng **bí danh ngẫu nhiên** (không lộ danh tính), kèm ảnh (≤4×2MB) + video (≤1×15MB), thả cảm xúc; AI kiểm duyệt gắn cờ → hàng đợi duyệt của Ban biên tập; tác giả thấy khối "bị từ chối" kèm lý do.
- **Học sinh 3 tốt** `/hoc-sinh-3-tot`: hồ sơ thành tích theo 3 nhóm (Học tập · Rèn luyện · **Đạo đức**) và **12 tiêu chí phụ** có thống kê theo dõi; cấp trên AI xét duyệt hạng Xá/Tỉnh/Trung ương.
- **Dự án tình nguyện** `/du-an-tinh-nguyen`: nộp dự án kèm file báo cáo (≤5MB), tải **mẫu báo cáo phương pháp thực hiện (.doc)**, bản đồ 34 tỉnh vị trí dự án.
- **Thi kiến thức** `/thi-kien-thuc`: làm bài thật 7 dạng câu hỏi (trắc nghiệm, đúng/sai, điền khuyết, tự luận…), đề **thích ứng** theo năng lực, tự chấm + chấm tay tự luận.
- **Tài nguyên** `/tai-nguyen`: 4 nhóm (thiết kế · văn bản · truyền thông · biểu mẫu), lọc định dạng, văn bản chỉ đạo ISSUED tự xuất hiện trong nhóm "Tài nguyên văn bản", tải miễn phí.
- **Phản ánh** `/phan-anh`: gửi không cần đăng nhập, kèm minh chứng, tra cứu tiến độ theo mã `PA-2026-XXXXX`.
- **Bảng xếp hạng** `/bang-xep-hang`: podium Top 3, thanh glow, công bố theo tháng/quý.

### Khu quản trị `/quan-tri` (đăng nhập mới vào được)
| Nhóm | Phân hệ |
|---|---|
| Hoạt động | CRUD hoạt động, minh chứng, điểm danh QR, xác nhận cấp trên |
| Nội dung | Biên tập – xuất bản tin, duyệt đóng góp bài/tài nguyên của đoàn viên, quản lý tài nguyên |
| Nhiệm vụ | Bộ tiêu chí thi đua, cây nhiệm vụ nhiều cấp, phân bổ chỉ tiêu, chấm điểm từng điều kiện, **AI phân tích công văn → nháp giao việc** |
| Báo cáo | Báo cáo kỳ, bản nháp AI, xuất Word/Excel, thống kê biểu đồ, bảng xếp hạng |
| Văn bản | Ban hành văn bản theo phạm vi nhận, theo dõi đã đọc |
| Cộng đồng | Quản trị diễn đàn (duyệt/từ chối/ẩn), danh bạ Đoàn trường, dự án tình nguyện, hồ sơ HS3T + AI xét |
| Truyền thông | Nhà tài trợ (TW), kỳ thi (tạo đề theo ma trận độ khó + chuyên mục) |
| Giám sát | Dashboard trực tiếp (feed realtime + đèn đỏ quá hạn), nhắc deadline D-7/D-3, trung tâm thông báo |
| Hệ thống | Cây đơn vị 4 cấp, tài khoản (nhập Excel/CSV có kiểm tra lỗi), phân quyền, danh mục, cài đặt |

---

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **React 19** + TypeScript |
| Giao diện | **Tailwind CSS 4** (`@theme` trong `globals.css`, palette `doan` xanh #2563eb), framer-motion, swiper, lucide-react, recharts, react-qr-code |
| Font | Noto Serif (tiêu đề) + Be Vietnam Pro (nội dung) |
| CSDL | Mock store trong React Context (`src/lib/store-context.tsx`) — không persist, tải lại trang về dữ liệu mẫu |
| Xác thực | 6 tài khoản demo, phiên lưu `localStorage["tnth_demo_user"]` |
| API | 7 route: 5 AI (`/api/ai/*`), đọc bài từ link, gửi email (nodemailer, tùy chọn) |

## Chạy dự án

```bash
npm install        # Node.js >= 20.9
npm run dev        # http://localhost:3000
npm run build      # build production
npm run start      # chạy bản đã build
```

Biến môi trường (`.env.local`) — **đều tùy chọn**, không có cấu hình vẫn chạy demo đầy đủ:

| Biến | Dùng cho |
|---|---|
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Nối AI thật vào 5 route `/api/ai/*` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Gửi email kết quả phản ánh thật |

## Tài khoản demo — `/dang-nhap` (mật khẩu chung `demo123`)

| Tài khoản | Đơn vị | Vai trò |
|---|---|---|
| `tw.admin` | Ban TNTH — TW Đoàn | Quản trị Trung ương |
| `bd.province` | Tỉnh Đoàn Bình Dương | Quản trị cấp tỉnh |
| `hc.hiepthanh` | Đoàn Phường Hiệp Thành | Quản trị cấp 3 |
| `thpt.chanhphu` | Đoàn THPT Chánh Phú Hưng | Đơn vị cơ sở |
| `btv.tw` | Ban biên tập TW | Biên tập viên |
| `dv.demo` | Đoàn THPT Chánh Phú Hưng | Đoàn viên (diễn đàn + HS3T + tài khoản cá nhân) |

Đoàn viên có thể **tự đăng ký** tại `/dang-ky` (chọn đơn vị thuộc 3 cấp: tỉnh/thành phố · xã/phường/đặc khu · trường/cơ sở).

## Bản đồ trang (50 trang + 7 API)

**Công khai:** `/` · `/tin-tuc` (+`[slug]`) · `/dien-dan` (+`[id]`) · `/hoc-sinh-3-tot` · `/du-an-tinh-nguyen` · `/thi-kien-thuc` (+`[code]`) · `/tai-nguyen` · `/van-ban`* · `/bang-xep-hang` · `/phan-anh` (+`/tra-cuu`, `[code]`) · `/diem-danh/[activityId]` · `/gioi-thieu` · `/huong-dan` · `/dang-nhap` · `/dang-ky` · `/tai-khoan`

> \* Văn bản đã gộp vào `/tai-nguyen` theo nav mới; trang `/van-ban` còn giữ để truy cập trực tiếp.

**Quản trị `/quan-tri`:** tổng quan · `hoat-dong` (+`tao-moi`, `[id]`) · `xuat-ban` · `dong-gop` · `tai-nguyen` · `nhiem-vu` (+`phan-cong/[id]`, `xac-nhan`, `cham-diem`, `ai-phan-tich`) · `bao-cao` · `thong-ke` · `bang-xep-hang` · `van-ban` · `dien-dan` · `phan-anh` · `danh-ba` · `du-an` · `hs3t` · `tai-tro` · `thi` · `chuong-trinh` · `truc-tiep` · `thong-bao` · `he-thong/{don-vi, tai-khoan, phan-quyen, danh-muc, cai-dat}`

Phân quyền mô phỏng bằng `scopeIds(session)` = đơn vị + toàn bộ cấp dưới (materialized path) — mỗi role chỉ thấy dữ liệu phạm vi mình.

## Nối AI thật

Mỗi route `/api/ai/*` (phân tích công văn, nháp báo cáo, chatbot, kiểm duyệt diễn đàn, xét HS3T) có **duy nhất 1 hàm** để dán AI thật, kèm comment hướng dẫn mẫu OpenAI-compatible và Anthropic viết sẵn trong file:

```
src/app/api/ai/phan-tich-cong-van/route.ts   # analyzeWithAI()
src/app/api/ai/nhap-bao-cao/route.ts         # draftWithAI()
src/app/api/ai/chat/route.ts                 # replyWithAI()
src/app/api/ai/kiem-duyet/route.ts           # moderateWithAI()
src/app/api/ai/xet-hs3t/route.ts             # (prompt + parse JSON)
```

Không cấu hình key → tự chạy fallback rule-based, demo không bao giờ gãy.

## Kiến trúc

```
src/
├─ types/index.ts            # Entity khớp 43 bảng schema (OrgUnit, TaskAssignment, Score, ForumThread…)
├─ data/                     # Dữ liệu mẫu tiếng Việt, id khớp chéo giữa các bảng
├─ lib/                      # auth-context, store-context (state + ~40 action nghiệp vụ),
│                            # forum-media, hs3t-evaluate, quiz, ai-moderation, word-export…
├─ components/ui/            # Button, Card, Input, Modal, Tabs, Badge, Table…
├─ components/public/        # SiteHeader/Footer, HeroBanner, SpotlightBento, GlowCarousel,
│                            # StoryFlow, QuizRunner, AiChatWidget…
├─ components/dashboard/     # DashboardShell (guard + sidebar theo role), charts, setup-checklist
└─ app/                      # (public) · (dashboard) — route groups; dang-nhap, dang-ky; api/
```

## Triển khai lên tên miền thật

```bash
npm run build
npm run start        # hoặc: PORT=80 npm run start / đặt sau Nginx reverse proxy
```

Checklist trước khi chạy thật:

1. **Dữ liệu**: mock store chỉ nằm trong RAM — phải nối CSDL + API thật (tham chiếu `THIET-KE-SCHEMA (1).md`, 43 bảng) và thay `store-context` bằng data fetching.
2. **Xác thực**: hiện localStorage demo — cần hệ thống đăng nhập thật (hash mật khẩu, JWT/session, HTTPS).
3. **Media**: ảnh/video base64 trong demo → chuyển lên object storage (S3/MinIO) khi thật.
4. **AI/SMTP**: điền `.env.local` trên máy chủ, **không** commit key vào repo.
5. **Thương hiệu**: logo `public/logo.png`, link fanpage/hotline/email trong `site-footer.tsx`, tiêu đề trong `layout.tsx`.

## Hạn chế & bước tiếp theo

- Mọi hành động chỉ lưu trên trình duyệt trong phiên (tải lại = dữ liệu mẫu) — đúng thiết kế demo.
- Xuất Word/Excel thật (.doc/.xls dựng từ HTML), PDF và điểm danh QR là mô phỏng; email có route nodemailer thật nhưng mặc định tắt.
- Ảnh minh chứng dùng placeholder gradient.
- Lộ trình đề xuất: nối CSDL → xác thực thật → storage media → AI thật → triển khai.

## Tài liệu dự án

Bộ tài liệu đầy đủ tại [`docs/`](./docs/README.md):

| File | Nội dung |
|---|---|
| [docs/01-tong-quan-du-an.md](./docs/01-tong-quan-du-an.md) | Mục tiêu, phạm vi demo, công nghệ, cấu trúc thư mục |
| [docs/02-quy-trinh-nghiep-vu.md](./docs/02-quy-trinh-nghiep-vu.md) | Sơ đồ các luồng nghiệp vụ chính |
| [docs/03-tai-khoan-phan-quyen.md](./docs/03-tai-khoan-phan-quyen.md) | Mô hình 4 cấp, 6 vai trò, tạo tài khoản & nhập từ file |
| [docs/04-chuc-nang-he-thong.md](./docs/04-chuc-nang-he-thong.md) | Bản đồ trang + tính năng từng route |
| [docs/05-thiet-ke-du-lieu.md](./docs/05-thiet-ke-du-lieu.md) | Tóm tắt CSDL 43 bảng, ánh xạ prototype |
| [docs/xuat-van-ban-theo-the-thuc/](./docs/xuat-van-ban-theo-the-thuc/README.md) | Đề xuất xuất văn bản đúng Nghị định 30/2020/NĐ-CP |

---

© 2026 Ban Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh. Bản demo phục vụ trình duyệt chức năng, dữ liệu mẫu không phải dữ liệu thật.
