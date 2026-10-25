/**
 * Giới hạn số lần thử trong bộ nhớ tiến trình (web chạy 1 container nên đủ dùng).
 * Không ghi DB, không khoá tài khoản — khởi động lại web là bộ đếm về 0.
 * Đếm theo khoá do nơi gọi đặt (vd. tên đăng nhập): IP thấy được qua OneShield
 * không phải IP thật của người dùng nên không dùng làm khoá.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

/** Số giây còn phải chờ nếu khoá đã chạm ngưỡng `max`, ngược lại 0. */
export function retryAfterSeconds(key: string, max: number): number {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now || b.count < max) return 0;
  return Math.ceil((b.resetAt - now) / 1000);
}

/** Ghi nhận 1 lần thử cho khoá; cửa sổ đếm bắt đầu từ lần thử đầu tiên. */
export function recordAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count += 1;
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}
