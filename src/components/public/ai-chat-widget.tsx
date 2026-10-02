"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ruleReply } from "@/lib/ai-chat";

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  link?: { href: string; label: string };
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Xin chào! Mình là trợ lý ảo (bản giả lập demo) của Cổng Thanh niên Trường học. Bạn cần hỗ trợ gì?" },
  ]);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);
    const started = Date.now();
    let reply: ChatMessage;
    try {
      // Gọi API trợ lý ảo — mặc định là quy tắc từ khoá trên máy chủ,
      // nối AI thật bằng cách sửa 1 hàm trong src/app/api/ai/chat/route.ts
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reply?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.reply) throw new Error(data?.error ?? `HTTP ${res.status}`);
      // API có thể trả đường dẫn "/..." gắn cuối câu → tách thành nút bấm
      const linkMatch = data.reply.match(/(?:^|\s)(\/[a-z0-9\-/]+)\s*\.?\s*$/i);
      reply = linkMatch
        ? { from: "bot", text: data.reply.replace(linkMatch[1], "").trim(), link: { href: linkMatch[1], label: "Mở trang liên quan" } }
        : { from: "bot", text: data.reply };
    } catch {
      // API không gọi được → fallback quy tắc cục bộ để chat không gãy
      reply = { from: "bot", ...ruleReply(text) };
    }
    // Giữ cảm giác "đang gõ" tối thiểu 600ms (AI thật sẽ chậm hơn sẵn)
    const elapsed = Date.now() - started;
    if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
    setTyping(false);
    setMessages((m) => [...m, reply]);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-doan-600 text-white shadow-xl transition-transform hover:scale-105"
        style={{ height: 52, width: 52 }}
        aria-label="Trợ lý ảo"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open ? (
        <div className="fixed bottom-22 right-5 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl" style={{ bottom: 88 }}>
          <div className="hero-star-bg flex items-center gap-2.5 px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vang-300 text-doan-800">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Trợ lý ảo TNTH</p>
              <p className="text-[10px] text-white/70">Trợ lý demo — nối AI thật tại /api/ai/chat</p>
            </div>
          </div>

          <div ref={bodyRef} className="thin-scrollbar flex-1 space-y-2.5 overflow-y-auto bg-stone-50 p-3.5">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed",
                    m.from === "user"
                      ? "rounded-br-sm bg-doan-600 text-white"
                      : "rounded-bl-sm border border-stone-200 bg-white text-stone-700"
                  )}
                >
                  {m.text}
                  {m.link ? (
                    <Link
                      href={m.link.href}
                      onClick={() => setOpen(false)}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-doan-50 px-2 py-1 text-[11px] font-medium text-doan-700 hover:bg-doan-100"
                    >
                      {m.link.label} →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-3.5 py-2">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-stone-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Nhập câu hỏi của bạn…"
              className="h-9 flex-1 rounded-lg border border-stone-300 px-3 text-xs focus:border-doan-500 focus:outline-none focus:ring-2 focus:ring-doan-100"
            />
            <button
              onClick={send}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-doan-600 text-white hover:bg-doan-700"
              aria-label="Gửi"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
