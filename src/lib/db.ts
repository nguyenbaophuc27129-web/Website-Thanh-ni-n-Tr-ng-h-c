import { Pool, type QueryResultRow } from "pg";

/**
 * Lớp truy cập PostgreSQL dùng chung — theo huong-dan-ket-noi-db.md:
 * - DATABASE_URL nằm trong .env.local (gitignored), nối qua SSH tunnel
 *   `ssh -N tnth-db` → 127.0.0.1:5433, chuỗi kết nối có `sslmode=disable`
 *   (tunnel đã mã hoá toàn bộ đường truyền, PostgreSQL trên server không bật TLS).
 * - Pool nhỏ (max 8): server giới hạn 30 kết nối cho tài khoản coder_dev.
 * - Chưa cấu hình DATABASE_URL → dbEnabled() = false, các API trả 503 và
 *   client tự fallback chế độ localStorage nên demo không bao giờ gãy.
 */

const connectionString = process.env.DATABASE_URL;

function createPool(): Pool | null {
  if (!connectionString || connectionString.includes("<MAT-KHAU>")) return null;
  return new Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30_000,
  });
}

// Cache pool trên globalThis để next dev (HMR) không mở thêm kết nối mỗi lần reload.
const globalForDb = globalThis as unknown as { __tnthPool?: Pool | null };
export const pool: Pool | null = (globalForDb.__tnthPool ??= createPool());

export function dbEnabled(): boolean {
  return pool !== null;
}

/** Chạy 1 truy vấn và trả về mảng dòng. Ném "DB_UNAVAILABLE" nếu chưa cấu hình DB. */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<R[]> {
  if (!pool) throw new Error("DB_UNAVAILABLE");
  const result = await pool.query<R>(text, params as unknown[]);
  return result.rows;
}

/** Chạy nhiều lệnh trong 1 transaction — commit khi xong, rollback khi lỗi. */
export async function withTransaction<T>(fn: (client: { query: Pool["query"] }) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("DB_UNAVAILABLE");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
