"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ngôn ngữ dịch — Việt (mặc định) + 5 thứ tiếng theo yêu cầu */
export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "en", label: "English", short: "EN" },
  { code: "zh-CN", label: "中文", short: "中" },
  { code: "ja", label: "日本語", short: "日" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "fr", label: "Français", short: "FR" },
] as const;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: Record<string, unknown>,
          element: string
        ) => unknown;
      };
    };
  }
}

/** Đọc ngôn ngữ đã chọn từ cookie googtrans (/vi/en …) */
function readLangFromCookie(): string {
  if (typeof document === "undefined") return "vi";
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/vi\/([a-zA-Z-]+)/);
  return m ? m[1] : "vi";
}

/**
 * Chức năng dịch toàn trang sang 5 thứ tiếng (Anh · Trung · Nhật · Nga · Pháp).
 * Cơ chế: đặt cookie `googtrans` rồi TẢI LẠI TRANG — Google Translate Element khởi
 * tạo cùng cookie nên tự dịch toàn bộ nội dung ngay khi mở; sau khi tải xong vẫn
 * chủ động áp qua combo ẩn một vòng nữa để chắc chắn.
 * Nốt nhạc: div #google_translate_element được render MỘT LẦN ở SiteHeader (ngoài
 * các bản thể của switcher) để không đụng trùng id.
 */
export function LanguageSwitcher({ tile = false }: { tile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string>("vi");
  const rootRef = useRef<HTMLDivElement>(null);

  /* Nạp script Google Translate Element đúng 1 lần + khôi phục lựa chọn từ cookie */
  useEffect(() => {
    const saved = readLangFromCookie();
    setLang(saved);

    const inject = () => {
      if (document.getElementById("google-translate-script")) return;
      window.googleTranslateElementInit = () => {
        if (!window.google?.translate) return;
        /* KHÔNG truyền layout: bản element.js mới đã bỏ InlineLayout — truyền vào là văng lỗi,
           widget không tạo được combo → cả trang không bao giờ dịch (lỗi thực tế đã bắt được) */
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "vi",
            includedLanguages: "vi,en,zh-CN,ja,ru,fr",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      };
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    };
    inject();

    /* Đã chọn ngôn ngữ khác Việt → chắc chắn dịch được sau khi script + combo sẵn sàng */
    if (saved !== "vi") {
      const tryApply = (left: number) => {
        const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (combo) {
          if (combo.value !== saved) {
            combo.value = saved;
            combo.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (left > 0) {
          window.setTimeout(() => tryApply(left - 1), 400);
        }
      };
      tryApply(25);
    }
  }, []);

  /* Đóng dropdown khi bấm ra ngoài */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (code: string) => {
    setLang(code);
    setOpen(false);
    /* Cookie là "nguồn sự thật" — Google Element đọc cookie này khi khởi tạo và tự dịch toàn trang */
    if (code === "vi") {
      document.cookie = "googtrans=;path=/;max-age=0";
    } else {
      document.cookie = `googtrans=/vi/${code};path=/;max-age=31536000`;
    }
    /* Tải lại để bản dịch áp trọn vẹn từ đầu (menu, nội dung, cả trang mới điều hướng tới) */
    window.setTimeout(() => window.location.reload(), 250);
  };

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={rootRef} className="relative">
      {tile ? (
        /* Bản thể ô vuông cho menu mobile */
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-white/70 bg-white/70 px-2 py-2.5 text-center text-[10.5px] font-medium text-slate-600 transition-colors hover:text-cyan-700"
        >
          <Globe className="h-4 w-4 text-cyan-600" strokeWidth={1.75} />
          Ngôn ngữ · {current.short}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          title="Chọn ngôn ngữ đọc — English, 中文, 日本語, Русский, Français"
          className="flex items-center gap-1 rounded-full p-2 text-slate-400 transition-colors hover:bg-cyan-50 hover:text-cyan-600"
        >
          <Globe className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-[11px] font-bold">{current.short}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      )}

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_14px_44px_rgb(15,23,42,0.14)]">
          <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Đọc bằng ngôn ngữ
          </p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className={cn(
                "flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] font-medium transition-colors",
                l.code === lang ? "text-cyan-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500">
                  {l.short}
                </span>
                {l.label}
              </span>
              {l.code === lang ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
          <p className="px-3.5 pb-2 pt-1.5 text-[9.5px] leading-relaxed text-slate-400">
            Dịch tự động Google Translate — đổi ngôn ngữ sẽ tải lại trang.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Khung gadget ẩn của Google — render MỘT LẦN tại SiteHeader */
export function GoogleTranslatePlaceholder() {
  return <div id="google_translate_element" className="hidden" aria-hidden="true" />;
}
