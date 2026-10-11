// Chạy migrations db/migrations/ theo thứ tự tên file trên tnth_dev (thử) / tnth_prod (chính thức).
// Cách chạy:  node scripts/db-migrate.mjs            → áp các file chưa chạy
//             node scripts/db-migrate.mjs --list     → chỉ xem trạng thái
// Yêu cầu: DATABASE_URL trong .env.local; với tnth_dev cần tunnel: ssh -N tnth-db
// Mỗi file chạy trong 1 transaction; đã áp xong được ghi vào bảng schema_migrations.
// File migration viết idempotent (if exists / on conflict) — chạy lại không lỗi.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { Client } from "pg";

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

const listOnly = process.argv.includes("--list");
const dir = new URL("../db/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });

try {
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
        id bigint generated always as identity primary key,
        filename varchar(200) not null unique,
        applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await client.query("select filename from schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));
  const pending = files.filter((f) => !applied.has(f));

  console.log(`📂 ${files.length} file migration — đã áp: ${applied.size}, còn lại: ${pending.length}`);
  for (const f of files) console.log(`   ${applied.has(f) ? "✅" : "⬜"} ${f}`);

  if (listOnly || pending.length === 0) {
    console.log(listOnly ? "\n(chế độ --list — không chạy gì)" : "\n✨ Không có migration mới.");
    process.exit(0);
  }

  for (const f of pending) {
    const sql = readFileSync(new URL(f, dir), "utf8");
    process.stdout.write(`▶ Áp dụng ${f} … `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [f]);
      await client.query("commit");
      console.log("OK");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.log(`\n❌ LỖI tại ${f}: ${err.message}`);
      process.exit(1);
    }
  }
  console.log("\n🎉 Hoàn tất migration.");
} catch (err) {
  console.error(`❌ Lỗi kết nối: ${err.message}`);
  console.error("   Gợi ý: tunnel đã mở chưa? (ssh -N tnth-db)");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
