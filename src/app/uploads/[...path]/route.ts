import { readFile } from "node:fs/promises";
import path from "node:path";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/server/media";

export const runtime = "nodejs";

/**
 * Phục vụ /uploads/* khi chạy `next dev` trên máy lập trình viên.
 * Trên production Caddy trả thẳng các tệp này từ /srv/tnth/uploads
 * (deploy/Caddyfile) nên request không bao giờ tới đây.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path ?? [];
  const abs = path.resolve(UPLOAD_DIR, ...parts);
  const ext = path.extname(abs).slice(1).toLowerCase();
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep) || !MIME_BY_EXT[ext]) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
