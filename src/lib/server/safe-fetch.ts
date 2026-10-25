import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

/* ============ Chặn SSRF: không cho máy chủ tải địa chỉ nội bộ ============
 * Dùng chung cho /api/fetch-article (nhập bài từ link) và /api/uploads
 * (tải ảnh từ URL về máy chủ).
 */

const PRIVATE_RANGES = new BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) PRIVATE_RANGES.addSubnet(prefix, bits, "ipv4");
for (const [prefix, bits] of [
  ["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96],
] as const) PRIVATE_RANGES.addSubnet(prefix, bits, "ipv6");

function isPrivateAddress(address: string, family: number): boolean {
  // IPv4 bọc trong IPv6 (::ffff:10.0.0.1) → kiểm tra theo IPv4
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return PRIVATE_RANGES.check(mapped, "ipv4");
  return PRIVATE_RANGES.check(address, family === 6 ? "ipv6" : "ipv4");
}

/** Ném lỗi nếu host trỏ về localhost / mạng riêng / địa chỉ metadata của cloud. */
export async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  const addresses = family
    ? [{ address: host, family }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address, a.family))) {
    throw new Error("địa chỉ nội bộ không được phép");
  }
}

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
export const FACEBOOK_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const HTML_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

/** fetch tự đi theo chuyển hướng (≤5 lần) và kiểm tra lại host ở từng bước. */
export async function fetchPublic(
  start: URL,
  userAgent = BROWSER_UA,
  accept = HTML_ACCEPT,
  timeoutMs = 9000,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = { "User-Agent": userAgent, Accept: accept };
  let current = start;
  for (let hop = 0; hop <= 5; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") throw new Error("protocol");
    await assertPublicHost(current);
    const res = await fetch(current.href, { headers, redirect: "manual", signal });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    current = new URL(location, current.href);
  }
  throw new Error("chuyển hướng quá nhiều lần");
}

/** Đọc thân response nhưng dừng ngay khi vượt `maxBytes` (không tin Content-Length). */
export async function readBodyLimited(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new Error("tệp quá lớn");
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("tệp quá lớn");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
