// Nạp dữ liệu ban đầu cho tnth_dev (theo huong-dan-ket-noi-db.md — tnth_dev có thể bị
// ghi đè nên seed luôn idempotent, chạy lại thoải mái):
//   node scripts/db-seed-dev.mts
// Yêu cầu: tunnel đang mở (ssh -N tnth-db) và DATABASE_URL trong .env.local.
//
// Nguồn dữ liệu — đọc THẲNG file dữ liệu của app (Node 24 chạy TS gốc) nên không thể lệch:
//   - org_units, school_types  ← src/data/org-units.ts
//   - accounts: 10 tài khoản demo đăng nhập (ids khớp DEMO_ACCOUNTS trong
//     src/lib/auth-context.tsx: 1–6, 16–19) + các tài khoản minh hoạ khác của trang
//     Hệ thống (ids 101+) — bóc từ src/data/accounts.ts. Mật khẩu chung: demo123.
//   - 901/902: 2 tài khoản học sinh mô phỏng trường 31 — hồ sơ HS3T mẫu
//     (src/data/hs3t.ts) gắn accountId 901/902 nên bắt buộc phải tồn tại.
import { existsSync, readFileSync } from "node:fs";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { Client } from "pg";
import { orgUnits, schoolTypes } from "../src/data/org-units.ts";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt:16384:8:1:${salt.toString("hex")}:${key.toString("hex")}`;
}

// Nạp .env.local thủ công (không phụ thuộc dotenv)
const envPath = new URL("../.env.local", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const url = process.env.DATABASE_URL;
if (!url || url.includes("<MAT-KHAU>")) {
  console.error("❌ DATABASE_URL chưa cấu hình trong .env.local");
  process.exit(1);
}

interface SeedAccount {
  id: number;
  orgUnitId: number;
  username: string;
  email: string;
  contactPerson: string;
  contactPosition: string;
  role:
    | "QUAN_TRI_TW"
    | "QUAN_TRI_TINH"
    | "QUAN_TRI_CAP3"
    | "DON_VI"
    | "BIEN_TAP_VIEN"
    | "DOAN_VIEN";
  status: "ACTIVE" | "PENDING" | "LOCKED" | "DISABLED";
  className?: string;
}

// 10 tài khoản đăng nhập demo (đồng bộ src/lib/auth-context.tsx — DEMO_ACCOUNTS)
const demoAccounts: SeedAccount[] = [
  { id: 1, orgUnitId: 1, username: "tw.admin", email: "tnth@doanthanhnienvn.vn", contactPerson: "Nguyễn Văn Toàn", contactPosition: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 2, orgUnitId: 12, username: "bd.province", email: "bandoan@binhduong.doan.vn", contactPerson: "Trần Thị Mai", contactPosition: "Phó Bí thư Tỉnh Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE" },
  { id: 3, orgUnitId: 25, username: "hc.hiepthanh", email: "hiepthanh@bd.doan.vn", contactPerson: "Lê Quốc Hùng", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 4, orgUnitId: 31, username: "thpt.chanhphu", email: "thptchanhphuhung@bd.edu.vn", contactPerson: "Phạm Minh Tuấn", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "ACTIVE" },
  { id: 5, orgUnitId: 2, username: "btv.tw", email: "bientap@tnth.vn", contactPerson: "Võ Ngọc Lan", contactPosition: "Phóng viên biên tập", role: "BIEN_TAP_VIEN", status: "ACTIVE" },
  { id: 6, orgUnitId: 31, username: "dv.demo", email: "minhduc.doanvien@thptchanhphu.edu.vn", contactPerson: "Nguyễn Minh Đức", contactPosition: "Ủy viên Ban Chấp hành Chi Đoàn", role: "DOAN_VIEN", status: "ACTIVE", className: "12A1" },
  { id: 16, orgUnitId: 1, username: "cv.hs3t", email: "hs3t@tnth.vn", contactPerson: "Trần Thị Thu Hà", contactPosition: "Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 17, orgUnitId: 1, username: "cv.kiemtra", email: "kiemtra@tnth.vn", contactPerson: "Lê Minh Đức", contactPosition: "Chuyên viên phụ trách công tác kiểm tra", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 18, orgUnitId: 1, username: "ctv.tintuc", email: "tintuc@tnth.vn", contactPerson: "Nguyễn Hải Yến", contactPosition: "CTV phụ trách chuyên mục Tin tức", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 19, orgUnitId: 1, username: "ctv.duan", email: "duan@tnth.vn", contactPerson: "Phạm Đức Anh", contactPosition: 'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"', role: "QUAN_TRI_TW", status: "ACTIVE" },
];

// Các tài khoản minh hoạ còn lại của trang Hệ thống (bóc từ src/data/accounts.ts,
// đổi id sang dải 101+ để không đụng dải demo) — status giữ nguyên để thử đủ tình huống
const extraAccounts: SeedAccount[] = [
  { id: 101, orgUnitId: 13, username: "hcm.city", email: "thanhdoan@hcm.doan.vn", contactPerson: "Hoàng Anh Dũng", contactPosition: "Chuyên viên Thành Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE" },
  { id: 102, orgUnitId: 26, username: "hc.phuhoa", email: "phuhoa@bd.doan.vn", contactPerson: "Đặng Thị Thủy", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 103, orgUnitId: 27, username: "hc.tuongbinhhiep", email: "tbh@bd.doan.vn", contactPerson: "Nguyễn Đắc Lợi", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 104, orgUnitId: 28, username: "hc.hiepan", email: "hiepan@bd.doan.vn", contactPerson: "Trương Mỹ Duyên", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "PENDING" },
  { id: 105, orgUnitId: 32, username: "thcs.hiepthanh", email: "thcsht@bd.edu.vn", contactPerson: "Lý Thanh Bình", contactPosition: "Tổng phụ trách Đội", role: "DON_VI", status: "ACTIVE" },
  { id: 106, orgUnitId: 34, username: "thpt.ngothoinham", email: "ntn@bd.edu.vn", contactPerson: "Đỗ Việt Khoa", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "LOCKED" },
  { id: 107, orgUnitId: 40, username: "hc.leloi", email: "leloi@bg.doan.vn", contactPerson: "Vũ Hải Yến", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 108, orgUnitId: 42, username: "thpt.bacgiang", email: "thptbg@bg.edu.vn", contactPerson: "Hoàng Tuấn Kiệt", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "DISABLED" },
  { id: 109, orgUnitId: 14, username: "bg.province", email: "bandoan@bacgiang.doan.vn", contactPerson: "Lý Hồng Nhung", contactPosition: "Phó Bí thư Tỉnh Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE" },
  { id: 110, orgUnitId: 29, username: "hc.benghe", email: "benghe@hcm.doan.vn", contactPerson: "Ngô Thanh Trúc", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
];

// Học sinh mô phỏng cùng trường 31 — hồ sơ HS3T mẫu 942/943 trỏ accountId 901/902
const hs3tStudentAccounts: SeedAccount[] = [
  { id: 901, orgUnitId: 31, username: "hs.mophong1", email: "hsmophong1@thptchanhphu.edu.vn", contactPerson: "Trần Hoàng Phú", contactPosition: "Đoàn viên", role: "DOAN_VIEN", status: "ACTIVE", className: "11A3" },
  { id: 902, orgUnitId: 31, username: "hs.mophong2", email: "hsmophong2@thptchanhphu.edu.vn", contactPerson: "Lê Thanh Trúc", contactPosition: "Đoàn viên", role: "DOAN_VIEN", status: "ACTIVE", className: "12A5" },
];

const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });
await client.connect();

try {
  await client.query("BEGIN");

  // 1) school_types — khớp src/data (m0009 đã seed, upsert để đồng bộ tên)
  for (const [i, st] of schoolTypes.entries()) {
    await client.query(
      `INSERT INTO school_types (code, name, display_order) OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, updated_at = now()`,
      [st.code, st.name, i + 1],
    );
  }
  const { rows: stRows } = await client.query<{ id: number; code: string }>(
    "SELECT id, code FROM school_types",
  );
  const schoolTypeByCode = new Map(stRows.map((r) => [r.code, r.id]));

  // 2) org_units — cây 4 cấp; depth của đơn vị gốc = 0, path dạng /1/12/25/31/
  const byId = new Map(orgUnits.map((u) => [u.id, u]));
  const depthOf = (u: (typeof orgUnits)[number]): number =>
    u.parentId == null ? 0 : 1 + depthOf(byId.get(u.parentId)!);
  const pathOf = (u: (typeof orgUnits)[number]): string =>
    u.parentId == null ? `/${u.id}/` : pathOf(byId.get(u.parentId)!) + `${u.id}/`;

  const sorted = [...orgUnits].sort((a, b) => depthOf(a) - depthOf(b) || a.id - b.id);
  for (const u of sorted) {
    const schoolTypeId = u.schoolTypeName
      ? schoolTypeByCode.get(
          schoolTypes.find((s) => s.name === u.schoolTypeName)?.code ?? "",
        ) ?? null
      : null;
    await client.query(
      `INSERT INTO org_units (id, parent_id, code, name, short_name, org_level, path, depth, school_type_id, address, is_active)
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         parent_id = EXCLUDED.parent_id, code = EXCLUDED.code, name = EXCLUDED.name,
         short_name = EXCLUDED.short_name, org_level = EXCLUDED.org_level, path = EXCLUDED.path,
         depth = EXCLUDED.depth, school_type_id = EXCLUDED.school_type_id,
         address = EXCLUDED.address, is_active = EXCLUDED.is_active, updated_at = now()`,
      [
        u.id,
        u.parentId,
        u.code,
        u.name,
        u.shortName ?? null,
        u.orgLevel,
        pathOf(u),
        depthOf(u),
        schoolTypeId,
        u.address ?? null,
        u.isActive,
      ],
    );
  }

  // 3) accounts — mật khẩu chung demo123, kích hoạt sẵn (must_change_password = false)
  const passwordHash = await hashPassword("demo123");
  for (const acc of [...demoAccounts, ...extraAccounts, ...hs3tStudentAccounts]) {
    await client.query(
      `INSERT INTO accounts (id, org_unit_id, username, email, password_hash, contact_person,
         contact_position, status, role_code, class_name, must_change_password, password_changed_at)
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, now())
       ON CONFLICT (id) DO UPDATE SET
         org_unit_id = EXCLUDED.org_unit_id, username = EXCLUDED.username, email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash, contact_person = EXCLUDED.contact_person,
         contact_position = EXCLUDED.contact_position, status = EXCLUDED.status,
         role_code = EXCLUDED.role_code, class_name = EXCLUDED.class_name,
         must_change_password = false, updated_at = now()`,
      [
        acc.id,
        acc.orgUnitId,
        acc.username,
        acc.email,
        passwordHash,
        acc.contactPerson,
        acc.contactPosition,
        acc.status,
        acc.role,
        acc.className ?? null,
      ],
    );
  }

  await client.query("COMMIT");

  // Đồng bộ sequence identity lên max(id) để app tạo bản ghi mới không đụng id đã seed
  for (const table of ["school_types", "org_units", "accounts"]) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT max(id) FROM ${table}))`,
    );
  }

  const { rows: counts } = await client.query<{ bang: string; so: string }>(
    `SELECT 'org_units' AS bang, count(*)::text AS so FROM org_units
     UNION ALL SELECT 'accounts', count(*)::text FROM accounts
     UNION ALL SELECT 'school_types', count(*)::text FROM school_types
     UNION ALL SELECT 'auth_sessions', count(*)::text FROM auth_sessions`,
  );
  console.log("✅ Seed tnth_dev xong:");
  for (const c of counts) console.log(`   ${c.bang}: ${c.so}`);
  console.log("   Đăng nhập demo: tw.admin / demo123 (đủ 10 TK trong src/lib/auth-context.tsx)");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("❌ Seed lỗi, đã rollback:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
