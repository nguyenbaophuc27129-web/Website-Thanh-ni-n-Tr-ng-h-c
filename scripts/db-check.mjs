// Kiểm tra kết nối DB thật (tnth_dev) qua SSH tunnel.
// Chạy: node scripts/db-check.mjs
// Yêu cầu: DATABASE_URL trong .env.local (đã thay <MAT-KHAU> bằng mật khẩu thật)
//          và tunnel đang mở: ssh -N tnth-db
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

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
  console.error("❌ DATABASE_URL chưa cấu hình. Thay <MAT-KHAU> trong .env.local bằng mật khẩu coder_dev.");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  connectionTimeoutMillis: 8000,
});

try {
  await client.connect();
  const { rows: info } = await client.query("select version() as v, current_database() as db, current_user as usr");
  console.log(`✅ Kết nối OK — db=${info[0].db}, user=${info[0].usr}`);
  console.log(`   ${info[0].v.split(",")[0]}`);

  const { rows: tables } = await client.query(
    `select c.relname as table_name, c.relkind,
            case when c.relkind = 'p' then 'PARTITIONED TABLE' else 'BASE TABLE' end as table_type
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname`,
  );
  const logical = tables.filter((t) => t.relkind === "p" || !/_y\d{4}m\d{2}$|_default$/.test(t.table_name));
  console.log(`\n📋 public: ${logical.length} bảng logic (${tables.length} gồm cả phân vùng con)\n`);
  for (const t of tables) console.log(`   ${t.table_name}${t.relkind === "p" ? "  (phân vùng)" : ""}`);

  const partNames = ["post_views", "audit_logs"];
  const parts = tables.filter((t) => partNames.includes(t.table_name) && t.relkind === "p");
  if (parts.length) console.log(`\n✅ Phân vùng tháng có sẵn: ${parts.map((p) => p.table_name).join(", ")}`);
  else console.log(`\n⚠️ Không thấy bảng phân vùng tháng post_views/audit_logs — đối chiếu lại schema_v1.sql`);
} catch (err) {
  console.error(`❌ Lỗi: ${err.message}`);
  console.error("   Gợi ý: tunnel đã mở chưa? (ssh -N tnth-db)  Mật khẩu đúng chưa?");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
