/**
 * Dọn HTML dán từ Microsoft Word / Google Docs trước khi Tiptap đọc (editorProps.transformPastedHTML).
 * Chỉ chạy ở trình duyệt. DOMParser dựng tài liệu "trơ" (không chạy script, không tải ảnh); sau
 * bước này lược đồ Tiptap vẫn chỉ nhận đúng định dạng đã khai — đây là bước làm sạch, không phải chốt
 * chặn bảo mật (chốt chặn là validatePostDoc phía máy chủ).
 *
 * Phần dựng lại danh sách của Word (readWordListItems / wrapWordListItems) chuyển từ
 * Jodit Editor 4.18.10 — src/core/helpers/html/word-lists.ts, giấy phép MIT:
 *   Copyright (c) 2013-2026 Valerii Chupurnov, https://xdsoft.net
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *   and associated documentation files (the "Software"), to deal in the Software without restriction,
 *   including without limitation the rights to use, copy, modify, merge, publish, distribute,
 *   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions: The above copyright notice and this
 *   permission notice shall be included in all copies or substantial portions of the Software.
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
 */

/* ---------------- Danh sách của Word (theo Jodit, MIT) ---------------- */

interface WordListItem {
  paragraph: HTMLElement;
  list: string;
  level: number;
  tag: "ul" | "ol";
  listStyleType: string | null;
  start: number;
}

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function romanValue(roman: string): number {
  let value = 0;
  for (let i = 0; i < roman.length; i += 1) {
    const current = ROMAN[roman[i]];
    const next = ROMAN[roman[i + 1]] || 0;
    value += current < next ? -current : current;
  }
  return value;
}

/** Ký hiệu đầu mục của Word (`1.`, `b)`, `iv.`, `·`, `o`, `§`) quyết định loại danh sách */
function parseMarker(marker: string): Pick<WordListItem, "tag" | "listStyleType" | "start"> {
  const text = marker.replace(/\s+/g, "");
  const decimal = /^\(?(?:\d+\.)*(\d+)[.)]?$/.exec(text);
  if (decimal) return { tag: "ol", listStyleType: null, start: Number(decimal[1]) };
  const letters = /^\(?([a-z]+|[A-Z]+)[.)]$/.exec(text);
  if (letters) {
    const value = letters[1];
    const lower = value.toLowerCase();
    const upper = value !== lower;
    if (/^[ivxlcdm]+$/.test(lower) && (lower.length > 1 || lower === "i")) {
      return { tag: "ol", listStyleType: upper ? "upper-roman" : "lower-roman", start: romanValue(lower) };
    }
    // Word đánh tiếp danh sách chữ cái bằng aa, bb, ...
    if (/^([a-z])\1*$/.test(lower)) {
      return {
        tag: "ol",
        listStyleType: upper ? "upper-alpha" : "lower-alpha",
        start: (lower.length - 1) * 26 + lower.charCodeAt(0) - 96,
      };
    }
  }
  return { tag: "ul", listStyleType: null, start: 1 };
}

const isBlankElement = (el: Element) => !el.textContent?.trim() && !el.querySelector("img");

/** Bỏ ký hiệu đầu mục và các thẻ bọc nó bị rỗng theo */
function removeMarker(marker: Element, paragraph: Element) {
  let parent = marker.parentElement;
  marker.remove();
  while (parent && parent !== paragraph && isBlankElement(parent)) {
    const next = parent.parentElement;
    parent.remove();
    parent = next;
  }
}

/** Tìm đoạn danh sách của Word (`<p style="mso-list:l0 level1 lfo1">`), đọc danh sách/cấp/loại, bỏ ký hiệu */
function readWordListItems(root: Element): WordListItem[] {
  const items: WordListItem[] = [];
  root.querySelectorAll("p").forEach((paragraph) => {
    const match = /mso-list:\s*l(\d+)\s+level(\d+)(?:\s+lfo(\d+))?/i.exec(paragraph.getAttribute("style") || "");
    if (!match) return;
    const marker = Array.from(paragraph.querySelectorAll("[style]")).find((el) =>
      /mso-list:\s*ignore/i.test(el.getAttribute("style") || ""),
    );
    items.push({
      paragraph,
      list: `${match[1]}:${match[3] || ""}`,
      level: Number(match[2]),
      ...parseMarker(marker?.textContent || ""),
    });
    if (marker) removeMarker(marker, paragraph);
  });
  return items;
}

/** Phần tử liền trước, bỏ qua chú thích và chữ trắng */
function previousElement(node: Element): Element | null {
  let prev = node.previousSibling;
  while (prev && (prev.nodeType === 8 || (prev.nodeType === 3 && !prev.textContent?.trim()))) prev = prev.previousSibling;
  return prev?.nodeType === 1 ? (prev as Element) : null;
}

/** Biến các đoạn đã đọc thành <ul>/<ol>, lồng theo cấp */
function wrapWordListItems(items: WordListItem[]) {
  type Level = { level: number; list: string; element: HTMLElement; li?: HTMLElement };
  let stack: Level[] = [];
  const continues = items.map((item, i) => i > 0 && previousElement(item.paragraph) === items[i - 1].paragraph);
  items.forEach((item, index) => {
    const { paragraph } = item;
    if (!continues[index]) stack = [];
    while (stack.length && stack[stack.length - 1].level > item.level) stack.pop();
    let top = stack[stack.length - 1];
    if (top && top.level === item.level && top.list !== item.list) {
      stack.pop();
      top = stack[stack.length - 1];
    }
    const doc = paragraph.ownerDocument;
    if (!top || top.level < item.level) {
      const element = doc.createElement(item.tag);
      if (item.listStyleType) element.style.listStyleType = item.listStyleType;
      if (item.tag === "ol" && item.start !== 1) element.setAttribute("start", String(item.start));
      if (top?.li) top.li.appendChild(element);
      else paragraph.before(element);
      top = { level: item.level, list: item.list, element };
      stack.push(top);
    }
    const li = doc.createElement("li");
    const p = doc.createElement("p");
    p.style.textAlign = paragraph.style.textAlign;
    while (paragraph.firstChild) p.appendChild(paragraph.firstChild);
    li.appendChild(p);
    paragraph.remove();
    top.element.appendChild(li);
    top.li = li;
  });
}

/* ---------------- Dọn chung ---------------- */

const KEEP_STYLES = ["text-align", "font-weight", "font-style", "text-decoration", "text-decoration-line"];
const DROP_TAGS = "style, script, meta, link, title, xml, head, noscript, iframe, object, embed";
const FROM_WORD = /class="?Mso|xmlns:[ow]="urn:schemas-microsoft-com|<o:p>|mso-list|urn:schemas-microsoft-com:office/i;

export interface PasteCleanResult {
  html: string;
  /** Ảnh bị bỏ vì trình duyệt không đọc được (file:// của Word, ảnh nhúng VML) */
  droppedImages: number;
}

export function cleanPastedHtml(html: string): PasteCleanResult {
  if (typeof DOMParser === "undefined" || !html) return { html, droppedImages: 0 };
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  let droppedImages = 0;

  if (FROM_WORD.test(html)) wrapWordListItems(readWordListItems(body));

  body.querySelectorAll(DROP_TAGS).forEach((el) => el.remove());
  // Ảnh: chỉ giữ http(s) (máy chủ sẽ tải về /uploads) và data:image (tải lên khi lưu)
  body.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (!/^(https?:|data:image\/)/i.test(src)) {
      img.remove();
      droppedImages++;
    }
  });
  // Ảnh nhúng kiểu VML của Word (<v:imagedata>) — không đọc được
  body.querySelectorAll("*").forEach((el) => {
    if (el.tagName.toLowerCase().startsWith("v:")) {
      if (el.tagName.toLowerCase() === "v:imagedata") droppedImages++;
      el.remove();
    }
  });

  body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    // Thẻ của Office (<o:p>, <w:sdt>…) và <font>: bỏ thẻ, giữ chữ
    if (tag.includes(":") || tag === "font") {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    // align="center" (Word, trang cũ) → style để Tiptap đọc được canh lề
    const align = el.getAttribute("align");
    if (align && /^(left|center|right|justify)$/i.test(align)) (el as HTMLElement).style.textAlign = align.toLowerCase();
    const style = el.getAttribute("style");
    if (style) {
      const kept = style
        .split(";")
        .map((s) => s.trim())
        .filter((s) => KEEP_STYLES.includes(s.split(":")[0]?.trim().toLowerCase() ?? ""));
      if (kept.length) el.setAttribute("style", kept.join("; "));
      else el.removeAttribute("style");
    }
    for (const a of Array.from(el.attributes)) {
      if (!["style", "href", "src", "alt", "start", "colspan", "rowspan"].includes(a.name)) el.removeAttribute(a.name);
    }
  });

  // Tiêu đề: bài chỉ dùng H2/H3 — H1 → H2, H4–H6 → H3
  body.querySelectorAll("h1, h4, h5, h6").forEach((h) => {
    const next = doc.createElement(h.tagName === "H1" ? "h2" : "h3");
    next.setAttribute("style", h.getAttribute("style") ?? "");
    while (h.firstChild) next.appendChild(h.firstChild);
    h.replaceWith(next);
  });

  return { html: body.innerHTML, droppedImages };
}
