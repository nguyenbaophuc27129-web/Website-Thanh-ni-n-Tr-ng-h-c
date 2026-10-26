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


/**
 * Liên kết trong nội dung bài viết: http(s) tuyệt đối, mailto:, tel:, đường dẫn nội bộ "/..."
 * (không phải "//host") hoặc neo "#...". Chặn javascript:, data:, vbscript: và mọi scheme lạ.
 */
export function isSafeLinkHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length === 0 || href.length > 2000) return false;
  if (/[\u0000-\u001f\s]/.test(href)) return false;
  if (href.startsWith("#")) return true;
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol === "mailto:" || u.protocol === "tel:") return true;
  return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password && !!u.hostname;
}

const YT_EMBED_HOSTS = new Set([...YT_HOSTS, "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Mã clip (11 ký tự) từ link YouTube an toàn: watch?v=, youtu.be/, /shorts/, /embed/ (kể cả
 * youtube-nocookie.com — dạng trình soạn thảo lưu lại khi đọc iframe). Không phải YouTube → null.
 */
export function youtubeVideoId(url: unknown): string | null {
  if (typeof url !== "string" || url.length > 500) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port || !YT_EMBED_HOSTS.has(u.hostname)) return null;
  const id = u.hostname.endsWith("youtu.be")
    ? u.pathname.slice(1)
    : u.pathname === "/watch"
      ? u.searchParams.get("v")
      : u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)$/)?.[1];
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
