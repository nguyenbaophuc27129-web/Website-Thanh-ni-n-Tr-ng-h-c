"use client";

import { useEffect, useRef, useState } from "react";
import { Extension, type JSONContent } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { EditorContent, ReactNodeViewRenderer, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import FileHandler from "@tiptap/extension-file-handler";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Link2, Strikethrough, Trash2, Type, Underline } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { FigureImage, postExtensions } from "@/lib/editor/schema";
import { IMAGE_WIDTHS, asPostDoc, docToPlainText, emptyDoc, type PostDoc } from "@/lib/editor/doc-utils";
import { legacyMarkdownToDoc } from "@/lib/editor/legacy-markdown";
import { cleanPastedHtml } from "@/lib/editor/word-paste";
import { isSafeLinkHref, youtubeVideoId } from "@/lib/safe-urls";
import type { UploadKind } from "@/lib/upload-client";
import { EditorToolbar, ToolButton } from "./editor-toolbar";
import { FigureImageView } from "./figure-image-view";
import { ImageUploader, uploaderOf } from "./image-uploads";
import { EDITOR_ACTION_EVENT, EDITOR_NOTICE_EVENT, SlashCommand, requestEditorAction, type EditorAction } from "./slash-command";

/**
 * Trình soạn thảo bài viết (Tiptap) — dùng chung cho trang đăng bài và các hộp thoại ở trang
 * xuất bản. Nội dung là tài liệu JSON theo lược đồ src/lib/editor/schema.ts; ô soạn thảo dùng
 * cùng class "post-body" với trang tin nên hiện đúng như bài đăng.
 * Không dùng trực tiếp — import RichEditor từ "./index" (tải động, chỉ chạy trên trình duyệt).
 */

export interface RichEditorProps {
  /** Nội dung ban đầu — chỉ đọc khi tạo ô soạn thảo và mỗi khi resetKey đổi */
  initialDoc: PostDoc | null;
  /** Đổi giá trị (vd. id bài) để nạp lại initialDoc — nội dung nhập từ link, mở bài khác… */
  resetKey?: string | number;
  onChange: (doc: PostDoc) => void;
  /** Số ảnh đang tải lên máy chủ — >0 thì trang nên khoá nút lưu */
  onPendingUploadsChange?: (n: number) => void;
  placeholder?: string;
  /** Chiều cao tối thiểu vùng soạn (px) */
  minHeight?: number;
  /** Thanh công cụ dính cách mép trên bao nhiêu px (trang có thanh tiêu đề dính) */
  stickyTop?: number;
  uploadKind?: UploadKind;
}

/** Nội dung hợp lệ để nạp vào ô soạn thảo; tài liệu lỗi → giữ lại phần chữ */
function loadableDoc(doc: PostDoc | null): JSONContent {
  return asPostDoc(doc) ?? emptyDoc();
}

const normalizeHref = (raw: string) => {
  const v = raw.trim();
  return /^www\./i.test(v) ? `https://${v}` : v;
};

export default function RichEditor({
  initialDoc,
  resetKey,
  onChange,
  onPendingUploadsChange,
  placeholder = "Viết hoặc dán nội dung bài viết… Gõ / để chèn nhanh tiêu đề, ảnh, bảng, video.",
  minHeight = 360,
  stickyTop = 0,
  uploadKind = "bai-viet",
}: RichEditorProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Giữ onChange mới nhất cho trình nghe "update" đăng ký một lần
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...postExtensions().map((ext) =>
        ext.name === FigureImage.name ? FigureImage.extend({ addNodeView: () => ReactNodeViewRenderer(FigureImageView) }) : ext,
      ),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      SlashCommand,
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        consumePasteEvent: true,
        onPaste: (ed, files, html) => {
          // Có kèm HTML (dán từ web/Word) thì để luồng dán HTML xử lý, ảnh trong đó được lấy về sau
          if (html) return;
          uploaderOf(ed)?.insertFiles(files);
        },
        onDrop: (ed, files, pos) => uploaderOf(ed)?.insertFiles(files, pos),
      }),
      Extension.create({
        name: "linkShortcut",
        addKeyboardShortcuts() {
          return { "Mod-k": () => (requestEditorAction(this.editor, "link"), true) };
        },
      }),
    ],
    content: loadableDoc(initialDoc),
    editorProps: {
      attributes: {
        class: "post-body tnth-editor px-4 py-4 outline-none sm:px-6",
        style: `min-height:${minHeight}px`,
        "aria-label": "Nội dung bài viết",
        spellcheck: "false",
      },
      // Dán vào dòng trống: đoạn đầu tiên giữ canh lề/kiểu của chính nó thay vì nhập vào dòng trống
      transformPasted: (slice, view) =>
        slice.openStart > 0 && view.state.selection.empty && view.state.selection.$from.parent.content.size === 0
          ? new Slice(slice.content, 0, slice.openEnd)
          : slice,
      transformPastedHTML: (html, view) => {
        const { html: clean, droppedImages } = cleanPastedHtml(html);
        if (droppedImages > 0) {
          view?.dom.dispatchEvent(
            new CustomEvent(EDITOR_NOTICE_EVENT, {
              detail: `${droppedImages} ảnh dán từ Word không đọc được — hãy chèn lại ảnh bằng nút "Ảnh" hoặc kéo thả tệp ảnh.`,
            }),
          );
        }
        return clean;
      },
    },
  });

  // Bộ tải ảnh + theo dõi thay đổi: báo nội dung mới cho trang, ảnh link ngoài/dán kèm → lấy về máy chủ
  useEffect(() => {
    if (!editor) return;
    const uploader = new ImageUploader(editor, {
      kind: uploadKind,
      onPendingChange: setPending,
      onError: (msg) => toast(msg, "warning"),
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleLocalize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => uploader.localizeAll(), 300);
    };
    const onUpdate = () => {
      onChangeRef.current(editor.getJSON());
      scheduleLocalize();
    };
    const onNotice = (ev: Event) => toast(String((ev as CustomEvent<string>).detail), "warning");
    editor.on("update", onUpdate);
    editor.view.dom.addEventListener(EDITOR_NOTICE_EVENT, onNotice);
    scheduleLocalize();
    return () => {
      if (timer) clearTimeout(timer);
      editor.off("update", onUpdate);
      editor.view.dom.removeEventListener(EDITOR_NOTICE_EVENT, onNotice);
      uploader.dispose();
    };
  }, [editor, uploadKind, toast]);

  useEffect(() => onPendingUploadsChange?.(pending), [pending, onPendingUploadsChange]);

  // Nạp lại nội dung khi đổi bài / nhập bài từ link (không nạp lại theo mỗi lần gõ)
  const loadedKey = useRef(resetKey);
  useEffect(() => {
    if (!editor || loadedKey.current === resetKey) return;
    loadedKey.current = resetKey;
    try {
      editor.commands.setContent(loadableDoc(initialDoc), { emitUpdate: false });
    } catch {
      editor.commands.setContent(legacyMarkdownToDoc(docToPlainText(asPostDoc(initialDoc))), { emitUpdate: false });
    }
    uploaderOf(editor)?.localizeAll();
  }, [editor, resetKey, initialDoc]);

  // Hành động cần hộp thoại — chung cho thanh công cụ, menu "/" và phím tắt
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handler = (ev: Event) => {
      const action = (ev as CustomEvent<EditorAction>).detail;
      if (action === "image-upload") fileInputRef.current?.click();
      else if (action === "image-url") {
        const url = window.prompt("Dán đường dẫn ảnh (https://…) — máy chủ sẽ tải ảnh về lưu trữ riêng:", "https://")?.trim();
        if (!url || url === "https://") return;
        if (!/^https?:\/\/\S+$/i.test(url)) return toast("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://", "warning");
        uploaderOf(editor)?.insertFromUrl(url);
      } else if (action === "youtube") {
        const url = window.prompt("Dán link video YouTube (youtube.com/watch?v=… hoặc youtu.be/…):", "")?.trim();
        if (!url) return;
        if (!youtubeVideoId(url)) return toast("Link YouTube không hợp lệ.", "warning");
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      } else if (action === "link") {
        const current = editor.getAttributes("link").href as string | undefined;
        const input = window.prompt("Địa chỉ liên kết (để trống để bỏ liên kết):", current ?? "https://");
        if (input === null) return;
        const href = normalizeHref(input);
        if (!href || href === "https://") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        if (!isSafeLinkHref(href)) return toast("Liên kết phải là http(s)://, mailto: hoặc đường dẫn bắt đầu bằng /", "warning");
        if (editor.state.selection.empty && !current) {
          const label = window.prompt("Chữ hiển thị cho liên kết:", href)?.trim() || href;
          editor.chain().focus().insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href } }] }).run();
        } else {
          editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }
      }
    };
    dom.addEventListener(EDITOR_ACTION_EVENT, handler);
    return () => dom.removeEventListener(EDITOR_ACTION_EVENT, handler);
  }, [editor, toast]);

  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? { words: e.storage.characterCount.words(), chars: e.storage.characterCount.characters() } : { words: 0, chars: 0 },
  });

  if (!editor) {
    return <div className="animate-pulse rounded-xl border border-slate-200 bg-slate-50" style={{ height: minHeight + 48 }} />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <EditorToolbar editor={editor} pendingUploads={pending} stickyTop={stickyTop} />
      <ImageBubble editor={editor} stickyTop={stickyTop} />
      <TextBubble editor={editor} />
      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (editor) uploaderOf(editor)?.insertFiles(files);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <span>Gõ / để chèn nhanh · Dán từ Word, Google Docs giữ định dạng · Kéo thả hoặc dán ảnh trực tiếp</span>
        <span>
          Số từ: <strong className="text-slate-700">{stats?.words ?? 0}</strong> · Ký tự:{" "}
          <strong className="text-slate-700">{stats?.chars ?? 0}</strong>
        </span>
      </div>
    </div>
  );
}

/** Thanh nổi khi chọn ảnh: độ rộng, vị trí, mô tả (alt), xoá */
function ImageBubble({ editor, stickyTop }: { editor: Editor; stickyTop: number }) {
  const img = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const a = e.getAttributes("figureImage");
      return { width: String(a.width ?? ""), align: String(a.align ?? ""), alt: String(a.alt ?? "") };
    },
  });
  const set = (attrs: Record<string, string>) => editor.chain().focus().updateAttributes("figureImage", attrs).run();
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageMenu"
      shouldShow={({ editor: e }) => e.isActive("figureImage")}
      // Ảnh dài hơn màn hình: thanh vẫn trượt vào vùng nhìn thấy, ngay dưới thanh công cụ dính
      options={{ placement: "top", flip: true, shift: { crossAxis: true, padding: { top: stickyTop + 100, bottom: 8 } } }}
      className="flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
    >
      <span className="px-1.5 text-[11px] font-semibold text-slate-500">Rộng</span>
      {IMAGE_WIDTHS.map((w) => (
        <ToolButton key={w} label={`Rộng ${w}%`} active={img.width === w} onClick={() => set({ width: w })}>
          {w}%
        </ToolButton>
      ))}
      <span className="mx-0.5 h-5 w-px bg-slate-200" />
      <ToolButton icon={AlignLeft} label="Ảnh sát trái" active={img.align === "left"} onClick={() => set({ align: "left" })} />
      <ToolButton icon={AlignCenter} label="Ảnh ở giữa" active={img.align === "center"} onClick={() => set({ align: "center" })} />
      <ToolButton icon={AlignRight} label="Ảnh sát phải" active={img.align === "right"} onClick={() => set({ align: "right" })} />
      <span className="mx-0.5 h-5 w-px bg-slate-200" />
      <ToolButton
        icon={Type}
        label="Mô tả ảnh cho người khiếm thị / Google (alt)"
        onClick={() => {
          const alt = window.prompt("Mô tả ngắn nội dung ảnh (giúp người khiếm thị và Google hiểu ảnh):", img.alt);
          if (alt !== null) set({ alt: alt.trim().slice(0, 500) });
        }}
      >
        Mô tả
      </ToolButton>
      <ToolButton icon={Trash2} label="Xoá ảnh" onClick={() => editor.chain().focus().deleteSelection().run()} />
    </BubbleMenu>
  );
}

/** Thanh nổi khi bôi đen chữ: đậm, nghiêng, gạch chân, gạch ngang, liên kết */
function TextBubble({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textMenu"
      shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive("figureImage") && !e.isActive("youtube")}
      className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
    >
      <ToolButton icon={Bold} label="In đậm" shortcut="Ctrl+B" active={s.bold} onClick={() => c().toggleBold().run()} />
      <ToolButton icon={Italic} label="In nghiêng" shortcut="Ctrl+I" active={s.italic} onClick={() => c().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Gạch chân" shortcut="Ctrl+U" active={s.underline} onClick={() => c().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Gạch ngang" active={s.strike} onClick={() => c().toggleStrike().run()} />
      <ToolButton icon={Link2} label="Liên kết" shortcut="Ctrl+K" active={s.link} onClick={() => requestEditorAction(editor, "link")} />
    </BubbleMenu>
  );
}
