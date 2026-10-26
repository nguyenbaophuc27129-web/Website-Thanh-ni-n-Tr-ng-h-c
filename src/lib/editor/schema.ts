import { Node, mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { isSafeLinkHref } from "@/lib/safe-urls";
import { IMAGE_ALIGNS, IMAGE_WIDTHS, TEXT_ALIGNS } from "./doc-utils";

/**
 * Lược đồ nội dung bài viết (Tiptap/ProseMirror) — dùng chung cho:
 * - trình soạn thảo (src/components/editor/rich-editor.tsx, thêm các phần chỉ dùng khi soạn),
 * - kiểm tra phía máy chủ (src/lib/editor/doc-validate.ts trong luật ghi publishedPosts).
 * Thêm/bớt loại khối hay định dạng thì sửa cả ba nơi đi kèm: danh sách trắng trong
 * doc-validate.ts, bộ hiển thị src/components/public/post-content.tsx và kiểu .post-body (globals.css).
 */

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

/**
 * Ảnh trong bài: <figure> gồm ảnh + chú thích, chọn độ rộng (25–100%) và vị trí (trái/giữa/phải).
 * Đọc được cả <figure><img><figcaption> (bài dán từ báo khác) lẫn <img> lẻ (dán từ Word/Docs).
 */
export const FigureImage = Node.create({
  name: "figureImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: "100" },
      align: { default: "center" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector("img");
          if (!img?.getAttribute("src")) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            caption: (el as HTMLElement).querySelector("figcaption")?.textContent?.trim() ?? "",
            width: oneOf(IMAGE_WIDTHS, (el as HTMLElement).dataset.width, "100"),
            align: oneOf(IMAGE_ALIGNS, (el as HTMLElement).dataset.align, "center"),
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("src"), alt: (el as HTMLElement).getAttribute("alt") ?? "" }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, caption, width, align } = node.attrs as Record<string, string>;
    const figure = mergeAttributes(HTMLAttributes, { "data-width": width, "data-align": align });
    delete figure.src;
    delete figure.alt;
    delete figure.caption;
    delete figure.width;
    delete figure.align;
    const img = ["img", { src, alt }];
    return caption ? ["figure", figure, img, ["figcaption", {}, caption]] : ["figure", figure, img];
  },
});

/** Định dạng dùng chung — KHÔNG gồm phần chỉ cần khi soạn (placeholder, đếm ký tự, dán tệp…) */
export function postExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => isSafeLinkHref(url),
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: [...TEXT_ALIGNS] }),
    FigureImage,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ nocookie: true, controls: true, modestBranding: true, addPasteHandler: true }),
  ];
}
