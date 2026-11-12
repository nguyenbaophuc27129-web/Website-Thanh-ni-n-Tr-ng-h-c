import type { JSONContent } from "@tiptap/core";
import { isSafeLinkHref } from "@/lib/safe-urls";
import { asPostDoc, emptyDoc, type PostDoc } from "./doc-utils";

/**
 * Chuyển nội dung Markdown rút gọn (bài viết trước trình soạn thảo mới, và kết quả
 * /api/fetch-article) sang tài liệu Tiptap. Hỗ trợ đúng tập cú pháp cũ:
 * ## / ### tiêu đề, ![chú thích](ảnh) + dòng *chú thích* ngay dưới, > trích dẫn,
 * - / 1. danh sách, **đậm**, *nghiêng*, ~~gạch ngang~~, <u>gạch chân</u>, [chữ](link).
 * Không dùng HTML/DOM nên chạy được ở mọi nơi; chữ lạ giữ nguyên dạng văn bản.
 */

type Mark = NonNullable<JSONContent["marks"]>[number];

const INLINE_RULES: { re: RegExp; mark: (m: RegExpExecArray) => Mark | null; inner: (m: RegExpExecArray) => string }[] = [
  {
    re: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
    mark: (m) => (isSafeLinkHref(m[2]) ? { type: "link", attrs: { href: m[2] } } : null),
    inner: (m) => m[1],
  },
  { re: /\*\*([^*\n]+?)\*\*/, mark: () => ({ type: "bold" }), inner: (m) => m[1] },
  { re: /<u>([\s\S]+?)<\/u>/, mark: () => ({ type: "underline" }), inner: (m) => m[1] },
  { re: /~~([^~\n]+?)~~/, mark: () => ({ type: "strike" }), inner: (m) => m[1] },
  { re: /(?<![*\w])\*(?![\s*])([^*\n]+?)\*(?![*\w])/, mark: () => ({ type: "italic" }), inner: (m) => m[1] },
];

function parseInline(text: string, marks: Mark[] = []): JSONContent[] {
  const out: JSONContent[] = [];
  const pushText = (t: string) => {
    if (t) out.push(marks.length ? { type: "text", text: t, marks } : { type: "text", text: t });
  };
  let rest = text;
  while (rest) {
    let best: { m: RegExpExecArray; rule: (typeof INLINE_RULES)[number] } | null = null;
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, rule };
    }
    if (!best) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, best.m.index));
    const mark = best.rule.mark(best.m);
    if (mark) out.push(...parseInline(best.rule.inner(best.m), [...marks, mark]));
    else pushText(best.m[0]);
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

/** Các dòng thường → một đoạn, xuống dòng đơn giữ thành ngắt dòng */
function paragraphOf(lines: string[], extra?: Record<string, unknown>): JSONContent {
  const content: JSONContent[] = [];
  lines.forEach((line, i) => {
    if (i > 0) content.push({ type: "hardBreak" });
    content.push(...parseInline(line));
  });
  return { type: "paragraph", ...(extra ? { attrs: extra } : {}), ...(content.length ? { content } : {}) };
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const IMAGE = /^!\[(.*?)\]\(((?:https?:\/\/|\/uploads\/)[^\s)]+)\)(?:\s*\n\*([\s\S]*?)\*)?$/;

function blockNodes(block: string, prev: JSONContent | undefined): JSONContent[] {
  const t = block.trim();
  if (!t) return [];
  if (t.startsWith("### ")) return [{ type: "heading", attrs: { level: 3 }, content: parseInline(t.slice(4).trim()) }];
  if (t.startsWith("## ")) return [{ type: "heading", attrs: { level: 2 }, content: parseInline(t.slice(3).trim()) }];
  if (t === "---" || t === "***") return [{ type: "horizontalRule" }];

  const img = t.match(IMAGE);
  if (img) {
    const caption = (img[3] || img[1]).trim();
    return [{ type: "figureImage", attrs: { src: img[2], alt: img[1].trim(), caption, width: "100", align: "center" } }];
  }
  // Dòng *chú thích* đứng riêng ngay sau ảnh chưa có chú thích → gắn vào ảnh đó
  const lone = t.match(/^\*([^*\n]+)\*$/);
  if (lone && prev?.type === "figureImage" && !prev.attrs?.caption) {
    prev.attrs = { ...prev.attrs, caption: lone[1].trim() };
    return [];
  }

  const lines = t.split("\n");
  if (lines.every((l) => l.trimStart().startsWith(">"))) {
    const inner = lines.map((l) => l.replace(/^\s*>\s?/, ""));
    return [{ type: "blockquote", content: [paragraphOf(inner)] }];
  }

  // Trộn đoạn thường và danh sách trong cùng khối (nút danh sách cũ chèn "\n- " giữa đoạn)
  const nodes: JSONContent[] = [];
  let para: string[] = [];
  type ListAcc = { type: "bulletList" | "orderedList"; items: string[] };
  // "as": giữ kiểu đầy đủ — biến được gán lại trong flushList nên không để TypeScript thu hẹp về null
  let list = null as ListAcc | null;
  const flushPara = () => {
    if (para.length) nodes.push(paragraphOf(para));
    para = [];
  };
  const flushList = () => {
    if (list) {
      nodes.push({
        type: list.type,
        content: list.items.map((item) => ({ type: "listItem", content: [paragraphOf([item])] })),
      });
    }
    list = null;
  };
  for (const line of lines) {
    const b = line.match(BULLET);
    const o = b ? null : line.match(ORDERED);
    const kind = b ? "bulletList" : o ? "orderedList" : null;
    if (kind) {
      flushPara();
      if (list?.type !== kind) flushList();
      list ??= { type: kind, items: [] };
      list.items.push((b ?? o)![1]);
    } else if (line.trim()) {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return nodes;
}

export function legacyMarkdownToDoc(markdown: string | null | undefined): PostDoc {
  const source = (markdown ?? "").replace(/\r\n?/g, "\n");
  const content: JSONContent[] = [];
  for (const block of source.split(/\n{2,}/)) {
    content.push(...blockNodes(block, content[content.length - 1]));
  }
  return content.length ? { type: "doc", content } : emptyDoc();
}

/** Nội dung để mở trong trình soạn thảo / hiển thị: content_doc nếu có, không thì chuyển từ Markdown cũ */
export const postDocOf = (post: { contentDoc?: unknown; content?: string | null }): PostDoc =>
  asPostDoc(post.contentDoc) ?? legacyMarkdownToDoc(post.content);
