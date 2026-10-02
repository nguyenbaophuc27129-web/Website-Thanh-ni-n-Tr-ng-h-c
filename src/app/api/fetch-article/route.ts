import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    const res = await fetch(target.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
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
