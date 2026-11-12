"use client";

import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";
import { IMAGE_ALIGNS, IMAGE_WIDTHS, TEXT_ALIGNS, asPostDoc, type PostDoc } from "@/lib/editor/doc-utils";
import { legacyMarkdownToDoc } from "@/lib/editor/legacy-markdown";
import { isSafeFileUrl, isSafeLinkHref, youtubeVideoId } from "@/lib/safe-urls";

/**
 * Hiển thị nội dung bài viết — dùng chung cho trang chi tiết tin và khung xem trước ở trang đăng bài.
 * Bài mới: content_doc (tài liệu JSON của trình soạn thảo); bài cũ: content Markdown được chuyển
 * sang cùng dạng. Dựng thẳng thành phần React theo danh sách khối đã biết — không chèn HTML thô,
 * không cần thư viện soạn thảo (trang tin nhẹ); khối lạ bị bỏ qua, ảnh/link/video được kiểm lại.
 * Bọc ngoài bằng class "post-body" (globals.css) để giống hệt ô soạn thảo.
 */

/** Ảnh hiển thị được: tệp trên máy chủ, hoặc https (bài cũ còn ảnh link ngoài) */
const isRenderableImage = (src: unknown): src is string =>
  isSafeFileUrl(src) || (typeof src === "string" && /^https:\/\/[^\s"'<>]+$/.test(src));

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

const alignStyle = (node: PostDoc): CSSProperties | undefined => {
  const a = node.attrs?.textAlign;
  return a && a !== "left" && TEXT_ALIGNS.includes(a) ? { textAlign: a } : undefined;
};

const cellSpan = (v: unknown) => (Number.isInteger(v) && (v as number) > 1 && (v as number) <= 50 ? (v as number) : undefined);

const OpenImageContext = createContext<(src: string) => void>(() => {});

function Figure({ node }: { node: PostDoc }) {
  const open = useContext(OpenImageContext);
  const a = node.attrs ?? {};
  if (!isRenderableImage(a.src)) return null;
  const caption = typeof a.caption === "string" ? a.caption : "";
  const alt = typeof a.alt === "string" && a.alt ? a.alt : caption || "Hình ảnh bài viết";
  return (
    <figure data-width={pick(IMAGE_WIDTHS, a.width, "100")} data-align={pick(IMAGE_ALIGNS, a.align, "center")}>
      <button type="button" onClick={() => open(a.src)} className="block w-full cursor-zoom-in" aria-label={`Phóng to ảnh: ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.src} alt={alt} loading="lazy" />
      </button>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function renderText(node: PostDoc, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of [...(node.marks ?? [])].reverse()) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "link": {
        const href = mark.attrs?.href;
        if (!isSafeLinkHref(href)) break;
        out =
          href.startsWith("/") || href.startsWith("#") ? (
            <a href={href}>{out}</a>
          ) : (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {out}
            </a>
          );
        break;
      }
    }
  }
  return <span key={key}>{out}</span>;
}

function renderNode(node: PostDoc, key: number): ReactNode {
  const kids = () => (node.content ?? []).map(renderNode);
  switch (node.type) {
    case "doc":
      return <>{kids()}</>;
    case "text":
      return renderText(node, key);
    case "paragraph":
      return (
        <p key={key} style={alignStyle(node)}>
          {node.content?.length ? kids() : <br />}
        </p>
      );
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key} style={alignStyle(node)}>
          {kids()}
        </h3>
      ) : (
        <h2 key={key} style={alignStyle(node)}>
          {kids()}
        </h2>
      );
    case "bulletList":
      return <ul key={key}>{kids()}</ul>;
    case "orderedList": {
      const start = Number.isInteger(node.attrs?.start) ? node.attrs!.start : 1;
      return (
        <ol key={key} start={start !== 1 ? start : undefined}>
          {kids()}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{kids()}</li>;
    case "blockquote":
      return <blockquote key={key}>{kids()}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "figureImage":
      return <Figure key={key} node={node} />;
    case "youtube": {
      const id = youtubeVideoId(node.attrs?.src);
      return id ? (
        <div key={key} className="post-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title="Video YouTube"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null;
    }
    case "table":
      return (
        <div key={key} className="post-table">
          <table>
            <tbody>{kids()}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{kids()}</tr>;
    case "tableHeader":
    case "tableCell": {
      const Cell = node.type === "tableHeader" ? "th" : "td";
      return (
        <Cell
          key={key}
          colSpan={cellSpan(node.attrs?.colspan)}
          rowSpan={cellSpan(node.attrs?.rowspan)}
          style={TEXT_ALIGNS.includes(node.attrs?.align) ? { textAlign: node.attrs!.align } : undefined}
        >
          {kids()}
        </Cell>
      );
    }
    default:
      return null;
  }
}

function collectImages(doc: PostDoc): LightboxImage[] {
  const out: LightboxImage[] = [];
  const walk = (n: PostDoc) => {
    if (n.type === "figureImage" && isRenderableImage(n.attrs?.src)) {
      out.push({ url: n.attrs.src, name: String(n.attrs.caption || n.attrs.alt || "") });
    }
    n.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

export function PostContent({ doc, content }: { doc?: unknown; content?: string | null }) {
  const source = useMemo(() => asPostDoc(doc) ?? legacyMarkdownToDoc(content), [doc, content]);
  const images = useMemo(() => collectImages(source), [source]);
  const body = useMemo(() => renderNode(source, 0), [source]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const openImage = useMemo(
    () => (src: string) => {
      const i = images.findIndex((img) => img.url === src);
      if (i >= 0) setLightbox(i);
    },
    [images],
  );

  return (
    <OpenImageContext.Provider value={openImage}>
      <div className="post-body">{body}</div>
      <ImageLightbox images={images} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
    </OpenImageContext.Provider>
  );
}
