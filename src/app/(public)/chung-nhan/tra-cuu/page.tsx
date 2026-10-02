"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine, ShieldCheck, Printer, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { CountUp } from "@/components/public/reveal";

const DEMO_CODES = ["CRT-2026-00301", "CRT-2026-00302", "CRT-2026-00303"];

const FEATURES = [
  {
    icon: ScanLine,
    title: "Quét mã QR trên giấy",
    desc: "Mở camera điện thoại, quét mã ở góc chứng nhận — hệ thống mở ngay trang xác thực của chính chứng nhận đó.",
  },
  {
    icon: ShieldCheck,
    title: "Kiểm tra hiệu lực",
    desc: "Mỗi tra cứu đối chiếu trực tiếp cơ sở dữ liệu trung ương: kết quả duy nhất là Còn hiệu lực hoặc Đã thu hồi.",
  },
  {
    icon: Printer,
    title: "In & lưu giữ",
    desc: "Xuất giấy chứng nhận khổ A4 từ chính trang xác thực để lưu hồ sơ, dán sinh hoạt Đoàn hoặc khung tưởng niệm.",
  },
];

export default function TraCuuChungNhanPage() {
  const { certificates } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) {
      toast("Nhập mã chứng nhận in trên giấy hoặc dưới mã QR.", "warning");
      return;
    }
    const found = certificates.find((c) => c.code.toLowerCase() === v.toLowerCase());
    if (!found) {
      toast(`Không tìm thấy chứng nhận với mã "${v}".`, "warning");
      return;
    }
    setBusy(true);
    router.push(`/chung-nhan/${found.code}`);
  };

  return (
    <div className="cert-hero-bg text-white">
      {/* Hero tra cứu */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-vang-300/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-vang-300/40 bg-vang-300/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-vang-200">
            <Sparkles className="h-3.5 w-3.5" /> Hệ thống chứng nhận số · Đoàn TNCS Hồ Chí Minh
          </span>
          <h1 className="mt-6 font-serif-display text-4xl font-black leading-tight sm:text-5xl">
            <span className="cert-gold-text">Chứng nhận số</span>
          </h1>
          <p className="mt-2 font-serif-display text-sm font-semibold uppercase tracking-[0.3em] text-white/70 sm:text-base">
            Trung ương Đoàn — Cổng Thanh niên Trường học
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Mỗi thành tích của tuổi trẻ trường học được bảo chứng bằng một mã số duy nhất.
            Nhập mã hoặc quét QR — xác thực trong tích tắc, mọi lúc mọi nơi.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(code);
            }}
            className="mx-auto mt-9 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã chứng nhận · CRT-2026-XXXXX"
              spellCheck={false}
              className="h-14 flex-1 rounded-xl border border-white/20 bg-white/10 px-5 font-mono text-sm tracking-wider text-white placeholder:text-white/40 backdrop-blur outline-none transition-colors focus:border-vang-300/70 focus:bg-white/15"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vang-300 to-vang-400 px-7 text-sm font-bold text-stone-950 shadow-[0_0_36px_rgba(255,205,41,0.35)] transition-all hover:brightness-110 disabled:opacity-60"
            >
              Tra cứu ngay <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-white/50">Thử ngay:</span>
            {DEMO_CODES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCode(c);
                  submit(c);
                }}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[11px] text-vang-200 transition-colors hover:border-vang-300/60 hover:bg-vang-300/10"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Số liệu */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/10">
            {[
              { value: 12486, suffix: "", label: "Chứng nhận đã cấp" },
              { value: 12481, suffix: "", label: "Đang hiệu lực" },
              { value: 1, suffix: " giây", label: "Thời gian xác thực" },
            ].map((s) => (
              <div key={s.label} className="px-2">
                <p className="font-serif-display text-2xl font-black text-vang-300 sm:text-3xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[11px] text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tính năng */}
      <section className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-vang-300/40 hover:bg-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-vang-300/25 to-vang-500/10 text-vang-300 ring-1 ring-vang-300/30">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif-display text-base font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/65">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="pb-10 text-center text-[11px] text-white/40">
          Hệ thống vận hành bởi Ban Thanh niên Trường học — Trung ương Đoàn · Mọi chứng nhận phát hành qua Cổng Thanh niên Trường học
        </p>
      </section>
    </div>
  );
}
