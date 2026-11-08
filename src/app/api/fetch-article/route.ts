import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export const runtime = "nodejs";

/* ============ Chặn SSRF: không cho tải địa chỉ nội bộ ============ */

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
async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  const addresses = family
    ? [{ address: host, family }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address, a.family))) {
    throw new Error("địa chỉ nội bộ không được phép");
  }
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FACEBOOK_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

/** fetch tự đi theo chuyển hướng (≤5 lần) và kiểm tra lại host ở từng bước.
 * Facebook trả trang rất chậm (thường >20s) nên cần timeout riêng dài hơn web thường. */
async function fetchPublic(start: URL, userAgent = BROWSER_UA, timeoutMs = 12000): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
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

/* ============ Helper parse HTML & Entities ============ */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  bull: "•",
  copy: "©",
  reg: "®",
  deg: "°",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  aacute: "á",
  agrave: "à",
  acirc: "â",
  atilde: "ã",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  iacute: "í",
  igrave: "ì",
  oacute: "ó",
  ograve: "ò",
  ocirc: "ô",
  otilde: "õ",
  uacute: "ú",
  ugrave: "ù",
  ucirc: "û",
  yacute: "ý",
};

export function decodeEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return "";
      }
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => {
      const lower = name.toLowerCase();
      return NAMED_ENTITIES[lower] ?? match;
    })
    .replace(/\u00a0/g, " ");
}

function metaContent(html: string, attributeName: "property" | "name", key: string): string {
  const re = new RegExp(
    `<meta[^>]*${attributeName}=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const alt = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attributeName}=["']${key}["']`,
    "i"
  );
  const raw = html.match(re)?.[1] ?? html.match(alt)?.[1] ?? "";
  return decodeEntities(raw).trim();
}

/** Tách đoạn văn từ mô tả bài đăng Facebook (og:description giữ nguyên xuống dòng) */
function paragraphsOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 2);
}

function stripBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|nav|footer|header|aside|form|iframe|svg)\b[\s\S]*?<\/\1>/gi, " ");
}

function resolveImgSrc(tag: string, baseUrl: string): string | null {
  const dataLargeM = tag.match(/\bdata-large-src=["']([^"']+)["']/i);
  const dataSrcM = tag.match(/\bdata-src=["']([^"']+)["']/i);
  const dataOrigM = tag.match(/\bdata-original=["']([^"']+)["']/i);
  const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
  const raw = dataLargeM?.[1] || dataSrcM?.[1] || dataOrigM?.[1] || srcM?.[1];
  if (!raw || raw.startsWith("data:image")) return null;
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return null;
  }
}

function extractRichContent(html: string, baseUrl: string): string[] {
  const cleaned = stripBlocks(html);
  const blocks: string[] = [];

  // Match tags of interest: h2, h3, figure, p
  const elementRe = /<(h2|h3|figure|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = elementRe.exec(cleaned)) !== null) {
    const tag = m[1].toLowerCase();
    const inner = m[3];

    if (tag === "h2" || tag === "h3") {
      const heading = decodeEntities(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (heading.length >= 4 && !/^(chia sẻ|bình luận|tin liên quan|bài viết khác|xem thêm)/i.test(heading)) {
        blocks.push((tag === "h2" ? "## " : "### ") + heading);
      }
    } else if (tag === "figure") {
      const imgM = inner.match(/<img\b[^>]*>/i);
      const capM = inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
      const caption = capM
        ? decodeEntities(capM[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
        : "";
      if (imgM) {
        const src = resolveImgSrc(imgM[0], baseUrl);
        if (src) {
          const altM = imgM[0].match(/\balt=["']([^"']*)["']/i);
          const finalCaption = caption || (altM && !altM[1].includes("-") ? decodeEntities(altM[1]).trim() : "");
          blocks.push(`![${finalCaption}](${src})` + (finalCaption ? `\n*${finalCaption}*` : ""));
        }
      }
    } else if (tag === "p") {
      // Check if p tag wraps an image (common in WordPress & classic CMS)
      const imgM = inner.match(/<img\b[^>]*>/i);
      if (imgM) {
        const src = resolveImgSrc(imgM[0], baseUrl);
        if (src) {
          const altM = imgM[0].match(/\balt=["']([^"']*)["']/i);
          const alt = altM ? decodeEntities(altM[1]).trim() : "";
          blocks.push(`![${alt}](${src})` + (alt ? `\n*${alt}*` : ""));
        }
      }
      const text = decodeEntities(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (text.length >= 30 && !/^(bản quyền thuộc|theo dõi chúng tôi|chia sẻ bài viết|tải ứng dụng)/i.test(text)) {
        blocks.push(text);
      }
    }
  }

  // Deduplicate consecutive identical blocks
  const deduped: string[] = [];
  for (const b of blocks) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== b) {
      deduped.push(b);
    }
  }
  return deduped;
}

/** POST /api/fetch-article — trích xuất tiêu đề/mô tả/ảnh/nội dung từ đường link báo hoặc Facebook */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { url?: string } | null;
  const rawUrl = payload?.url?.trim() ?? "";

  let target: URL;
  try {
    target = new URL(rawUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("protocol");
  } catch {
    return NextResponse.json({ ok: false, error: "Đường dẫn không hợp lệ — cần bắt đầu bằng http:// hoặc https://" }, { status: 400 });
  }

  const isFacebook =
    target.hostname.includes("facebook.com") ||
    target.hostname.includes("fb.com") ||
    target.hostname.includes("fb.watch");

  try {
    const res = await fetchPublic(target, isFacebook ? FACEBOOK_UA : BROWSER_UA, isFacebook ? 25000 : 12000);
    if (!res.ok && !isFacebook) {
      return NextResponse.json({ ok: false, error: `Trang trả về lỗi HTTP ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && !contentType.includes("text/html") && !isFacebook) {
      return NextResponse.json({ ok: false, error: `Đường dẫn không phải trang web HTML (${contentType.split(";")[0]})` }, { status: 415 });
    }

    const html = res.ok ? (await res.text()).slice(0, 800_000) : "";

    let title =
      metaContent(html, "property", "og:title") ||
      metaContent(html, "name", "twitter:title") ||
      metaContent(html, "name", "title") ||
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();

    let excerpt =
      metaContent(html, "property", "og:description") ||
      metaContent(html, "name", "twitter:description") ||
      metaContent(html, "name", "description");

    const rawImage =
      metaContent(html, "property", "og:image") ||
      metaContent(html, "name", "twitter:image");

    let imageUrl: string | undefined;
    try {
      imageUrl = rawImage ? new URL(rawImage, target.href).href : undefined;
    } catch {
      imageUrl = undefined;
    }

    let contentBlocks = extractRichContent(html, target.href);

    // Bài đăng Facebook: og:description chính là TOÀN BỘ chữ bài đăng, og:image là ảnh bài đăng
    if (isFacebook) {
      const isPermalink =
        /\/(posts|permalink\.php|story\.php|photos|videos|reel|share\/p)\//.test(target.href) ||
        /story_fbid|fb\.watch/.test(target.href);
      const descParas = paragraphsOf(excerpt);
      const looksLogin = !title || /log\s?in|đăng nhập/i.test(title);

      if (isPermalink && descParas.length > 0) {
        // Tiêu đề chuẩn: dòng đầu của bài đăng (og:title chỉ là tên fanpage)
        const firstLine = descParas[0];
        title = firstLine.length > 110 ? `${firstLine.slice(0, 107)}…` : firstLine;
        excerpt = descParas.join(" ").slice(0, 300);
        // Nội dung = TOÀN BỘ chữ bài đăng — bỏ markup rác FB scrape được (ảnh lookaside
        // crawler không xem được ngoài trình duyệt; ảnh thật đã tải về làm cover dataUrl)
        contentBlocks = [
          ...descParas,
          `*Nguồn: [Bài viết gốc trên Facebook](${target.href})*`,
        ];
      } else {
        if (looksLogin) {
          title = `Trang Facebook: ${target.pathname.replace(/^\//, "").split("/")[0] || target.hostname}`;
        }
        excerpt = paragraphsOf(excerpt).join(" ").slice(0, 300);
      }

      if (contentBlocks.length === 0 && !title) {
        return NextResponse.json(
          { ok: false, error: "Không đọc được nội dung bài viết từ Facebook (bài có thể ở chế độ riêng tư). Bạn hãy dán nội dung thủ công." },
          { status: 422 }
        );
      }
    }

    const content = contentBlocks.join("\n\n").slice(0, 30_000);

    if (!title && !content) {
      return NextResponse.json({ ok: false, error: "Không đọc được nội dung nào từ trang này." }, { status: 422 });
    }

    // Tải ảnh về phía server và chuyển sang Data URL (tránh lỗi hotlink chặn từ domain gốc)
    let imageDataUrl: string | undefined;
    if (imageUrl) {
      try {
        const imgTarget = new URL(imageUrl);
        const imgRes = await fetchPublic(imgTarget, isFacebook ? FACEBOOK_UA : BROWSER_UA, 15000);
        if (imgRes.ok) {
          const rawContentType = imgRes.headers.get("content-type") || "";
          const contentType = rawContentType.split(";")[0].trim().toLowerCase();
          const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
          if (validTypes.includes(contentType) || contentType.startsWith("image/")) {
            const arrayBuf = await imgRes.arrayBuffer();
            if (arrayBuf.byteLength > 0 && arrayBuf.byteLength <= 3 * 1024 * 1024) {
              const b64 = Buffer.from(arrayBuf).toString("base64");
              imageDataUrl = `data:${contentType || "image/jpeg"};base64,${b64}`;
            }
          }
        }
      } catch (imgErr) {
        console.warn("[TNTH][fetch-article] Không tải được ảnh đính kèm để chuyển dataUrl:", imgErr);
      }
    }

    return NextResponse.json({ ok: true, title, excerpt, imageUrl, imageDataUrl, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FETCH_FAILED";
    console.warn("[TNTH][fetch-article] Lỗi trích xuất:", message);

    // Facebook: báo lỗi rõ ràng thay vì trả khung mô phỏng — dữ liệu phải thật
    if (isFacebook) {
      return NextResponse.json(
        { ok: false, error: "Không tải được bài viết từ Facebook (mạng chậm hoặc bài ở chế độ riêng tư). Bạn hãy dán nội dung và ảnh thủ công." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: false, error: `Không tải được trang (${message})` }, { status: 502 });
  }
}
