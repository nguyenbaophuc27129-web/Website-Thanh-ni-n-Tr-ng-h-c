# Hướng dẫn kết nối PostgreSQL dùng chung (dành cho lập trình viên)

Database của dự án chạy trên cloud server của chủ dự án. Bạn **không cần cài PostgreSQL ở máy mình**: code vẫn chạy local (`npm run dev`), còn dữ liệu nằm trên server và được nối về máy bạn qua một SSH tunnel.

```
Máy của bạn                                   Cloud server 103.216.116.242
┌───────────────────────────┐   SSH :24700   ┌──────────────────────────────┐
│ npm run dev               │ ═════════════► │ PostgreSQL 16                │
│   └─► 127.0.0.1:5433 ─────┼── tunnel ──────┼─► 127.0.0.1:5432             │
└───────────────────────────┘                │    ├─ tnth_dev   (của bạn)   │
                                             │    └─ tnth_prod  (bản thật)  │
                                             └──────────────────────────────┘
```

Cổng 5432 không mở ra Internet. Đường duy nhất vào DB là SSH tunnel bằng khoá của bạn.

## Bạn có gì

| Database | Tài khoản | Quyền |
|---|---|---|
| `tnth_dev` | `coder_dev` | **Toàn quyền**: bạn là chủ sở hữu. Tạo, sửa, xoá bảng, chạy migration, xoá sạch rồi nạp lại đều được. |
| `tnth_prod` | `coder_readonly` | **Chỉ đọc**, để đối chiếu dữ liệu thật. Không ghi, không đổi cấu trúc được. |

Mật khẩu hai tài khoản do chủ dự án gửi riêng. Không đưa mật khẩu vào git.

Cả hai database đã có sẵn schema v1 (43 bảng) và **chưa có dữ liệu**.

## Bước 1 — Tạo khoá SSH và gửi khoá công khai (làm 1 lần)

Nếu chưa có khoá, chạy trên máy bạn (Windows PowerShell, macOS và Linux đều dùng lệnh này):

```bash
ssh-keygen -t ed25519 -C "ten-ban-tnth"
```

Gửi cho chủ dự án **nội dung file khoá công khai** `~/.ssh/id_ed25519.pub` (một dòng bắt đầu bằng `ssh-ed25519`). Tuyệt đối không gửi file không có đuôi `.pub`; đó là khoá bí mật.

Chờ chủ dự án báo đã thêm khoá rồi làm tiếp bước 2.

## Bước 2 — Mở tunnel (mỗi lần làm việc)

```bash
ssh -N -p 24700 -L 5433:127.0.0.1:5432 -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes tnth-tunnel@103.216.116.242
```

- Lệnh **không in gì và không trả lại dấu nhắc**: như vậy là đang chạy đúng. Để nguyên cửa sổ đó; đóng cửa sổ hoặc `Ctrl+C` là ngắt DB.
- Phải có `-N`. Tài khoản `tnth-tunnel` không có shell, đăng nhập thường sẽ bị ngắt ngay.
- Cổng phía máy bạn là **5433** để không đụng PostgreSQL local (nếu có). Muốn đổi thì sửa số đầu tiên sau `-L`.
- Phải viết `127.0.0.1`, không viết `localhost`: server chỉ cho chuyển tiếp tới đúng `127.0.0.1:5432`.

Để khỏi gõ dài, thêm vào `~/.ssh/config`:

```
Host tnth-db
    HostName 103.216.116.242
    Port 24700
    User tnth-tunnel
    LocalForward 5433 127.0.0.1:5432
    ServerAliveInterval 30
    ExitOnForwardFailure yes
```

Từ đó chỉ cần `ssh -N tnth-db`.

## Bước 3 — Cấu hình dự án

Trong `.env.local` (file này đã nằm trong `.gitignore`):

```
DATABASE_URL=postgresql://coder_dev:<MẬT_KHẨU>@127.0.0.1:5433/tnth_dev?sslmode=disable
```

- `sslmode=disable` là đúng: SSH tunnel đã mã hoá toàn bộ đường truyền, còn PostgreSQL trên server không bật TLS. Để `require` sẽ báo lỗi.
- Muốn xem dữ liệu bản thật, đổi sang tài khoản và database chỉ đọc:

```
DATABASE_URL=postgresql://coder_readonly:<MẬT_KHẨU>@127.0.0.1:5433/tnth_prod?sslmode=disable
```

Kiểm tra nhanh (nếu máy có `psql`):

```bash
psql "postgresql://coder_dev:<MẬT_KHẨU>@127.0.0.1:5433/tnth_dev?sslmode=disable" -c "\dt"
```

Kết quả đúng là danh sách 43 bảng cùng các phân vùng tháng của `post_views` và `audit_logs`.

## Dùng công cụ giao diện (DBeaver, TablePlus, DataGrip, pgAdmin)

Có hai cách, chọn một:

- **Giữ tunnel ở bước 2 đang chạy**, rồi tạo kết nối tới host `127.0.0.1`, port `5433`, database `tnth_dev`, user `coder_dev`, SSL tắt.
- **Dùng SSH tunnel có sẵn của công cụ** (không cần bước 2): SSH host `103.216.116.242`, port `24700`, user `tnth-tunnel`, xác thực bằng khoá riêng của bạn; phần database điền host `127.0.0.1`, port `5432`.

## Schema và file liên quan

| File | Nội dung |
|---|---|
| `db/schema_v1.sql` | DDL 43 bảng, dựng lại từ `THIET-KE-SCHEMA (1).md` |
| `db/test_schema.sql` | 36 kịch bản kiểm thử; chạy xong tự `ROLLBACK`, không để lại dữ liệu |
| `THIET-KE-SCHEMA (1).md` | Đặc tả gốc |

Chạy lại bộ kiểm thử sau khi bạn đổi schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/test_schema.sql
```

### Điểm cần biết về schema v1

File DDL gốc `schema_v1.sql` nhắc trong đặc tả không còn, nên bản này được dựng lại từ tài liệu. Số bảng (43) và số khoá ngoại (78) khớp đặc tả; số index (147) và số ràng buộc CHECK (66) không khớp con số ghi trong đặc tả (173 và 53). Nếu bạn còn giữ file gốc, hãy đối chiếu.

Những chỗ đặc tả không ghi rõ, bản dựng lại đã chọn như sau:

- **`depth` của `org_units`**: đơn vị gốc có `depth = 0`.
- **`task_results` (append-only)**: trigger cấm `UPDATE`. `DELETE` vẫn được để `ON DELETE CASCADE` từ `task_assignments` hoạt động.
- **Phân vùng tháng** (`post_views`, `audit_logs`): có phân vùng `DEFAULT` hứng dữ liệu của tháng chưa tạo phân vùng, nên ghi không bao giờ lỗi. Server gọi `SELECT ensure_month_partitions()` mỗi đêm để tạo trước 3 tháng. Nếu bạn xoá hàm này trong `tnth_dev` thì việc tạo phân vùng tự động ở đó dừng lại.
- **Tìm kiếm không dấu**: dùng hàm `immutable_unaccent()` (bọc `unaccent`) cho `activities.search_vector` và index trigram trên `org_units.name`.
- **Sắp xếp tiếng Việt**: database dùng collation ICU `vi-VN`, nên `ORDER BY name` xếp đúng thứ tự chữ cái tiếng Việt.
- **Không có dữ liệu mẫu**: các bảng danh mục (`school_types`, `resource_types`, `roles`...) đang trống. Dữ liệu trong `src/data/` đã khác đặc tả (ví dụ 5 loại hình trường thay vì 3), nên việc nạp dữ liệu ban đầu để bạn quyết định.
- **Materialized view**: đặc tả nhắc tới một materialized view trong phần kiểm thử nhưng không mô tả, nên chưa được tạo.

### Khoảng trống giữa schema v1 và prototype hiện tại

Đặc tả viết ngày 07/09/2026; prototype đã thêm nhiều chức năng chưa có bảng tương ứng. Bạn cần bổ sung khi làm backend:

- Diễn đàn ẩn danh (bài viết, bình luận, cảm xúc, hàng đợi kiểm duyệt, media).
- Học sinh 3 tốt (hồ sơ, tiêu chí phụ, kết quả xét).
- Thi kiến thức (ngân hàng câu hỏi, kỳ thi, bài làm).
- Dự án tình nguyện, nhà tài trợ, chương trình, danh bạ, sự kiện trực tiếp, điểm danh QR.
- Tài khoản đoàn viên cá nhân và nhiều tài khoản trong một đơn vị: hiện `accounts.org_unit_id` có ràng buộc `UNIQUE` (1 đơn vị = 1 tài khoản) theo đặc tả, trong khi prototype đã có nhiều tài khoản thuộc cùng đơn vị. Bỏ ràng buộc `accounts_org_unit_id_key` nếu chốt theo prototype.
- Phiên đăng nhập / refresh token (đặc tả để ngỏ, mục 8.4).

## Quy ước làm việc

1. **Mọi thay đổi cấu trúc phải có file migration trong repo** (thư mục `db/migrations/`, đặt tên theo thứ tự, ví dụ `0002_forum.sql`). Bạn sửa tay trong `tnth_dev` thoải mái khi thử, nhưng thứ được đưa lên `tnth_prod` chỉ là file migration đã commit. Chủ dự án là người chạy migration trên `tnth_prod`.
2. **`tnth_dev` là nơi thử nghiệm**, có thể bị ghi đè khi chủ dự án chép dữ liệu từ `tnth_prod` sang. Đừng để thứ gì chỉ tồn tại ở đó.
3. **Không commit mật khẩu, chuỗi kết nối hay file `.env*`.**
4. **Dữ liệu thật là dữ liệu cá nhân** (email, số điện thoại, nội dung phản ánh). Không sao chép dữ liệu từ `tnth_prod` ra ngoài server.

## Khi cần chủ dự án hỗ trợ

| Bạn cần | Chủ dự án chạy trên server |
|---|---|
| Đưa `tnth_dev` về trạng thái schema v1 sạch | `deploy/db-restore.sh tnth_dev /var/backups/tnth/baseline/tnth_dev-schema_v1.dump` |
| Lấy lại `tnth_dev` của một đêm trước (giữ 14 ngày) | `deploy/db-restore.sh tnth_dev /var/backups/tnth/tnth_dev-<ngày>.dump` |
| Chép dữ liệu thật sang `tnth_dev` để thử | `deploy/db-clone-prod-to-dev.sh` |
| Chạy migration lên `tnth_prod` | Gửi tên file migration đã commit |
| Cài extension không thuộc nhóm "trusted" | Báo tên extension |

Các extension `citext`, `pg_trgm`, `unaccent` đã cài. Bạn tự cài được các extension "trusted" khác bằng `CREATE EXTENSION`.

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| `Permission denied (publickey)` khi mở tunnel | Khoá công khai chưa được thêm trên server, hoặc bạn đang dùng khoá khác. Thử thêm `-i ~/.ssh/id_ed25519`. |
| Kết nối SSH đóng ngay sau khi đăng nhập | Thiếu `-N`. |
| `bind: Address already in use` | Cổng 5433 ở máy bạn đang bận (thường do một tunnel cũ còn chạy). Tắt tunnel cũ hoặc đổi cổng. |
| `administratively prohibited: open failed` | Bạn viết `localhost` thay cho `127.0.0.1`, hoặc sai cổng 5432 ở vế sau. |
| `Connection refused` ở `127.0.0.1:5433` | Tunnel chưa mở hoặc đã rớt. |
| `server does not support SSL` | Thêm `?sslmode=disable` vào chuỗi kết nối. |
| `permission denied for database "tnth_prod"` | Bạn đang dùng `coder_dev` để vào `tnth_prod`. Dùng `coder_readonly`. |
| `cannot execute ... in a read-only transaction` | Bạn đang ghi bằng `coder_readonly`. |
| `too many connections for role "coder_dev"` | Giới hạn 30 kết nối. Giảm kích thước connection pool ở local (5–10 là đủ) và tắt các tiến trình dev cũ. |
| Truy vấn chậm hơn DB local | Bình thường: mỗi truy vấn đi qua Internet. Tránh vòng lặp N+1; gộp truy vấn. |
