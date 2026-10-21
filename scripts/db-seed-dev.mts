// Nạp dữ liệu ban đầu cho tnth_dev (theo huong-dan-ket-noi-db.md — tnth_dev có thể bị
// ghi đè nên seed luôn idempotent, chạy lại thoải mái):
//   node scripts/db-seed-dev.mts
// Yêu cầu: tunnel đang mở (ssh -N tnth-db) và DATABASE_URL trong .env.local.
//
// Nguồn dữ liệu — đọc THẲNG file dữ liệu của app (Node 24 chạy TS gốc) nên không thể lệch:
//   - org_units, school_types  ← src/data/org-units.ts
//   - accounts: DUY NHẤT tw.admin (id 1) — tài khoản khởi tạo, các tài khoản khác
//     do đơn vị đăng ký / TW tạo qua app. Mật khẩu: demo123 (chạy script này để reset).
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

// Tài khoản khởi tạo duy nhất (đồng bộ src/lib/auth-context.tsx — DEMO_ACCOUNTS)
const demoAccounts: SeedAccount[] = [
  { id: 1, orgUnitId: 1, username: "tw.admin", email: "tnth@doanthanhnienvn.vn", contactPerson: "Nguyễn Văn Toàn", contactPosition: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi", role: "QUAN_TRI_TW", status: "ACTIVE" },
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
  for (const acc of demoAccounts) {
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
  console.log("   Tài khoản quản trị: tw.admin / demo123");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("❌ Seed lỗi, đã rollback:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
