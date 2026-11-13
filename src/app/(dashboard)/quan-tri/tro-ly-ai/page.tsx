"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, FileDown, Send, Sparkles, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { downloadDraftWordDoc } from "@/lib/word-export";

interface ChatMessage {
  from: "user" | "bot";
  text: string;
  model?: string;
}

const SUGGESTIONS = [
  "Soạn báo cáo tháng của đơn vị",
  "Soạn công văn mời phối hợp tổ chức hoạt động",
  "Viết kế hoạch hoạt động tháng 11",
  "Hỏi quy chế Học sinh 3 tốt",
];

function renderBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <strong key={match.index} className="font-semibold text-stone-900">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(renderBold(text.slice(lastIndex, match.index)));
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target={match[2].startsWith("/") ? undefined : "_blank"}
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(renderBold(text.slice(lastIndex)));
  return parts.length > 0 ? parts : text;
}

export default function TroLyAiPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text:
        "Xin chào! Tôi là Trợ lý AI dành cho cán bộ Đoàn. Tôi có thể soạn báo cáo - kế hoạch, biên tập văn bản và tra cứu các văn bản TW đã ban hành trong mục Văn bản. Bạn cần hỗ trợ gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question || typing) return;
    const history = messages
      .filter((m) => m.text)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/ai/tro-ly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: history.slice(0, -1), question }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reply?: string; model?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.reply) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setMessages((m) => [...m, { from: "bot", text: data.reply!, model: data.model }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text:
            err instanceof Error && err.message
              ? `Không trả lời được: ${err.message}`
              : "Không gọi được Trợ lý AI — kiểm tra kết nối rồi thử lại.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const busy = typing;

  /** Xuất bản nháp AI thành Word thể thức chuẩn (TNR 14, lề 2-2-3-2, khối quốc hiệu) — bám 2 mẫu gốc */
  const exportWord = (text: string) => {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    downloadDraftWordDoc(`van-ban-tro-ly-AI-${stamp}`, {
      draft: text,
      orgUnitName: (session?.orgUnitName ?? "ĐOÀN CƠ SỞ").toUpperCase(),
    });
  };

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-100 bg-gradient-to-r from-doan-700 to-doan-600 px-5 py-3.5 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
          <Bot className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif-display text-base font-bold">Trợ lý AI cán bộ</p>
          <p className="text-[11px] text-white/80">
            Soạn văn bản, báo cáo, kế hoạch · tra cứu văn bản TW đã ban hành trong mục Văn bản
          </p>
        </div>
        <button
          onClick={() =>
            setMessages([
              {
                from: "bot",
                text: "Đã mở hội thoại mới. Bạn cần tôi hỗ trợ nội dung gì?",
              },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition-colors hover:bg-white/15"
          title="Xoá hội thoại (chỉ xoá trên trang này, không lưu DB)"
        >
          <Trash2 className="h-3.5 w-3.5" /> Hội thoại mới
        </button>
      </div>

      {/* Messages */}
      <div ref={bodyRef} className="thin-scrollbar flex-1 space-y-4 overflow-y-auto bg-stone-50 px-4 py-4 sm:px-6">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.from === "user" ? "justify-end" : "justify-start")}>
            {m.from === "bot" ? (
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-doan-600 text-white">
                <Bot className="h-4 w-4" />
              </span>
            ) : null}
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                m.from === "user"
                  ? "rounded-br-sm bg-doan-600 text-white"
                  : "rounded-bl-sm border border-stone-200 bg-white text-stone-700"
              )}
            >
              {renderInline(m.text)}
              {m.from === "bot" && m.text.length > 200 && !m.text.startsWith("Không") ? (
                <button
                  onClick={() => exportWord(m.text)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-doan-200 bg-doan-50 px-2.5 py-1 text-[11px] font-semibold text-doan-700 transition-colors hover:bg-doan-100"
                  title="Tải bản soạn về dạng Word (.doc) đúng thể thức văn bản: khối quốc hiệu, TNR 14, lề 2-2-3-2 cm"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Xuất Word (thể thức chuẩn)
                </button>
              ) : null}
              {m.from === "bot" && m.model ? (
                <span className="mt-1.5 block font-mono text-[9px] text-stone-300">{m.model}</span>
              ) : null}
            </div>
            {m.from === "user" ? (
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-500">
                <User className="h-4 w-4" />
              </span>
            ) : null}
          </div>
        ))}
        {typing ? (
          <div className="flex gap-2.5">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-doan-600 text-white">
              <Bot className="h-4 w-4" />
            </span>
            <div className="rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-4 py-3">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Suggestions */}
      <div className="border-t border-stone-100 bg-white px-4 pt-2.5 sm:px-6">
        <div className="flex flex-wrap gap-1.5 pb-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full bg-doan-50 px-2.5 py-1 text-[11px] font-medium text-doan-700 ring-1 ring-doan-100 transition-colors hover:bg-doan-100 disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-stone-100 bg-white p-3 sm:px-6">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Nhập câu hỏi hoặc yêu cầu soạn văn bản… (Enter gửi, Shift+Enter xuống dòng)"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-stone-300 px-3.5 py-2.5 text-[13px] focus:border-doan-500 focus:outline-none focus:ring-2 focus:ring-doan-100"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-doan-600 text-white transition-colors hover:bg-doan-700 disabled:opacity-40"
            aria-label="Gửi"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-stone-400">
          Nội dung hội thoại chỉ hiển thị trong phiên làm việc này, không lưu trên hệ thống.
        </p>
      </div>
    </div>
  );
}
