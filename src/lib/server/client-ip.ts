import { isIP } from "node:net";

/**
 * IP thật của người dùng — chỉ tin header `X-Client-Ip` do Caddy GHI ĐÈ (deploy/Caddyfile):
 *   - khách đi qua OneShield (WAF/CDN): Caddy lấy từ `X-Real-Ip` mà OneShield đặt, nhưng
 *     CHỈ khi kết nối tới Caddy đến từ máy chủ OneShield đã khai báo;
 *   - mọi kết nối khác (vào thẳng IP máy chủ): Caddy dùng địa chỉ kết nối thật, bỏ qua
 *     mọi header khách tự đặt.
 * `X-Forwarded-For` KHÔNG dùng được: Caddy ghi đè nó bằng IP của OneShield nên mọi người
 * dùng trông như cùng một địa chỉ. Web không mở cổng ra ngoài nên header chỉ đến từ Caddy;
 * chạy không có Caddy (next dev, web thử) thì không có header → trả null.
 */
export const CLIENT_IP_HEADER = "x-client-ip";

/** IPv4-mapped IPv6 (::ffff:1.2.3.4) → IPv4 */
const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** IP của người gọi (đã kiểm định dạng) hoặc null nếu không xác định được */
export function clientIpOf(request: Request): string | null {
  const raw = request.headers.get(CLIENT_IP_HEADER)?.trim() ?? "";
  if (!raw || !isIP(raw)) return null;
  const mapped = raw.match(MAPPED_V4)?.[1];
  return mapped && isIP(mapped) === 4 ? mapped : raw.toLowerCase();
}

/**
 * Khoá đếm tần suất theo IP. IPv6: gộp theo /64 (một thuê bao thường được cấp cả dải /64,
 * đổi địa chỉ trong dải không được tính là người mới). Không rõ IP → khoá chung "unknown".
 */
export function ipRateKey(ip: string | null): string {
  if (!ip) return "unknown";
  if (isIP(ip) !== 6) return ip;
  const hasGap = ip.includes("::");
  const [head, tail] = ip.split("::");
  const front = head ? head.split(":") : [];
  const back = hasGap && tail ? tail.split(":") : [];
  const groups = hasGap
    ? [...front, ...Array<string>(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back]
    : front;
  if (groups.length !== 8) return ip;
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
