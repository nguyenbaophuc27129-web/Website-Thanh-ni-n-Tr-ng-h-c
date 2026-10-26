import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode, type Schema } from "@tiptap/pm/model";
import { isSafeLinkHref, youtubeVideoId } from "@/lib/safe-urls";
import { IMAGE_ALIGNS, IMAGE_WIDTHS, TEXT_ALIGNS } from "./doc-utils";
import { postExtensions } from "./schema";

/**
 * Kiểm tra nội dung bài viết (content_doc) trước khi ghi — chốt chặn XSS phía máy chủ
 * (store-write-policy.ts) và kiểm sớm ở trình duyệt trước khi lưu.
 * Danh sách TRẮNG: chỉ loại khối/định dạng/thuộc tính khai ở ALLOWED, giá trị phải đúng kiểu;
 * sau đó dựng lại bằng lược đồ Tiptap để chắc cấu trúc lồng nhau hợp lệ.
 */

const MAX_JSON_CHARS = 1_500_000;
const MAX_DEPTH = 40;
const MAX_NODES = 30_000;

type AttrCheck = (v: unknown) => boolean;

const isNull = (v: unknown) => v === null || v === undefined;
const nullOr = (c: AttrCheck): AttrCheck => (v) => isNull(v) || c(v);
const str = (max: number): AttrCheck => (v) => typeof v === "string" && v.length <= max;
const intIn = (min: number, max: number): AttrCheck => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const oneOf = (list: readonly unknown[]): AttrCheck => (v) => list.includes(v);
const textAlign = nullOr(oneOf(TEXT_ALIGNS));
const cellAttrs = {
  colspan: intIn(1, 50),
  rowspan: intIn(1, 50),
  colwidth: nullOr((v) => Array.isArray(v) && v.length <= 50 && v.every(intIn(1, 5000))),
};

export interface ValidateOptions {
  /** Đường dẫn ảnh hợp lệ — máy chủ: đúng tệp /uploads/bai-viet/…; trình duyệt: isSafeFileUrl */
  isImageSrc: (src: unknown) => boolean;
}

function allowedNodes(opts: ValidateOptions): Record<string, Record<string, AttrCheck>> {
  return {
    doc: {},
    text: {},
    paragraph: { textAlign },
    heading: { level: oneOf([2, 3]), textAlign },
    bulletList: {},
    orderedList: { start: intIn(0, 100_000), type: nullOr(oneOf(["1", "a", "A", "i", "I"])) },
    listItem: {},
    blockquote: {},
    hardBreak: {},
    horizontalRule: {},
    figureImage: {
      src: opts.isImageSrc,
      alt: nullOr(str(500)),
      caption: nullOr(str(1000)),
      width: oneOf(IMAGE_WIDTHS),
      align: oneOf(IMAGE_ALIGNS),
    },
    youtube: {
      src: (v) => youtubeVideoId(v) !== null,
      start: nullOr(intIn(0, 100_000)),
      width: nullOr(intIn(1, 4000)),
      height: nullOr(intIn(1, 4000)),
    },
    table: {},
    tableRow: {},
    tableHeader: cellAttrs,
    tableCell: cellAttrs,
  };
}

const ALLOWED_MARKS: Record<string, Record<string, AttrCheck>> = {
  bold: {},
  italic: {},
  underline: {},
  strike: {},
  link: {
    href: isSafeLinkHref,
    target: nullOr(oneOf(["_blank"])),
    rel: nullOr((v) => typeof v === "string" && /^[a-z ]{0,60}$/.test(v)),
    class: isNull,
    title: nullOr(str(300)),
  },
};

const NODE_KEYS = new Set(["type", "attrs", "content", "marks", "text"]);

const NODE_LABEL: Record<string, string> = {
  figureImage: "ảnh",
  youtube: "video YouTube",
  link: "liên kết",
};

function checkAttrs(
  kind: string,
  attrs: unknown,
  rules: Record<string, AttrCheck>,
): string | null {
  if (attrs === undefined) return null;
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return `thuộc tính của "${kind}" không hợp lệ`;
  for (const [key, value] of Object.entries(attrs)) {
    const rule = rules[key];
    if (!rule) return `thuộc tính "${key}" của "${kind}" không được phép`;
    if (!rule(value)) {
      const label = NODE_LABEL[kind];
      if (label && (key === "src" || key === "href")) {
        return kind === "figureImage"
          ? "ảnh trong bài phải được tải lên máy chủ (/uploads/bai-viet/…)"
          : `${label} có đường dẫn không hợp lệ`;
      }
      return `giá trị "${key}" của "${kind}" không hợp lệ`;
    }
  }
  return null;
}

let schemaCache: Schema | null = null;
const postSchema = () => (schemaCache ??= getSchema(postExtensions()));

/** null = hợp lệ; chuỗi = lý do từ chối (tiếng Việt, hiện cho người soạn) */
export function validatePostDoc(value: unknown, opts: ValidateOptions): string | null {
  let doc: unknown = value;
  if (typeof doc === "string") {
    if (doc.length > MAX_JSON_CHARS) return "nội dung bài quá lớn";
    try {
      doc = JSON.parse(doc);
    } catch {
      return "nội dung bài không đọc được";
    }
  } else if (JSON.stringify(doc ?? null).length > MAX_JSON_CHARS) {
    return "nội dung bài quá lớn";
  }
  if (!doc || typeof doc !== "object" || (doc as JSONContent).type !== "doc") return "nội dung bài không đúng định dạng";

  const nodes = allowedNodes(opts);
  let count = 0;

  const visit = (node: unknown, depth: number): string | null => {
    if (++count > MAX_NODES) return "nội dung bài quá lớn";
    if (depth > MAX_DEPTH) return "nội dung lồng nhau quá sâu";
    if (!node || typeof node !== "object" || Array.isArray(node)) return "nội dung bài không đúng định dạng";
    const n = node as Record<string, unknown>;
    for (const key of Object.keys(n)) if (!NODE_KEYS.has(key)) return `trường "${key}" không được phép`;
    const type = n.type;
    if (typeof type !== "string" || !nodes[type]) return `loại nội dung "${String(type)}" không được phép`;
    const attrErr = checkAttrs(type, n.attrs, nodes[type]);
    if (attrErr) return attrErr;
    if (type === "text" ? typeof n.text !== "string" : n.text !== undefined) return "nội dung chữ không hợp lệ";
    if (n.marks !== undefined) {
      if (!Array.isArray(n.marks) || n.marks.length > 10) return "định dạng chữ không hợp lệ";
      for (const m of n.marks) {
        const mark = m as Record<string, unknown>;
        if (!mark || typeof mark !== "object" || typeof mark.type !== "string" || !ALLOWED_MARKS[mark.type]) {
          return `định dạng "${String(mark?.type)}" không được phép`;
        }
        if (Object.keys(mark).some((k) => k !== "type" && k !== "attrs")) return "định dạng chữ không hợp lệ";
        const err = checkAttrs(mark.type, mark.attrs, ALLOWED_MARKS[mark.type]);
        if (err) return err;
      }
    }
    if (n.content !== undefined) {
      if (!Array.isArray(n.content)) return "nội dung bài không đúng định dạng";
      for (const child of n.content) {
        const err = visit(child, depth + 1);
        if (err) return err;
      }
    }
    return null;
  };

  const err = visit(doc, 0);
  if (err) return err;

  // Cấu trúc lồng nhau (vd. bảng chỉ chứa hàng, danh sách chỉ chứa mục) theo đúng lược đồ
  try {
    PMNode.fromJSON(postSchema(), doc).check();
  } catch {
    return "cấu trúc nội dung bài không hợp lệ";
  }
  return null;
}
