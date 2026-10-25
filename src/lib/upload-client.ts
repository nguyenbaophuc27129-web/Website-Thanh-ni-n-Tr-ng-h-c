/**
 * Phía trình duyệt: gửi tệp lên /api/uploads, nhận lại đường dẫn /uploads/...
 * trên máy chủ. Dữ liệu lưu vào store/DB chỉ là đường dẫn này, không còn base64.
 */

export type UploadKind = "bai-viet" | "dong-gop" | "dien-dan" | "van-ban" | "tai-nguyen" | "du-an";

export interface UploadedFile {
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  name?: string;
}

async function parse(res: Response): Promise<UploadedFile> {
  const data = (await res.json().catch(() => null)) as { ok?: boolean; file?: UploadedFile; error?: string } | null;
  if (!res.ok || !data?.ok || !data.file) {
    throw new Error(data?.error ?? `Tải tệp thất bại (HTTP ${res.status}).`);
  }
  return data.file;
}

/** Tải 1 tệp từ máy người dùng lên máy chủ */
export async function uploadFile(file: File, kind: UploadKind): Promise<UploadedFile> {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  return parse(await fetch("/api/uploads", { method: "POST", body: form }));
}

/** Máy chủ tự tải tệp từ URL bên ngoài về lưu trữ riêng */
export async function uploadFromUrl(url: string, kind: UploadKind): Promise<UploadedFile> {
  return parse(
    await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, url }),
    }),
  );
}

export const isExternalUrl = (src?: string | null): src is string => !!src && /^https?:\/\//i.test(src.trim());

/**
 * Ảnh trong nội dung Markdown đang trỏ ra web ngoài (![..](https://...)) →
 * tải về máy chủ và thay bằng đường dẫn /uploads/... Ảnh nào không tải được
 * thì giữ nguyên link cũ và được đếm vào `failed`.
 */
export async function localizeMarkdownImages(
  content: string,
  kind: UploadKind,
): Promise<{ content: string; converted: number; failed: number }> {
  const re = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const urls = Array.from(new Set(Array.from(content.matchAll(re), (m) => m[2])));
  if (urls.length === 0) return { content, converted: 0, failed: 0 };

  const map = new Map<string, string>();
  let failed = 0;
  for (const u of urls) {
    try {
      map.set(u, (await uploadFromUrl(u, kind)).url);
    } catch {
      failed++;
    }
  }
  const next = content.replace(re, (whole, alt: string, u: string) => (map.has(u) ? `![${alt}](${map.get(u)})` : whole));
  return { content: next, converted: map.size, failed };
}
