// Soi schema thật của các bảng cần mở rộng (Giai đoạn B) trên tnth_dev.
// Chạy: node scripts/db-introspect.mjs [tên_bảng...]
// Không truyền tên bảng → liệt kê các bảng quan tâm mặc định.
// Yêu cầu: tunnel đang mở (ssh -N tnth-db) + DATABASE_URL trong .env.local
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

const envPath = new URL("../.env.local", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const DEFAULT_TABLES = [
  "accounts", "roles", "notifications", "resources", "resource_types",
  "school_types", "published_posts", "activities", "feedbacks",
];
const wanted = process.argv.slice(2);
const tables = wanted.length ? wanted : DEFAULT_TABLES;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 8000,
});

try {
  await client.connect();

  const { rows: cols } = await client.query(
    `select table_name, column_name, data_type, is_nullable, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name, ordinal_position`,
    [tables],
  );

  const { rows: cons } = await client.query(
    `select conrelid::regclass::text as table_name, conname, contype,
            pg_get_constraintdef(oid) as def
       from pg_constraint
      where connamespace = 'public'::regnamespace
        and conrelid::regclass::text = any($1::text[])
      order by conrelid::regclass::text, conname`,
    [tables],
  );

  let cur = "";
  for (const c of cols) {
    if (c.table_name !== cur) {
      cur = c.table_name;
      console.log(`\n== ${cur} ==`);
    }
    console.log(
      `  ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? ` DEFAULT ${c.column_default}` : ""}`,
    );
  }

  cur = "";
  for (const c of cons) {
    if (c.table_name !== cur) {
      cur = c.table_name;
      console.log(`\n-- ràng buộc ${cur} --`);
    }
    console.log(`  ${c.contype}  ${c.conname}: ${c.def}`);
  }

  const found = new Set(cols.map((c) => c.table_name));
  for (const t of tables) if (!found.has(t)) console.log(`\n⚠️ Không tồn tại: ${t}`);
} catch (err) {
  console.error(`❌ Lỗi: ${err.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
