/**
 * Hiển thị nội dung bài viết dạng Markdown rút gọn (H2/H3, ảnh, trích dẫn,
 * in đậm, liên kết). Dùng chung cho trang chi tiết tin và khung xem trước
 * ở trang đăng bài.
 */

function renderBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-stone-900">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBold(text.slice(lastIndex, match.index)));
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(renderBold(text.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : text;
}

function renderBlock(block: string, key: number): React.ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  // Heading 2
  if (trimmed.startsWith("## ")) {
    return (
      <h2
        key={key}
        className="mt-8 mb-3 border-l-4 border-doan-600 pl-3.5 font-serif-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl"
      >
        {trimmed.slice(3)}
      </h2>
    );
  }

  // Heading 3
  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={key} className="mt-6 mb-2.5 text-base font-bold text-stone-800 sm:text-lg">
        {trimmed.slice(4)}
      </h3>
    );
  }

  // Markdown Image: ![caption](url) + optional caption line — url ngoài hoặc ảnh lưu trên máy chủ (/uploads/...)
  const imgMatch = trimmed.match(/^!\[(.*?)\]\(((?:https?:\/\/|\/uploads\/)[^\s)]+)\)(?:\s*\n\*([\s\S]*?)\*)?$/);
  if (imgMatch) {
    const caption = imgMatch[3] || imgMatch[1];
    const url = imgMatch[2];
    return (
      <figure
        key={key}
        className="my-6 overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/60 shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || "Hình ảnh bài viết"}
          className="max-h-[540px] w-full object-cover"
        />
        {caption ? (
          <figcaption className="border-t border-stone-100 bg-stone-100/50 px-4 py-2.5 text-center text-xs italic text-stone-500">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  // Standalone italic caption
  if (/^\*[^*]+\*$/.test(trimmed)) {
    return (
      <p key={key} className="-mt-3 mb-5 text-center text-xs italic text-stone-500">
        {trimmed.slice(1, -1)}
      </p>
    );
  }

  // Blockquote: > text
  if (trimmed.startsWith("> ")) {
    return (
      <blockquote
        key={key}
        className="my-4 border-l-4 border-cyan-500 bg-cyan-50/50 px-4 py-3 text-sm italic text-stone-700"
      >
        {renderInline(trimmed.slice(2))}
      </blockquote>
    );
  }

  // Standard paragraph
  return (
    <p key={key} className="leading-relaxed text-stone-700">
      {renderInline(trimmed)}
    </p>
  );
}

export function PostContent({ content }: { content: string }) {
  return <>{content.split("\n\n").map((para, i) => renderBlock(para, i))}</>;
}
