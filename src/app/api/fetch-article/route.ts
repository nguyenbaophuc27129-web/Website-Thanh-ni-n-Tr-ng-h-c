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

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

/** fetch tự đi theo chuyển hướng (≤5 lần) và kiểm tra lại host ở từng bước. */
async function fetchPublic(start: URL): Promise<Response> {
  const signal = AbortSignal.timeout(8000);
  let current = start;
  for (let hop = 0; hop <= 5; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") throw new Error("protocol");
    await assertPublicHost(current);
    const res = await fetch(current.href, { headers: FETCH_HEADERS, redirect: "manual", signal });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    current = new URL(location, current.href);
  }
  throw new Error("chuyển hướng quá nhiều lần");
}

/* ============ Helper parse HTML ============ */

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&[a-z]+;/gi, "");
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
  return (html.match(re)?.[1] ?? html.match(alt)?.[1] ?? "").trim();
}

function stripBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|nav|footer|header|aside|form|iframe|svg)\b[\s\S]*?<\/\1>/gi, " ");
}

function extractParagraphs(html: string): string[] {
  const cleaned = stripBlocks(html);
  const out: string[] = [];
  for (const m of cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text.length >= 40) out.push(text);
  }
  return out;
}

/** POST /api/fetch-article — trích xuất tiêu đề/mô tả/ảnh/đoạn văn từ 1 đường link bài báo */
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

  try {
    const res = await fetchPublic(target);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Trang trả về lỗi HTTP ${res.status}` }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ ok: false, error: `Đường dẫn không phải trang web HTML (${contentType.split(";")[0]})` }, { status: 415 });
    }
    const html = (await res.text()).slice(0, 600_000);

    const title =
      metaContent(html, "property", "og:title") ||
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
    const excerpt =
      metaContent(html, "property", "og:description") || metaContent(html, "name", "description");
    const rawImage = metaContent(html, "property", "og:image");
    let imageUrl: string | undefined;
    try {
      imageUrl = rawImage ? new URL(rawImage, target.href).href : undefined;
    } catch {
      imageUrl = undefined;
    }
    const content = extractParagraphs(html).join("\n\n").slice(0, 20_000);

    if (!title && !content) {
      return NextResponse.json({ ok: false, error: "Không đọc được nội dung nào từ trang này." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, title, excerpt, imageUrl, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "FETCH_FAILED";
    console.warn("[TNTH][fetch-article] Lỗi trích xuất:", message);
    return NextResponse.json({ ok: false, error: `Không tải được trang (${message})` }, { status: 502 });
  }
}
