import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { clientIpOf, ipRateKey } from "@/lib/server/client-ip";
import { clearAttempts, recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";

/**
 * Đếm lượt tải / xem của kho tài nguyên — dùng chung cho POST /api/tai-nguyen/[id]/luot-tai
 * (tải 1 tệp, xem clip) và GET /api/tai-nguyen/[id]/zip (tải tất cả).
 *
 * - Không cần đăng nhập, chỉ tài nguyên PUBLISHED + công khai.
 * - Chống đếm trùng: cùng "dấu vết" người xem + cùng tài nguyên chỉ tính 1 lần / 30 phút.
 * - Tăng bằng UPDATE nguyên tử (download_count + 1), không đọc rồi ghi lại.
 */

const DEDUPE_WINDOW_MS = 30 * 60_000;
/** Trần chung toàn hệ thống: quá ngưỡng thì vẫn cho tải nhưng không tính thêm (chặn bơm số liệu bằng script) */
const GLOBAL_COUNT_MAX = 3000;
const GLOBAL_WINDOW_MS = 10 * 60_000;

/**
 * "Dấu vết" người xem: IP thật do Caddy ghi vào X-Client-Ip (xem client-ip.ts) ghép thêm
 * User-Agent và ngôn ngữ — nhiều người có thể chung một IP (mạng trường học, NAT) nên không
 * chặn nhầm cả nhóm. Chỉ lưu bản băm trong bộ nhớ.
 */
export function viewerFingerprint(request: NextRequest): string {
  const ip = ipRateKey(clientIpOf(request));
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? "";
  const lang = request.headers.get("accept-language")?.slice(0, 100) ?? "";
  return createHash("sha256").update(`${ip}|${ua}|${lang}`).digest("hex").slice(0, 24);
}

/** Mã tài nguyên từ tham số đường dẫn: số nguyên dương hợp lý, ngược lại null */
export function parseResourceId(raw: string): number | null {
  if (!/^\d{1,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export interface CountResult {
  /** true = lượt này được cộng; false = đã tính gần đây (trùng) hoặc chạm trần chung */
  counted: boolean;
  downloadCount: number;
}

/** Cộng 1 lượt tải cho tài nguyên công khai. null = không có tài nguyên công khai với mã này. */
export async function countResourceDownload(request: NextRequest, id: number): Promise<CountResult | null> {
  const key = `dl:${id}:${viewerFingerprint(request)}`;
  const already = retryAfterSeconds(key, 1) > 0;
  const globalFull = retryAfterSeconds("dl:global", GLOBAL_COUNT_MAX) > 0;

  if (!already && !globalFull) {
    // Giữ chỗ TRƯỚC khi ghi để 2 request song song của cùng người không cùng được cộng
    recordAttempt(key, DEDUPE_WINDOW_MS);
    try {
      const rows = await query<{ download_count: number }>(
        `UPDATE resources SET download_count = download_count + 1
          WHERE id = $1 AND status = 'PUBLISHED' AND is_public AND deleted_at IS NULL
        RETURNING download_count`,
        [id],
      );
      if (rows[0]) {
        recordAttempt("dl:global", GLOBAL_WINDOW_MS);
        return { counted: true, downloadCount: Number(rows[0].download_count) };
      }
    } catch (err) {
      clearAttempts(key);
      throw err;
    }
    clearAttempts(key); // không có tài nguyên công khai — không giữ chỗ
    return null;
  }

  const rows = await query<{ download_count: number }>(
    `SELECT download_count FROM resources WHERE id = $1 AND status = 'PUBLISHED' AND is_public AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ? { counted: false, downloadCount: Number(rows[0].download_count) } : null;
}
