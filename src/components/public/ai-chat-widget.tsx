"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  link?: { href: string; label: string };
}

/** Quy tắc trả lời giả lập AI (không gọi máy chủ) */
function botReply(input: string): ChatMessage {
  const q = input.toLowerCase();
  if (/(chào|hello|hi|xin chao)/.test(q))
    return { from: "bot", text: "Chào bạn! Mình là trợ lý ảo của Cổng Thanh niên Trường học. Bạn muốn tìm hiểu về tin tức, văn bản, bảng xếp hạng hay gửi phản ánh?" };
  if (/(nhiệm vụ|chỉ tiêu|deadline|hạn)/.test(q))
    return { from: "bot", text: "Nhiệm vụ thi đua được cấp trên giao kèm chỉ tiêu và hạn cuối. Đơn vị nhận nhiệm vụ sẽ thấy nhắc deadline D-7 và D-3 trong khu quản trị. Xem chi tiết trong khu quản trị mục 'Nhiệm vụ & chỉ tiêu'.", link: { href: "/dang-nhap", label: "Đăng nhập khu quản trị" } };
  if (/(xếp hạng|thi đua|điểm)/.test(q))
    return { from: "bot", text: "Bảng xếp hạng thi đua được chốt theo tháng/quý và công bố công khai, xếp theo tổng điểm bộ tiêu chí.", link: { href: "/bang-xep-hang", label: "Xem bảng xếp hạng" } };
  if (/(phản ánh|góp ý|khiếu nại|tra cứu)/.test(q))
    return { from: "bot", text: "Bạn có thể gửi phản ánh không cần đăng nhập. Sau khi gửi, hệ thống cấp mã tra cứu dạng PA-2026-XXXXX để theo dõi tiến độ xử lý.", link: { href: "/phan-anh", label: "Gửi phản ánh" } };
  if (/(văn bản|chỉ thị|nghị quyết|kế hoạch)/.test(q))
    return { from: "bot", text: "Kho văn bản gồm chỉ thị, kế hoạch, hướng dẫn do các cấp ban hành và công khai trên cổng.", link: { href: "/van-ban", label: "Xem văn bản" } };
  if (/(tài nguyên|biểu mẫu|tài liệu|tải)/.test(q))
    return { from: "bot", text: "Kho tài nguyên có tài liệu hướng dẫn, biểu mẫu và sản phẩm truyền thông, tải miễn phí.", link: { href: "/tai-nguyen", label: "Vào kho tài nguyên" } };
  if (/(tài khoản|đăng nhập|mật khẩu)/.test(q))
    return { from: "bot", text: "Mỗi đơn vị Đoàn có 1 tài khoản. Bản demo có 5 tài khoản mẫu: tw.admin, bd.province, hc.hiepthanh, thpt.chanhphu, btv.tw (mật khẩu demo123).", link: { href: "/dang-nhap", label: "Trang đăng nhập" } };
  if (/(tin|hoạt động|news)/.test(q))
    return { from: "bot", text: "Tin tức hoạt động từ các Đoàn trường, Đoàn phường được cập nhật liên tục.", link: { href: "/tin-tuc", label: "Xem tin tức" } };
  if (/(cảm ơn|thanks)/.test(q))
    return { from: "bot", text: "Rất vui được giúp bạn! Cần hỗ trợ thêm cứ nhắn mình nhé." };
  return { from: "bot", text: "Mình chưa hiểu rõ câu hỏi của bạn (đây là trợ lý giả lập bản demo). Bạn thử hỏi về: tin tức, nhiệm vụ thi đua, bảng xếp hạng, văn bản, phản ánh hoặc tài nguyên nhé!" };
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

  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, botReply(text)]);
    }, 700);
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
              <p className="text-[10px] text-white/70">Bản giả lập — demo không kết nối AI thật</p>
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
