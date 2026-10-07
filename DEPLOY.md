# Vận hành máy chủ — Cổng TNTH

Tài liệu cho người vận hành và người phát triển. Toàn bộ website chạy trên một máy bằng Docker Compose.

## Sơ đồ

```
Internet ──► cổng 80/443 ──► proxy (Caddy) ──► web (Next.js, cổng 3000 nội bộ)
SSH tunnel (cổng 24700) ───────────────────────► db (PostgreSQL, 127.0.0.1:5432)
```

| Thành phần | Chi tiết |
|---|---|
| Máy chủ | Ubuntu 24.04, IP `103.216.116.242`, SSH cổng `24700` |
| Thư mục mã nguồn | `/root/Website-Thanh-ni-n-Tr-ng-h-c` |
| `web` | Image `tnth-web:current`, build từ `Dockerfile` (Next.js `output: "standalone"`), chạy bằng user `node`, hệ thống file chỉ đọc |
| `proxy` | `caddy:2-alpine`, cấu hình tại `deploy/Caddyfile`, là dịch vụ duy nhất mở cổng ra ngoài |
| `db` | `postgres:16-alpine`, chỉ nghe ở `127.0.0.1:5432`. **Web hiện chưa dùng database**: bản demo vẫn lưu dữ liệu trên trình duyệt người dùng |

Cả hai container có `restart: unless-stopped` và Docker tự bật cùng máy, nên web tự lên lại sau khi máy khởi động lại hoặc tiến trình bị lỗi.

## Lệnh thường dùng

Chạy tại thư mục mã nguồn.

| Việc | Lệnh |
|---|---|
| Cập nhật bản mới từ GitHub | `deploy/deploy.sh --pull` |
| Build lại mã đang có trên máy | `deploy/deploy.sh` |
| Quay về bản trước | `deploy/rollback.sh` |
| Quay về một bản cụ thể | `deploy/rollback.sh <tag>` (danh sách tag trong `deploy/.releases`) |
| Xem trạng thái | `docker compose ps` |
| Xem log ứng dụng | `docker compose logs -f web` |
| Xem log truy cập | `docker compose logs -f proxy` |
| Khởi động lại | `docker compose restart` |
| Dừng hẳn | `docker compose down` |

`deploy.sh` gắn tag image theo mã commit, giữ 5 bản gần nhất. Mỗi lần cập nhật web gián đoạn vài giây.

## Biến môi trường (AI, email)

1. `cp deploy/env.production.example .env.production`
2. Điền key cần dùng (xem chú thích trong file).
3. `docker compose up -d` để nạp lại.

`.env.production` không được commit (đã nằm trong `.gitignore`).

Lưu ý trước khi bật:
- `/api/ai/*` và `/api/send-email` **không yêu cầu đăng nhập**. Bật AI mà không giới hạn tần suất thì người ngoài có thể đốt hạn mức; bật SMTP thì người ngoài gửi được thư tuỳ ý qua hộp thư của đơn vị. Cần thêm xác thực hoặc giới hạn tần suất trước.

## Gắn tên miền và HTTPS

Điều kiện: `thanhnientruonghoc.io.vn` đã được cấp phát và có hai bản ghi A (`@` và `www`) trỏ về `103.216.116.242`.

1. Tạo file `.env` ở thư mục mã nguồn với nội dung:
   ```
   SITE_ADDRESS=thanhnientruonghoc.io.vn, www.thanhnientruonghoc.io.vn
   ```
2. `docker compose up -d`

Caddy tự xin chứng chỉ Let's Encrypt, tự gia hạn và tự chuyển HTTP sang HTTPS. Chứng chỉ nằm trong volume `tnth_caddy_data`.

## PostgreSQL

Service `db` (`postgres:16-alpine`) chạy cùng Compose, dữ liệu nằm trong volume `tnth_db_data`. Cổng 5432 chỉ gắn vào `127.0.0.1` của máy chủ; từ xa chỉ vào được qua SSH tunnel.

| Database | Chủ sở hữu | Ai dùng |
|---|---|---|
| `tnth_prod` | `tnth_app` | Web chính thức (khi có backend). `coder_readonly` được đọc. |
| `tnth_dev` | `coder_dev` | Lập trình viên, toàn quyền trong database này. |

Mật khẩu nằm trong `secrets/db.env`; bảng tổng hợp để gửi cho coder ở `secrets/TAI-KHOAN-DB.md`. Thư mục `secrets/` chỉ root đọc được và không được commit.

| Việc | Lệnh |
|---|---|
| Khởi tạo lại tài khoản, quyền, schema (chạy lại an toàn) | `deploy/db-init.sh` |
| Đổi mật khẩu | Sửa `secrets/db.env` rồi chạy `deploy/db-init.sh` |
| Sao lưu ngay | `deploy/db-backup.sh` |
| Khôi phục một database (xoá nội dung hiện có) | `deploy/db-restore.sh <tnth_dev\|tnth_prod> <file.dump>` |
| Đưa `tnth_dev` về schema v1 sạch | `deploy/db-restore.sh tnth_dev /var/backups/tnth/baseline/tnth_dev-schema_v1.dump` |
| Chép dữ liệu thật sang `tnth_dev` | `deploy/db-clone-prod-to-dev.sh` |
| Mở dòng lệnh SQL quản trị | `docker compose exec db psql -U postgres -d tnth_prod` |
| Cho coder quyền mở tunnel | `deploy/setup-ssh-tunnel-user.sh "<khoá công khai của coder>"` |
| Thu hồi quyền tunnel | Xoá dòng khoá trong `/home/tnth-tunnel/.ssh/authorized_keys` |

Sao lưu:
- Cron `/etc/cron.d/tnth-db` chạy `deploy/db-backup.sh` lúc 02:30 mỗi đêm, giữ 14 ngày tại `/var/backups/tnth/`, log ở `/var/log/tnth-db-backup.log`.
- Cùng lúc đó tạo trước phân vùng tháng cho `post_views` và `audit_logs`.
- **Bản sao lưu đang nằm cùng máy với database.** Hỏng đĩa hoặc mất máy là mất cả hai. Trước khi có dữ liệu thật cần chép thêm ra nơi khác (object storage hoặc máy thứ hai).

Schema: `db/schema_v1.sql` (43 bảng), kiểm thử `db/test_schema.sql`. Hướng dẫn cho lập trình viên: `docs/huong-dan-ket-noi-db.md`.

Khi web bắt đầu dùng database: thêm `DATABASE_URL=postgresql://tnth_app:<mật khẩu>@db:5432/tnth_prod` vào `.env.production` (trong mạng Compose, host là `db`).

## Bảo mật đã thiết lập

- `ufw`: chỉ mở `24700/tcp`, `80/tcp`, `443/tcp`, `443/udp`.
- `fail2ban`: khoá IP 1 giờ sau 5 lần đăng nhập SSH sai trong 10 phút.
- Cập nhật bảo mật Ubuntu tự động (`unattended-upgrades`).
- Container `web`: không phải root, hệ thống file chỉ đọc, bỏ toàn bộ capability.
- `/api/fetch-article`: từ chối địa chỉ nội bộ, localhost và địa chỉ metadata của cloud.
- Log container giới hạn 10 MB × 5 file.

Chưa làm, nên cân nhắc:
- SSH vẫn cho đăng nhập `root` bằng mật khẩu. An toàn hơn là dùng khoá SSH rồi tắt mật khẩu.
- Docker tự mở cổng xuyên qua `ufw`. Chỉ `proxy` được mở cổng công khai; `db` phải giữ tiền tố `127.0.0.1:` trong `ports:`.

## Chuyển sang máy khác

1. Cài Docker Engine và plugin Compose.
2. `git clone` repo, chép `.env` và `.env.production` (nếu có) từ máy cũ.
3. `deploy/deploy.sh`
4. Mở cổng 80, 443; trỏ bản ghi A về IP mới.

Kèm database: chép thêm thư mục `secrets/` và bản sao lưu mới nhất, chạy `docker compose up -d db`, `deploy/db-init.sh`, rồi `deploy/db-restore.sh` cho từng database.

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Không vào được web từ ngoài, `curl http://127.0.0.1/` trên máy vẫn 200 | Tường lửa của nhà cung cấp cloud chưa mở cổng 80/443 |
| `docker compose ps` báo `unhealthy` hoặc `restarting` | `docker compose logs --tail 100 web` |
| Build lỗi `npm ci ... not in sync` | `package-lock.json` lệch với `package.json`; chạy `npm install` ở máy phát triển rồi commit file lock |
| Đĩa đầy | `docker system df`, rồi `docker image prune -a` |
| Build bị treo, máy chậm | Thiếu RAM; kiểm tra `free -h` (máy có swap 4 GB tại `/swapfile`) |
