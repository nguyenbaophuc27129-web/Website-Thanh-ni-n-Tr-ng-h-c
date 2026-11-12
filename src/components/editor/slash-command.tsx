"use client";

import { forwardRef, useEffect, useImperativeHandle, useState, type ComponentType } from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import {
  Heading2,
  Heading3,
  ImagePlus,
  Globe,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table2,
  SquarePlay,
} from "lucide-react";

/**
 * Gõ "/" để chèn nhanh khối nội dung (cho người soạn quen bàn phím). Các mục cần hộp thoại
 * (ảnh, YouTube) phát sự kiện EDITOR_ACTION_EVENT để rich-editor.tsx xử lý giống nút trên thanh công cụ.
 */

export const EDITOR_ACTION_EVENT = "tnth-editor-action";
export type EditorAction = "image-upload" | "image-url" | "youtube" | "link";

export const requestEditorAction = (editor: Editor, action: EditorAction) =>
  editor.view.dom.dispatchEvent(new CustomEvent<EditorAction>(EDITOR_ACTION_EVENT, { detail: action }));

/** Thông báo từ bên trong trình soạn thảo (vd. ảnh dán từ Word không đọc được) — rich-editor.tsx hiện toast */
export const EDITOR_NOTICE_EVENT = "tnth-editor-notice";

interface SlashItem {
  title: string;
  hint: string;
  keywords: string;
  icon: ComponentType<{ className?: string }>;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: SlashItem[] = [
  { title: "Đoạn văn", hint: "Chữ thường", keywords: "doan van p text", icon: Pilcrow, run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { title: "Tiêu đề lớn", hint: "Tiêu đề mục (H2)", keywords: "tieu de lon h2 heading", icon: Heading2, run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { title: "Tiêu đề nhỏ", hint: "Tiêu đề phụ (H3)", keywords: "tieu de nho h3 heading", icon: Heading3, run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { title: "Danh sách chấm", hint: "Gạch đầu dòng", keywords: "danh sach cham bullet list", icon: List, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: "Danh sách số", hint: "1, 2, 3…", keywords: "danh sach so ordered list", icon: ListOrdered, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: "Trích dẫn", hint: "Khối trích dẫn", keywords: "trich dan quote", icon: Quote, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { title: "Ảnh từ máy", hint: "Tải ảnh lên", keywords: "anh hinh image upload", icon: ImagePlus, run: (e, r) => { e.chain().focus().deleteRange(r).run(); requestEditorAction(e, "image-upload"); } },
  { title: "Ảnh từ link", hint: "Lấy ảnh từ đường dẫn", keywords: "anh link url image", icon: Globe, run: (e, r) => { e.chain().focus().deleteRange(r).run(); requestEditorAction(e, "image-url"); } },
  { title: "Bảng", hint: "Bảng 3 × 3", keywords: "bang table", icon: Table2, run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Video YouTube", hint: "Nhúng clip", keywords: "video youtube clip", icon: SquarePlay, run: (e, r) => { e.chain().focus().deleteRange(r).run(); requestEditorAction(e, "youtube"); } },
  { title: "Đường kẻ", hint: "Ngăn cách đoạn", keywords: "duong ke hr ngang", icon: Minus, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
];

/** Bỏ dấu tiếng Việt để gõ "tieu de" hay "tiêu đề" đều tìm được */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

interface MenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SlashMenu = forwardRef<MenuHandle, SuggestionProps<SlashItem>>(function SlashMenu({ items, command }, ref) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        command(items[active]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return null;
  return (
    <div role="listbox" aria-label="Chèn nhanh" className="max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseEnter={() => setActive(i)}
          onClick={() => command(item)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${i === active ? "bg-blue-50 text-blue-800" : "text-slate-700"}`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{item.title}</span>
            <span className="block text-[11px] text-slate-400">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        items: ({ query }) => {
          const q = fold(query);
          return ITEMS.filter((it) => !q || fold(it.title).includes(q) || it.keywords.includes(q)).slice(0, 11);
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<MenuHandle, SuggestionProps<SlashItem>> | null = null;
          const place = (rect: DOMRect | null | undefined) => {
            const el = renderer?.element as HTMLElement | undefined;
            if (!el || !rect) return;
            const below = rect.bottom + 6;
            const tooLow = below + 320 > window.innerHeight;
            el.style.position = "fixed";
            el.style.zIndex = "60";
            el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 272))}px`;
            el.style.top = tooLow ? "" : `${below}px`;
            el.style.bottom = tooLow ? `${window.innerHeight - rect.top + 6}px` : "";
          };
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenu, { props, editor: props.editor });
              document.body.appendChild(renderer.element);
              place(props.clientRect?.());
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              place(props.clientRect?.());
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                renderer?.destroy();
                renderer?.element.remove();
                renderer = null;
                return true;
              }
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              renderer?.destroy();
              renderer?.element.remove();
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
