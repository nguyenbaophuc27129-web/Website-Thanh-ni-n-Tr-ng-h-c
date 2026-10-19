"use client";

import { useEffect } from "react";

/** Ngôn ngữ hỗ trợ (lưu cấu hình để mở lại khi hoàn thiện hệ thống i18n chuyên nghiệp) */
export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "en", label: "English", short: "EN" },
  { code: "zh-CN", label: "中文", short: "中" },
  { code: "ja", label: "日本語", short: "日" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "fr", label: "Français", short: "FR" },
] as const;

/**
 * Tạm thời tắt cơ chế dịch tự động của Google Translate theo yêu cầu của Thường trực
 * để tránh hiện tượng vỡ giao diện / vỡ font chữ tiếng Việt (THANHNIHALLONTRUhUhNGHỌC).
 * Component tự động dọn sạch cookie googtrans và các phần tử script Google Translate cũ.
 */
export function LanguageSwitcher({ tile = false }: { tile?: boolean }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Dọn sạch cookie googtrans cũ nếu người dùng đã bấm dịch trước đó
    const clearCookies = () => {
      const hostname = window.location.hostname;
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      if (hostname.includes(".")) {
        const rootDomain = "." + hostname.split(".").slice(-2).join(".");
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain};`;
      }
    };
    clearCookies();

    // Dọn script google translate nếu đang tồn tại
    const oldScript = document.getElementById("google-translate-script");
    if (oldScript) oldScript.remove();

    // Gỡ các class hoặc style do Google chèn vào body
    document.body.classList.remove("translated-ltr", "translated-rtl");
    if (document.body.style.top) document.body.style.top = "";
  }, []);

  return null;
}

/** Khung gadget ẩn của Google — trả null để không tạo DOM thừa */
export function GoogleTranslatePlaceholder() {
  return null;
}
