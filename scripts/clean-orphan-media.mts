// Dọn tệp tải lên "mồ côi" — tệp trong thư mục uploads và dòng media_files mà
// KHÔNG còn cột nào trong DB nhắc tới (bài viết đã xoá ảnh, văn bản đổi tệp, bài diễn đàn bị gỡ…).
//
// Cách tìm tham chiếu: quét MỌI cột chữ / jsonb / mảng của MỌI bảng trong schema public
// (trừ chính media_files), gom mọi chuỗi dạng /uploads/... — gồm ảnh bìa + ảnh trong nội dung
// bài viết (published_posts), bài đóng góp (member_contributions), tệp văn bản (documents),
// tài nguyên (resources), file báo cáo dự án (volunteer_projects), media diễn đàn
// (forum_threads / forum_comments, jsonb) và bất kỳ cột nào thêm về sau. Dòng đã xoá mềm
// (deleted_at) vẫn tính là còn dùng — chỉ xoá thứ chắc chắn không ai trỏ tới.
//
// Chỉ xét tệp / dòng CŨ HƠN 7 NGÀY (tệp vừa tải lên có thể đang nằm trong form chưa lưu).
// Mặc định CHẠY THỬ: chỉ in danh sách. Thêm --delete mới xoá tệp + dòng media_files.
// Khi --delete mà số tệp (hoặc số dòng media_files) sắp xoá > 50% tổng số — dấu hiệu nối
// nhầm DB (vd. DB trống) hoặc gắn nhầm thư mục — thì dừng, trừ khi thêm --force.
//
// QUAN TRỌNG: DATABASE_URL phải là DB mà web đang dùng với đúng thư mục uploads đó
// (hiện tại web chính thức dùng tnth_dev + /srv/tnth/uploads). Nối nhầm DB khác → tệp
// đang dùng bị coi là mồ côi.
//
// Cách chạy trên máy chủ (image builder có đủ node_modules, gắn thư mục tệp + mạng nội bộ):
//   docker build --target builder -t tnth-builder:media .
//   # 1) chạy thử — xem danh sách trước
//   docker run --rm --network tnth_internal --env-file .env.production \
//     -v /srv/tnth/uploads:/app/uploads -v "$PWD/scripts:/app/scripts:ro" \
//     tnth-builder:media node scripts/clean-orphan-media.mts
//   # 2) xoá thật (nên sao lưu /srv/tnth/uploads + DB trước: deploy/db-backup.sh)
//   docker run ... (như trên) ... node scripts/clean-orphan-media.mts --delete
// Thư mục mặc định: UPLOAD_DIR hoặc ./uploads (trong container là /app/uploads);
// đổi bằng --dir=/đường/dẫn.
import { lstat, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pool, query } from "../src/lib/db.ts";

const MIN_AGE_DAYS = 7;
const MAX_DELETE_RATIO = 0.5;
const URL_PREFIX = "/uploads/";

const args = process.argv.slice(2);
const doDelete = args.includes("--delete");
const force = args.includes("--force");
const dirArg = args.find((a) => a.startsWith("--dir="))?.slice("--dir=".length);
const uploadDir = path.resolve(dirArg || process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const cutoff = Date.now() - MIN_AGE_DAYS * 24 * 3600 * 1000;

const fmtSize = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
const ageDays = (t: number) => Math.floor((Date.now() - t) / (24 * 3600 * 1000));
const quoteIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;

if (!pool) {
  console.error("Chưa cấu hình DATABASE_URL — dừng (không quét được tham chiếu thì không xoá gì).");
  process.exit(2);
}

/* ---------- 1) Gom mọi đường dẫn /uploads/... đang được DB nhắc tới ---------- */
const columns = await query<{ table_name: string; column_name: string }>(
  `SELECT c.table_name, c.column_name
   FROM information_schema.columns c
   JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
     AND c.table_name <> 'media_files'
     AND c.data_type IN ('text', 'character varying', 'character', 'json', 'jsonb', 'ARRAY')
   ORDER BY c.table_name, c.ordinal_position`,
);

const referenced = new Set<string>();
const refColumns = new Map<string, number>();
const addRef = (raw: string) => {
  // Thêm cả bản bỏ dấu chấm cuối câu và bản giải mã %xx — thà giữ thừa còn hơn xoá nhầm
  const variants = [raw, raw.replace(/\.+$/, "")];
  try {
    variants.push(decodeURIComponent(raw));
  } catch {
    // giữ nguyên
  }
  for (const v of variants) referenced.add(v);
};

for (const { table_name, column_name } of columns) {
  const col = `${quoteIdent(column_name)}::text`;
  const rows = await query<{ p: string }>(
    `SELECT DISTINCT (regexp_matches(${col}, '/uploads/[A-Za-z0-9._~%/-]+', 'g'))[1] AS p
     FROM ${quoteIdent(table_name)} WHERE ${col} LIKE '%/uploads/%'`,
  );
  for (const r of rows) addRef(r.p);
  if (rows.length) refColumns.set(`${table_name}.${column_name}`, rows.length);
}

/* ---------- 2) Liệt kê tệp trên đĩa ---------- */
interface DiskFile {
  url: string;
  abs: string;
  size: number;
  mtimeMs: number;
}
const files: DiskFile[] = [];
async function walk(dir: string) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (dir === uploadDir) {
      console.error(`Không đọc được thư mục ${uploadDir}: ${err instanceof Error ? err.message : err}`);
      process.exit(2);
    }
    return;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) await walk(abs);
    else if (e.isFile()) {
      // Bỏ qua liên kết mềm / tệp đặc biệt — chỉ xét tệp thường
      const st = await lstat(abs);
      const rel = path.relative(uploadDir, abs).split(path.sep).join("/");
      files.push({ url: URL_PREFIX + rel, abs, size: st.size, mtimeMs: st.mtimeMs });
    }
  }
}
await walk(uploadDir);

/* ---------- 3) Dòng media_files ---------- */
const mediaRows = await query<{ id: string; path: string; created_at: Date }>(
  "SELECT id, path, created_at FROM media_files ORDER BY id",
);
const rowByPath = new Map(mediaRows.map((r) => [r.path, r]));
const fileByUrl = new Map(files.map((f) => [f.url, f]));

/** Đường dẫn công khai → tệp tuyệt đối, chỉ khi nằm trong uploadDir */
function absOf(url: string): string | null {
  if (!url.startsWith(URL_PREFIX)) return null;
  const abs = path.resolve(uploadDir, url.slice(URL_PREFIX.length));
  return abs.startsWith(uploadDir + path.sep) ? abs : null;
}

const orphanFiles = files.filter((f) => {
  if (referenced.has(f.url)) return false;
  if (f.mtimeMs > cutoff) return false;
  const row = rowByPath.get(f.url);
  return !row || new Date(row.created_at).getTime() <= cutoff;
});
const orphanFileUrls = new Set(orphanFiles.map((f) => f.url));
// Dòng media_files mồ côi mà tệp không còn trên đĩa (tệp có trên đĩa đã nằm trong orphanFiles)
const orphanRowsOnly = mediaRows.filter(
  (r) => !referenced.has(r.path) && !fileByUrl.has(r.path) && new Date(r.created_at).getTime() <= cutoff,
);
const brokenRefs = [...referenced].filter((u) => absOf(u) && !fileByUrl.has(u) && !/\.+$/.test(u));

/* ---------- 4) Báo cáo ---------- */
console.log(`Thư mục: ${uploadDir}`);
console.log(`Quét ${columns.length} cột chữ/jsonb — ${referenced.size} chuỗi /uploads/ được tham chiếu, ở các cột:`);
for (const [c, n] of refColumns) console.log(`  · ${c}: ${n}`);
console.log(`Trên đĩa: ${files.length} tệp; media_files: ${mediaRows.length} dòng; chỉ xét thứ cũ hơn ${MIN_AGE_DAYS} ngày.`);
if (brokenRefs.length) {
  console.log(`(Lưu ý: ${brokenRefs.length} đường dẫn được DB nhắc tới nhưng không có tệp trên đĩa — không xử lý.)`);
}

const totalBytes = orphanFiles.reduce((s, f) => s + f.size, 0);
console.log(`\nTệp mồ côi: ${orphanFiles.length} (${fmtSize(totalBytes)})`);
for (const f of orphanFiles) {
  const row = rowByPath.get(f.url);
  console.log(`  ${f.url}  ${fmtSize(f.size)}  ${ageDays(f.mtimeMs)} ngày${row ? `  [media_files #${row.id}]` : "  [không có dòng media_files]"}`);
}
console.log(`Dòng media_files mồ côi không còn tệp: ${orphanRowsOnly.length}`);
for (const r of orphanRowsOnly) console.log(`  #${r.id} ${r.path}`);

if (!doDelete) {
  console.log("\nCHẠY THỬ — không xoá gì. Thêm --delete để xoá các mục trên.");
  await pool.end();
  process.exit(0);
}

// Chốt an toàn: xoá quá nửa → nhiều khả năng nối nhầm DB (DB trống) hoặc gắn nhầm thư mục
const orphanRowCount = orphanFiles.filter((f) => rowByPath.has(f.url)).length + orphanRowsOnly.length;
const suspicious =
  (files.length > 0 && orphanFiles.length / files.length > MAX_DELETE_RATIO) ||
  (mediaRows.length > 0 && orphanRowCount / mediaRows.length > MAX_DELETE_RATIO);
if (suspicious && !force) {
  console.error(
    `\nDỪNG: sắp xoá ${orphanFiles.length}/${files.length} tệp, ${orphanRowCount}/${mediaRows.length} dòng media_files` +
      ` (> ${MAX_DELETE_RATIO * 100}%) — có thể đang nối nhầm DB hoặc gắn nhầm thư mục tệp.` +
      " Kiểm tra lại DATABASE_URL và -v ...:/app/uploads; nếu chắc chắn đúng, chạy lại với --delete --force.",
  );
  await pool.end();
  process.exit(3);
}

/* ---------- 5) Xoá ---------- */
let deletedFiles = 0;
let deletedRows = 0;
let failures = 0;
for (const f of orphanFiles) {
  try {
    await unlink(f.abs);
    deletedFiles++;
  } catch (err) {
    failures++;
    console.error(`  ✘ không xoá được ${f.url}: ${err instanceof Error ? err.message : err}`);
    orphanFileUrls.delete(f.url); // còn tệp thì giữ dòng media_files
  }
}
const rowIds = [
  ...orphanFiles.filter((f) => orphanFileUrls.has(f.url)).map((f) => rowByPath.get(f.url)?.id),
  ...orphanRowsOnly.map((r) => r.id),
].filter((id): id is string => !!id);
if (rowIds.length) {
  const res = await query<{ id: string }>("DELETE FROM media_files WHERE id = ANY($1::bigint[]) RETURNING id", [rowIds]);
  deletedRows = res.length;
}
console.log(`\nĐã xoá ${deletedFiles} tệp (${fmtSize(totalBytes)}), ${deletedRows} dòng media_files, lỗi ${failures}.`);
await pool.end();
process.exit(failures > 0 ? 1 : 0);
