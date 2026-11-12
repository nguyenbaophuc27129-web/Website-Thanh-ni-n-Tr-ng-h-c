import type { JSONContent } from "@tiptap/core";

/**
 * Hằng số và hàm thuần cho tài liệu bài viết — KHÔNG kéo theo thư viện Tiptap (chỉ dùng kiểu),
 * nên dùng được ở trang công khai (post-content.tsx), máy chủ (store-tables.ts) và script node.
 * Lược đồ đầy đủ (cần Tiptap) ở schema.ts.
 */

export type PostDoc = JSONContent;

export const IMAGE_WIDTHS = ["25", "50", "75", "100"] as const;
export const IMAGE_ALIGNS = ["left", "center", "right"] as const;
export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

/** Tài liệu rỗng hợp lệ (bản mới mỗi lần gọi — trình soạn thảo có thể sửa tại chỗ) */
export const emptyDoc = (): PostDoc => ({ type: "doc", content: [{ type: "paragraph" }] });

/** Giá trị content_doc từ DB/đồng bộ (object hoặc chuỗi JSON) → tài liệu, hoặc null nếu không phải tài liệu */
export function asPostDoc(value: unknown): JSONContent | null {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v && typeof v === "object" && (v as JSONContent).type === "doc" ? (v as JSONContent) : null;
}

/**
 * Văn bản thuần của bài viết (cột published_posts.content) — dùng cho tìm kiếm tin, đoạn trích,
 * mô tả. Không phụ thuộc Tiptap: chạy được cả ở máy chủ (store-tables) lẫn trình duyệt.
 * Đoạn/khối cách nhau một dòng trống; mục danh sách bắt đầu bằng "- "; chú thích ảnh giữ lại.
 */
export function docToPlainText(doc: JSONContent | null | undefined): string {
  const blocks: string[] = [];

  const inline = (node: JSONContent): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    return (node.content ?? []).map(inline).join("");
  };

  const walk = (node: JSONContent, prefix = "") => {
    switch (node.type) {
      case "paragraph":
      case "heading": {
        const t = inline(node).trim();
        if (t) blocks.push(prefix + t);
        return;
      }
      case "figureImage": {
        const caption = String(node.attrs?.caption ?? "").trim();
        if (caption) blocks.push(caption);
        return;
      }
      case "listItem":
        (node.content ?? []).forEach((c, i) => walk(c, i === 0 ? "- " : "  "));
        return;
      case "tableRow": {
        const cells = (node.content ?? []).map((c) => inline(c).trim()).filter(Boolean);
        if (cells.length) blocks.push(cells.join(" | "));
        return;
      }
      case "youtube":
      case "horizontalRule":
        return;
      default:
        (node.content ?? []).forEach((c) => walk(c, prefix));
    }
  };

  if (doc) walk(doc);
  return blocks.join("\n\n");
}

/** Bài chưa có gì: không chữ, không ảnh/video/bảng */
export function isDocEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc) return true;
  let found = false;
  const walk = (n: JSONContent) => {
    if (found) return;
    if ((n.type === "text" && n.text?.trim()) || n.type === "figureImage" || n.type === "youtube" || n.type === "table") {
      found = true;
      return;
    }
    n.content?.forEach(walk);
  };
  walk(doc);
  return !found;
}
