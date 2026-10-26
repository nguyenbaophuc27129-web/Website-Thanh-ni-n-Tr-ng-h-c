"use client";

import type { ComponentType, ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Globe,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  SquarePlay,
} from "lucide-react";
import { requestEditorAction } from "./slash-command";

type Icon = ComponentType<{ className?: string }>;

export function ToolButton({
  icon: IconCmp,
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  icon?: Icon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Giữ vùng chọn trong ô soạn thảo khi bấm nút
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
        active ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-slate-200"
      }`}
    >
      {IconCmp ? <IconCmp className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-300" aria-hidden />;

const ALIGNS = [
  { value: "left", label: "Canh trái", icon: AlignLeft, shortcut: "Ctrl+Shift+L" },
  { value: "center", label: "Canh giữa", icon: AlignCenter, shortcut: "Ctrl+Shift+E" },
  { value: "right", label: "Canh phải", icon: AlignRight, shortcut: "Ctrl+Shift+R" },
  { value: "justify", label: "Canh đều hai bên", icon: AlignJustify, shortcut: "Ctrl+Shift+J" },
] as const;

export function EditorToolbar({
  editor,
  pendingUploads,
  stickyTop = 0,
}: {
  editor: Editor;
  pendingUploads: number;
  /** Khoảng cách dính phía trên (px) — trang có thanh tiêu đề dính thì đặt bằng chiều cao thanh đó */
  stickyTop?: number;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      table: e.isActive("table"),
      align: (ALIGNS.find((a) => e.isActive({ textAlign: a.value }))?.value ?? "left") as string,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  return (
    <div className="sticky z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur" style={{ top: stickyTop }}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton icon={Undo2} label="Hoàn tác" shortcut="Ctrl+Z" disabled={!s.canUndo} onClick={() => c().undo().run()} />
        <ToolButton icon={Redo2} label="Làm lại" shortcut="Ctrl+Y" disabled={!s.canRedo} onClick={() => c().redo().run()} />
        <Sep />
        <select
          aria-label="Kiểu đoạn"
          value={s.block}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") c().setParagraph().run();
            else c().setHeading({ level: v === "h2" ? 2 : 3 }).run();
          }}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700 outline-none focus:border-blue-400"
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">Tiêu đề lớn</option>
          <option value="h3">Tiêu đề nhỏ</option>
        </select>
        <Sep />
        <ToolButton icon={Bold} label="In đậm" shortcut="Ctrl+B" active={s.bold} onClick={() => c().toggleBold().run()} />
        <ToolButton icon={Italic} label="In nghiêng" shortcut="Ctrl+I" active={s.italic} onClick={() => c().toggleItalic().run()} />
        <ToolButton icon={Underline} label="Gạch chân" shortcut="Ctrl+U" active={s.underline} onClick={() => c().toggleUnderline().run()} />
        <ToolButton icon={Strikethrough} label="Gạch ngang" shortcut="Ctrl+Shift+S" active={s.strike} onClick={() => c().toggleStrike().run()} />
        <Sep />
        {ALIGNS.map((a) => (
          <ToolButton
            key={a.value}
            icon={a.icon}
            label={a.label}
            shortcut={a.shortcut}
            active={s.align === a.value}
            onClick={() => c().setTextAlign(a.value).run()}
          />
        ))}
        <Sep />
        <ToolButton icon={List} label="Danh sách chấm" shortcut="Ctrl+Shift+8" active={s.bullet} onClick={() => c().toggleBulletList().run()} />
        <ToolButton icon={ListOrdered} label="Danh sách số" shortcut="Ctrl+Shift+7" active={s.ordered} onClick={() => c().toggleOrderedList().run()} />
        <ToolButton icon={Quote} label="Trích dẫn" shortcut="Ctrl+Shift+B" active={s.quote} onClick={() => c().toggleBlockquote().run()} />
        <Sep />
        <ToolButton icon={Link2} label="Chèn / sửa liên kết" shortcut="Ctrl+K" active={s.link} onClick={() => requestEditorAction(editor, "link")} />
        <ToolButton icon={ImagePlus} label="Chèn ảnh từ máy (chọn được nhiều ảnh)" onClick={() => requestEditorAction(editor, "image-upload")}>
          <span className="hidden sm:inline">Ảnh</span>
        </ToolButton>
        <ToolButton icon={Globe} label="Lấy ảnh từ đường link" onClick={() => requestEditorAction(editor, "image-url")} />
        <ToolButton icon={Table2} label="Chèn bảng" active={s.table} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <ToolButton icon={SquarePlay} label="Nhúng video YouTube" onClick={() => requestEditorAction(editor, "youtube")} />
        <ToolButton icon={Minus} label="Đường kẻ ngang" onClick={() => c().setHorizontalRule().run()} />
        <Sep />
        <ToolButton icon={RemoveFormatting} label="Xoá định dạng" onClick={() => c().unsetAllMarks().clearNodes().run()} />
        <span className="ml-auto pl-2 text-[11px]">
          {pendingUploads > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải {pendingUploads} ảnh lên máy chủ…
            </span>
          ) : null}
        </span>
      </div>
      {s.table ? (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-slate-200 px-2 py-1 text-[12px] text-slate-600">
          <span className="mr-1 font-semibold">Bảng:</span>
          <ToolButton icon={Rows3} label="Thêm hàng bên dưới" onClick={() => c().addRowAfter().run()}>+ hàng</ToolButton>
          <ToolButton icon={Columns3} label="Thêm cột bên phải" onClick={() => c().addColumnAfter().run()}>+ cột</ToolButton>
          <ToolButton icon={Rows3} label="Xoá hàng đang chọn" onClick={() => c().deleteRow().run()}>− hàng</ToolButton>
          <ToolButton icon={Columns3} label="Xoá cột đang chọn" onClick={() => c().deleteColumn().run()}>− cột</ToolButton>
          <ToolButton label="Bật/tắt hàng tiêu đề" onClick={() => c().toggleHeaderRow().run()}>Hàng tiêu đề</ToolButton>
          <ToolButton icon={Trash2} label="Xoá cả bảng" onClick={() => c().deleteTable().run()}>Xoá bảng</ToolButton>
        </div>
      ) : null}
    </div>
  );
}
