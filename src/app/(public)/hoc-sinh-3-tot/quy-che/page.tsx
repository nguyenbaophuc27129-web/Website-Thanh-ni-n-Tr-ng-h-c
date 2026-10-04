import Link from "next/link";
import {
  GraduationCap, Scale, ArrowLeft, FileBadge, ScrollText, PenLine, BadgeCheck, CalendarDays,
} from "lucide-react";
import {
  QUY_CHE_META, QUY_CHE_CHUONGS, THONG_BAO_DIEU_CHINH, DIEU_CHINH_2025, DIEU_5_NOTE,
} from "@/data/quy-che-hs3t";

/**
 * Toàn văn Quy chế danh hiệu "Học sinh 3 tốt" (QĐ 317-QĐ/TWĐTN-TNTH)
 * + điều chỉnh Thông báo 630-TB/TWĐTN-CTTTN (10/10/2025).
 * Static server component — không cần "use client".
 */
export default function QuyCheHs3tPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/hoc-sinh-3-tot"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition hover:text-emerald-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Về hồ sơ Học sinh 3 tốt
      </Link>

      {/* ===== Header văn bản ===== */}
      <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 px-6 py-8 text-center text-white sm:px-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-50">
            <Scale className="h-3.5 w-3.5" /> Văn bản chuẩn Trung ương
          </p>
          <h1 className="mt-3 font-serif-display text-2xl font-bold leading-snug sm:text-3xl">
            QUY CHẾ DANH HIỆU “HỌC SINH 3 TỐT”
          </h1>
          <p className="mt-1 text-sm font-semibold text-emerald-100">Giai đoạn {QUY_CHE_META.giaiDoan}</p>
          <p className="mt-3 text-xs leading-relaxed text-emerald-100/90">
            Ban hành kèm theo Quyết định số {QUY_CHE_META.quyetDinh} ngày {QUY_CHE_META.ngayQuyetDinh}
            <br className="hidden sm:block" /> của {QUY_CHE_META.coQuan}
          </p>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          {[
            { icon: BadgeCheck, label: "Đơn vị thường trực", value: QUY_CHE_META.thuongTruc },
            { icon: FileBadge, label: "Điều chỉnh mới nhất", value: `Thông báo ${THONG_BAO_DIEU_CHINH.so} · ${THONG_BAO_DIEU_CHINH.ngay}` },
            { icon: CalendarDays, label: "Thời gian tính thành tích", value: "01/9 năm trước → 31/8 năm xét trao" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white px-5 py-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                <Icon className="h-3.5 w-3.5 text-emerald-500" /> {label}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-stone-700">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Điều 5 — callout tiêu chuẩn đơn vị ===== */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
          <PenLine className="h-4 w-4" /> Điều 5 — Đơn vị tự điều chỉnh tiêu chuẩn theo thực tiễn
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-amber-900/90">{DIEU_5_NOTE}</p>
      </div>

      {/* ===== Điều chỉnh 2025 ===== */}
      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200">
        <div className="border-b border-slate-100 bg-sky-50/60 px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm font-bold text-sky-800">
            <ScrollText className="h-4 w-4" /> Điều chỉnh theo Thông báo {THONG_BAO_DIEU_CHINH.so} ({THONG_BAO_DIEU_CHINH.ngay})
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-sky-700/80">{THONG_BAO_DIEU_CHINH.trichYeu}</p>
        </div>
        <div className="divide-y divide-slate-100">
          {DIEU_CHINH_2025.map((d, i) => (
            <div key={i} className="grid gap-1.5 px-5 py-3.5 sm:grid-cols-[88px_1fr_1fr] sm:gap-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600">{d.nhom}</p>
              <p className="text-[11px] leading-relaxed text-stone-400 line-through decoration-stone-300">{d.cu}</p>
              <p className="text-[11px] font-medium leading-relaxed text-stone-700">{d.moi}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Toàn văn quy chế ===== */}
      <div className="mt-8 space-y-8">
        {QUY_CHE_CHUONGS.map((chuong) => (
          <section key={chuong.name}>
            <div className="flex items-center gap-3">
              <h2 className="font-serif-display text-lg font-bold text-emerald-800">{chuong.name}</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600">{chuong.title}</span>
            </div>
            <div className="mt-4 space-y-5">
              {chuong.dieu.map((dieu) => (
                <article
                  key={dieu.so}
                  className={`rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 sm:p-6 ${
                    dieu.adjusted ? "ring-2 ring-amber-300" : "ring-slate-100"
                  }`}
                >
                  <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-900">
                    <span className={dieu.adjusted ? "text-amber-700" : "text-emerald-700"}>{dieu.so}</span>
                    {dieu.title}
                    {dieu.adjusted ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Cơ sở tự điều chỉnh
                      </span>
                    ) : null}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {dieu.content.map((block, bi) => (
                      <div key={bi}>
                        {block.heading ? (
                          <p className="text-[13px] font-bold text-stone-800">{block.heading}</p>
                        ) : null}
                        {block.paragraphs?.map((p, pi) => (
                          <p key={pi} className={`leading-relaxed text-stone-700 ${block.heading || block.items ? "mt-1.5 text-[13px]" : "text-[13px]"}`}>
                            {p}
                          </p>
                        ))}
                        {block.items ? (
                          <ul className="mt-1.5 space-y-1.5">
                            {block.items.map((item, ii) => (
                              <li key={ii} className="flex gap-2 text-[13px] leading-relaxed text-stone-700">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {block.notes ? (
                          <ul className="mt-1.5 space-y-1.5">
                            {block.notes.map((note, ni) => (
                              <li key={ni} className="flex gap-2 text-[13px] leading-relaxed text-stone-600">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                                {note}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ===== CTA mở hồ sơ ===== */}
      <div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Sẵn sàng nộp minh chứng theo đúng quy chế?</p>
            <p className="mt-0.5 text-xs text-emerald-100">
              Mở hồ sơ 3 tốt, cập nhật thành tích theo 12 tiêu chí phụ chuẩn Trung ương và theo dõi tiến độ xét danh hiệu.
            </p>
          </div>
          <Link
            href="/hoc-sinh-3-tot"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-md transition hover:bg-emerald-50"
          >
            Mở hồ sơ 3 tốt
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-stone-400">
        Toàn văn theo Quyết định số {QUY_CHE_META.quyetDinh} ({QUY_CHE_META.ngayQuyetDinh}) — đã hợp nhất điều chỉnh
        Thông báo {THONG_BAO_DIEU_CHINH.so} ({THONG_BAO_DIEU_CHINH.ngay}). Bản demo trình bày phục vụ xét chọn trên Cổng TNTH.
      </p>
    </div>
  );
}
