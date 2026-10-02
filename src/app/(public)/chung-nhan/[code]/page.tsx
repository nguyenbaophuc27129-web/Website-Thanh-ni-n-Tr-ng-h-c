"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, SearchCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import QRCode from "react-qr-code";
import { useStore } from "@/lib/store-context";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/public/empty-state";

const CERT_TYPE_LABELS: Record<string, string> = {
  HOAT_DONG: "Chứng nhận hoạt động",
  DANH_HIEU: "Danh hiệu thi đua",
  KHOA_HOC: "Chứng nhận nghiên cứu khoa học",
  KHAC: "Chứng nhận",
};

export default function ChungNhanChiTietPage() {
  const params = useParams<{ code: string }>();
  const { certificates, orgName } = useStore();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const cert = useMemo(
    () => certificates.find((c) => c.code.toLowerCase() === params.code.toLowerCase()),
    [certificates, params.code]
  );

  if (!cert) {
    return (
      <div className="min-h-[70vh] bg-stone-950 py-16">
        <div className="mx-auto max-w-2xl px-4">
          <EmptyState message={`Không tìm thấy chứng nhận với mã ${params.code}.`} icon={SearchCheck} />
          <div className="mt-4 text-center">
            <Link href="/chung-nhan/tra-cuu" className="text-sm font-medium text-vang-300 hover:underline">
              Thử mã khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const revoked = cert.status === "REVOKED";

  return (
    <div className="min-h-[70vh] bg-stone-950 py-10">
      <div className="mx-auto max-w-3xl px-4">
        {/* Thanh thao tác */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/chung-nhan/tra-cuu"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-vang-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Tra cứu mã khác
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                revoked ? "bg-red-500/15 text-red-300 ring-1 ring-red-400/40" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40"
              }`}
            >
              {revoked ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {revoked ? "Đã thu hồi" : "Còn hiệu lực"}
            </span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-vang-300 to-vang-400 px-4 py-2 text-xs font-bold text-stone-950 shadow-[0_0_24px_rgba(255,205,41,0.3)] transition hover:brightness-110"
            >
              <Printer className="h-3.5 w-3.5" /> In chứng nhận
            </button>
          </div>
        </div>

        {/* Tấm chứng nhận */}
        <div className="print-area cert-paper relative mt-6 overflow-hidden rounded-md bg-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]">
          <div className={`border-2 p-1.5 ${revoked ? "border-red-700" : "border-vang-500"}`}>
            <div className={`relative border px-6 py-10 sm:px-12 ${revoked ? "border-red-400" : "border-vang-600/60"}`}>
              {/* Ngôi sao 4 góc */}
              {["left-2 top-2", "right-2 top-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos) => (
                <span key={pos} className={`absolute ${pos} text-lg leading-none ${revoked ? "text-red-400/60" : "text-vang-500/70"}`}>
                  ★
                </span>
              ))}

              {/* Con dấu */}
              <div className="flex justify-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md ring-4 ${
                    revoked ? "bg-gradient-to-br from-red-200 via-red-300 to-red-500 ring-red-200/50" : "bg-gradient-to-br from-vang-200 via-vang-300 to-vang-500 ring-vang-200/50"
                  }`}
                >
                  <span className="text-3xl leading-none text-doan-800">★</span>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                Cổng Thanh niên Trường học — Đoàn TNCS Hồ Chí Minh
              </p>
              <h1
                className={`mt-2 text-center font-serif-display text-2xl font-black uppercase tracking-wide sm:text-3xl ${
                  revoked ? "text-red-700" : "cert-gold-text"
                }`}
              >
                {CERT_TYPE_LABELS[cert.certType] ?? "Chứng nhận"}
              </h1>
              <p className="mt-1 text-center font-mono text-xs font-bold tracking-wider text-stone-500">{cert.code}</p>

              <div className="mt-7 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Trao chứng nhận cho</p>
                <p className="mt-2 font-serif-display text-2xl font-black text-stone-900 sm:text-4xl">
                  {cert.recipientName}
                </p>
                <div className="mx-auto mt-2.5 h-1 w-28 rounded-full bg-gradient-to-r from-transparent via-vang-400 to-transparent" />
                {cert.recipientOrgText ? (
                  <p className="mt-2 text-sm text-stone-500">{cert.recipientOrgText}</p>
                ) : null}
              </div>

              <p className="mx-auto mt-6 max-w-xl text-center text-sm italic leading-relaxed text-stone-700">
                {cert.title}
              </p>

              <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
                <div className="space-y-1.5 text-xs text-stone-500">
                  <p>
                    Cấp lúc: <b className="text-stone-800">{formatDate(cert.issuedAt)}</b>
                  </p>
                  <p>
                    Đơn vị cấp: <b className="text-stone-800">{orgName(cert.issuedByOrgUnitId)}</b>
                  </p>
                  {cert.activityId ? (
                    <p>
                      Hoạt động: <b className="text-stone-800">#{cert.activityId}</b>
                    </p>
                  ) : null}
                </div>
                <div className="text-center">
                  <div className={`inline-block rounded-lg border-2 p-1.5 ${revoked ? "border-red-400" : "border-vang-400"} bg-white`}>
                    {origin ? <QRCode value={`${origin}/chung-nhan/${cert.code}`} size={96} /> : <div className="h-24 w-24" />}
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-stone-400">Quét mã kiểm tra chứng nhận</p>
                </div>
              </div>

              {/* Dấu water-mark thu hồi */}
              {revoked ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="-rotate-[24deg] rounded-lg border-4 border-red-600/60 px-8 py-3 font-serif-display text-5xl font-black uppercase tracking-widest text-red-600/50 sm:text-6xl">
                    Đã thu hồi
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Kết quả xác thực */}
        <div
          className={`no-print mt-6 flex items-start gap-3 rounded-xl border p-4 ${
            revoked ? "border-red-400/30 bg-red-500/10" : "border-emerald-400/30 bg-emerald-500/10"
          }`}
        >
          {revoked ? (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          ) : (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          )}
          <div>
            <p className={`text-sm font-bold ${revoked ? "text-red-200" : "text-emerald-200"}`}>
              {revoked ? "Chứng nhận ĐÃ THU HỒI — nội dung không còn giá trị" : "Xác thực thành công — chứng nhận khớp cơ sở dữ liệu trung ương"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Mã {cert.code} · Kiểm tra lúc {formatDate(new Date().toISOString())} · Kết quả duy nhất, không thể làm giả trên đường dẫn chính thức.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
