// Chuyển tệp cũ trong DB sang ổ đĩa máy chủ (/uploads/...) — chạy 1 lần sau khi bật lưu trữ tệp:
//   - base64 (data:...) trong các cột tệp → ghi thành tệp, cột chỉ còn đường dẫn
//   - ảnh bài viết còn trỏ ra web ngoài (ảnh đại diện + ![..](https://..) trong nội dung) → tải về
// Chạy lại không sao: giá trị đã là /uploads/... thì bỏ qua.
//
// Cách chạy trên máy chủ (image builder có đủ node_modules, gắn thư mục tệp + mạng nội bộ):
//   docker build --target builder -t tnth-builder:media .
//   docker run --rm --network tnth_internal --env-file .env.production \
//     -v /srv/tnth/uploads:/app/uploads -v "$PWD/scripts:/app/scripts:ro" \
//     tnth-builder:media node scripts/migrate-media.mts [--dry-run]
import { pool, query } from "../src/lib/db.ts";
import { decodeDataUrl, storeMedia, storeMediaFromUrl, type MediaKind } from "../src/lib/server/media.ts";

const dryRun = process.argv.includes("--dry-run");
const log: string[] = [];
let failures = 0;

const isData = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:");
const isHttp = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

/** data: hoặc http(s) → đường dẫn /uploads/...; giá trị khác giữ nguyên */
async function toLocal(value: unknown, kind: MediaKind, name?: string | null, allowHttp = false): Promise<unknown> {
  if (!isData(value) && !(allowHttp && isHttp(value))) return value;
  const label = isData(value) ? `base64 ${Math.round(value.length / 1024)}KB` : value;
  if (dryRun) {
    log.push(`  [thử] ${kind}: ${label}`);
    return value;
  }
  try {
    const stored = isData(value)
      ? await storeMedia({ buffer: decodeDataUrl(value), kind, originalName: name ?? undefined })
      : await storeMediaFromUrl(value, kind);
    log.push(`  ✔ ${kind}: ${label} → ${stored.url}`);
    return stored.url;
  } catch (err) {
    failures++;
    log.push(`  ✘ ${kind}: ${label} — ${err instanceof Error ? err.message : err}`);
    return value;
  }
}

async function localizeContent(content: string): Promise<string> {
  const re = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let out = content;
  for (const m of Array.from(content.matchAll(re))) {
    const local = await toLocal(m[2], "bai-viet", null, true);
    if (local !== m[2]) out = out.split(`](${m[2]})`).join(`](${local})`);
  }
  return out;
}

// 1) Bài viết: ảnh đại diện (cover_data_url, cột cũ cover_url) + ảnh trong nội dung
for (const p of await query<{ id: string; cover_data_url: string | null; cover_url: string | null; content: string }>(
  "SELECT id, cover_data_url, cover_url, content FROM published_posts ORDER BY id",
)) {
  const cover = await toLocal(p.cover_data_url || p.cover_url, "bai-viet", null, true);
  const content = await localizeContent(p.content ?? "");
  if (!dryRun && (cover !== (p.cover_data_url || p.cover_url) || content !== p.content || p.cover_url)) {
    await query("UPDATE published_posts SET cover_data_url = $2, cover_url = NULL, content = $3 WHERE id = $1", [p.id, cover ?? null, content]);
  }
}

// 2) Bài đóng góp của đoàn viên: ảnh bìa
for (const r of await query<{ id: string; cover_data_url: string }>(
  "SELECT id, cover_data_url FROM member_contributions WHERE cover_data_url LIKE 'data:%' OR cover_data_url ~* '^https?://'",
)) {
  const v = await toLocal(r.cover_data_url, "dong-gop", null, true);
  if (!dryRun && v !== r.cover_data_url) await query("UPDATE member_contributions SET cover_data_url = $2 WHERE id = $1", [r.id, v]);
}

// 3) Văn bản, tài nguyên, báo cáo dự án: tệp đính kèm base64
for (const [table, col, nameCol, kind] of [
  ["documents", "file_data_url", "file_name", "van-ban"],
  ["resources", "file_data_url", "file_name", "tai-nguyen"],
  ["volunteer_projects", "report_file_data", "report_file_name", "du-an"],
] as const) {
  for (const r of await query<Record<string, string>>(
    `SELECT id, ${col} AS data, ${nameCol} AS name FROM ${table} WHERE ${col} LIKE 'data:%'`,
  )) {
    const v = await toLocal(r.data, kind, r.name);
    if (!dryRun && v !== r.data) await query(`UPDATE ${table} SET ${col} = $2 WHERE id = $1`, [r.id, v]);
  }
}

// 4) Diễn đàn: media (jsonb) chứa base64
for (const table of ["forum_threads", "forum_comments"]) {
  for (const r of await query<{ id: string; media: { dataUrl?: string; name?: string }[] }>(
    `SELECT id, media FROM ${table} WHERE media::text LIKE '%data:%'`,
  )) {
    let changed = false;
    for (const m of r.media ?? []) {
      const v = await toLocal(m.dataUrl, "dien-dan", m.name);
      if (v !== m.dataUrl) {
        m.dataUrl = v as string;
        changed = true;
      }
    }
    if (!dryRun && changed) await query(`UPDATE ${table} SET media = $2 WHERE id = $1`, [r.id, JSON.stringify(r.media)]);
  }
}

console.log(`${dryRun ? "CHẠY THỬ — không ghi gì" : "Đã chuyển"}: ${log.length} tệp, lỗi ${failures}`);
for (const line of log) console.log(line);
await pool?.end();
process.exit(failures > 0 ? 1 : 0);
