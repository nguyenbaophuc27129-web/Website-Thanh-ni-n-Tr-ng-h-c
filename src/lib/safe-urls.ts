/**
 * Kiểm đường dẫn / liên kết trước khi dùng làm href, src hoặc lưu vào DB (chống XSS: javascript:, data:, URL lạ).
 * Không phụ thuộc gì — dùng được cả ở trình duyệt lẫn máy chủ (store-write-policy.ts).
 */

/** Chỉ nhận tệp trên máy chủ: /uploads/<phân hệ>/... — chặn javascript:, data:, URL ngoài, "..", ký tự lạ */
export function isSafeFileUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length <= 300 &&
    /^\/uploads\/[a-z0-9-]+(?:\/[A-Za-z0-9._-]+)+$/.test(url) &&
    !url.includes("..")
  );
}

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);

/** Chỉ nhận liên kết https tới YouTube: youtube.com/watch | /embed/ | /shorts/ hoặc youtu.be/<id> */
export function isSafeYoutubeUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port || !YT_HOSTS.has(u.hostname)) return false;
  if (u.hostname.endsWith("youtu.be")) return /^\/[\w-]{6,}$/.test(u.pathname);
  return /^\/(watch|embed\/[\w-]+|shorts\/[\w-]+)$/.test(u.pathname);
}

