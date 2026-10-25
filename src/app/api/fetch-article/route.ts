import { NextResponse } from "next/server";
import { BROWSER_UA, FACEBOOK_UA, fetchPublic } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";

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
    const res = await fetchPublic(target, isFacebook ? FACEBOOK_UA : BROWSER_UA);
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

    // Fallback cho bài đăng Facebook khi bị chặn crawler
    if (isFacebook) {
      if (!title || title.toLowerCase().includes("log in") || title.toLowerCase().includes("đăng nhập")) {
        title = `Bài viết chia sẻ từ Facebook: ${target.pathname.replace(/^\//, "").slice(0, 40)}`;
      }
      if (!excerpt || excerpt.toLowerCase().includes("log in")) {
        excerpt = `Nội dung chia sẻ từ liên kết Facebook (${target.href})`;
      }
      if (contentBlocks.length === 0) {
        contentBlocks = [
          excerpt,
          `*(Bài viết được trích xuất từ bài đăng Facebook: [Xem bài gốc](${target.href})).*`,
          "Bạn có thể bổ sung chi tiết nội dung, hình ảnh hoặc các liên kết bổ sung của bài viết ở phần soạn thảo này.",
        ];
      }
    }

    const content = contentBlocks.join("\n\n").slice(0, 30_000);

    if (!title && !content) {
      return NextResponse.json({ ok: false, error: "Không đọc được nội dung nào từ trang này." }, { status: 422 });
    }

    return NextResponse.json({ ok: true, title, excerpt, imageUrl, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FETCH_FAILED";
    console.warn("[TNTH][fetch-article] Lỗi trích xuất:", message);

    // Nếu là Facebook hoặc mạng bị chặn, tạo khung mô phỏng chứ không báo lỗi gãy
    if (isFacebook) {
      return NextResponse.json({
        ok: true,
        title: `Bài viết Facebook (${target.pathname.slice(0, 30)})`,
        excerpt: `Bài đăng trích dẫn từ Facebook: ${target.href}`,
        imageUrl: undefined,
        content: `*(Bài viết trích xuất từ Facebook: ${target.href}. Vui lòng dán nội dung chi tiết nếu trang yêu cầu quyền riêng tư).*`,
      });
    }
    return NextResponse.json({ ok: false, error: `Không tải được trang (${message})` }, { status: 502 });
  }
}
