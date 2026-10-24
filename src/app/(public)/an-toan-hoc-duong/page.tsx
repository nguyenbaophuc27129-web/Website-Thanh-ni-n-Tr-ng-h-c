"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  PhoneCall, Siren, ShieldCheck, HeartPulse, Scale, Lock, ArrowRight,
  Fingerprint, MessageSquareWarning, Wifi, Home, BookOpenCheck, Newspaper,
} from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { useStore } from "@/lib/store-context";

/** Quy tắc an toàn + nhận diện — nội dung truyền thông giáo dục cho học sinh */
const SIGNALS = [
  {
    icon: Fingerprint,
    title: "Bạo lực học đường",
    tone: "bg-rose-50/70 text-rose-600 ring-rose-100",
    signs: "Đánh, đẩy, giật phá đồ dùng; chửi bới, đặt biệt danh xấu; ép làm việc không muốn; cô lập, xa lánh ác ý.",
    act: "Giữ bình tĩnh, rời nơi nguy hiểm → lưu minh chứng → nói với người lớn tin cậy hoặc gửi tại mục này.",
  },
  {
    icon: Wifi,
    title: "Bạo lực trên mạng",
    tone: "bg-indigo-50/70 text-indigo-600 ring-indigo-100",
    signs: "Bình luận miệt thị, đăng ảnh không xin phép, lập nhóm nói xấu, đe dọa qua tin nhắn, tung tin bịa đặt.",
    act: "Chụp màn hình làm bằng chứng, không đáp trả, chặn — báo cáo tài khoản và chia sẻ với thầy cô, gia đình.",
  },
  {
    icon: ShieldCheck,
    title: "Xâm hại trẻ em",
    tone: "bg-amber-50/70 text-amber-600 ring-amber-100",
    signs: "Ai chạm vào cơ thể khiến bạn khó chịu; ai bắt giữ bí mật khiến bạn sợ; bị bỏ bê, bạo hành tại nhà.",
    act: "Cơ thể bạn thuộc về bạn. Kể ra không bao giờ là lỗi của bạn — gọi 111 hoặc gửi bảo mật tại mục này.",
  },
  {
    icon: Home,
    title: "Bạo hành gia đình",
    tone: "bg-teal-50/70 text-teal-600 ring-teal-100",
    signs: "Bị đánh đập, mắng chửi thường xuyên trong gia đình; chứng kiến người thân bị hại; bị bỏ mặc chăm sóc.",
    act: "Bạn không phải chịu đựng một mình. Gọi 111 khi an toàn, hoặc gửi về đây để chuyên gia tìm cách bảo vệ bạn.",
  },
];

const STEPS = [
  { n: 1, title: "Gửi nội dung", desc: "Tại trang Phản ánh, chọn lĩnh vực “Bảo vệ an toàn”. Bạn hoàn toàn an tâm vì thông tin luôn được bảo vệ nghiêm ngặt." },
  { n: 2, title: "Chuyển chuyên gia trong 24h", desc: "Nội dung bỏ qua luồng hành chính, chuyển thẳng tới chuyên gia tâm lý hoặc pháp lý theo tính chất vụ việc." },
  { n: 3, title: "Được liên hệ an toàn", desc: "Chuyên gia chủ động liên hệ qua kênh bạn chọn. Bạn giữ mã tra cứu để theo dõi toàn bộ quá trình." },
];

export default function AnToanHocDuongPage() {
  const { publishedPosts } = useStore();

  const posts = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.status === "PUBLISHED" && p.categoryNames.includes("An toàn học đường"))
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [publishedPosts]
  );

  return (
    <div>
      {/* ===== Hero ấm — nhắn gửi thay vì cảnh báo ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3b0d2a] via-[#4c1130] to-[#1e1b4b] text-white">
        <span className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-28 left-1/5 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <Lock className="h-3.5 w-3.5" /> Hỗ trợ bảo mật — miễn phí
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Bạn không đơn độc — chúng tôi luôn sẵn sàng lắng nghe
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-rose-100/90 sm:text-base">
            Nếu bạn hoặc bạn bè đang gặp bạo lực học đường, bạo lực trên mạng, bạo hành hay xâm hại —
            hãy nói ra. Đội ngũ chuyên gia tâm lý và pháp lý của Cổng Thanh niên Trường học đồng hành
            bảo mật, không phán xét, kể cả khi bạn chưa sẵn sàng cho ai biết mình là ai.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/phan-anh?topic=8"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-700 shadow-lg transition-all hover:-translate-y-0.5"
            >
              <MessageSquareWarning className="h-4 w-4" /> Gửi hỗ trợ bảo mật
            </Link>
            <a
              href="tel:111"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur transition-all hover:bg-white/20"
            >
              <PhoneCall className="h-4 w-4" /> Gọi 111 — miễn phí 24/7
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-10">
        {/* ===== Hotline khẩn cấp ===== */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: PhoneCall,
              tel: "111",
              title: "Tổng đài Quốc gia bảo vệ trẻ em",
              desc: "Miễn phí, hoạt động 24/7 — tiếp nhận tư vấn, báo hiệu về bạo lực, xâm hại, bạo hành trẻ em.",
              cls: "from-emerald-500 to-teal-600",
            },
            {
              icon: Siren,
              tel: "113",
              title: "Công an — ứng cứu khẩn cấp",
              desc: "Gọi ngay khi có nguy hiểm trực tiếp tới tính mạng, sức khỏe hoặc bạn đang bị giữ, bị đe dọa.",
              cls: "from-rose-500 to-red-600",
            },
          ].map((h, i) => (
            <Reveal key={h.tel} delay={i * 80}>
              <a
                href={`tel:${h.tel}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:ring-rose-200"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${h.cls} text-white`}>
                  <h.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight text-slate-900">{h.tel}</span>
                    <span className="text-xs font-semibold text-slate-500">{h.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{h.desc}</p>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400">
          Tổng đài 111 có những lúc rất bận — kênh chuyên gia bên dưới là điểm tựa bổ sung (không thay thế 111):
          gửi hôm nay, được chuyển chuyên gia trong 24 giờ làm việc.
        </p>

        {/* ===== Tham vấn viên tâm lý & pháp lý ===== */}
        <div className="mt-10">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <HeartPulse className="h-5 w-5 text-rose-500" /> Chuyên gia đồng hành
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: HeartPulse,
                title: "Tham vấn viên tâm lý",
                grad: "from-rose-500 to-pink-500",
                items: [
                  "Lắng nghe, xoa dịu sang chấn tâm lý lúc cấp",
                  "Tư vấn khủng hoảng cho học sinh và cả phụ huynh",
                  "Đồng hành dài hạn tới khi ổn định trở lại",
                ],
              },
              {
                icon: Scale,
                title: "Chuyên gia pháp lý",
                grad: "from-indigo-500 to-blue-600",
                items: [
                  "Giải thích quyền được bảo vệ theo pháp luật",
                  "Hướng dẫn trình báo và lưu giữ chứng cứ đúng cách",
                  "Kết nối trợ giúp pháp lý cho vụ việc nghiêm trọng",
                ],
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad} text-white`}>
                      <c.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {c.items.map((t) => (
                      <li key={t} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Quy trình 3 bước */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    {s.n}
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-900">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50/70 px-5 py-4 ring-1 ring-emerald-100">
            <Lock className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="flex-1 text-xs leading-relaxed text-emerald-800">
              <b>Cam kết bảo mật:</b> thông tin chỉ chuyên gia tiếp cận; danh tính của bạn chỉ được dùng để
              liên hệ khi chính bạn đồng ý. Kể về điều đau lòng không bao giờ là lỗi của bạn.
            </p>
            <Link
              href="/phan-anh?topic=8"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              Gửi ngay <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ===== Nhận biết dấu hiệu ===== */}
        <div className="mt-10">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpenCheck className="h-5 w-5 text-indigo-500" /> Nhận biết dấu hiệu — bạn cần biết
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SIGNALS.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <div className="flex h-full gap-4 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-200">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${s.tone}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500"><b className="text-slate-700">Dấu hiệu: </b>{s.signs}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600"><b className="text-slate-700">Việc cần làm: </b>{s.act}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ===== Tin tức về an toàn ===== */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <Newspaper className="h-5 w-5 text-blue-600" /> Tin tức — kiến thức an toàn
            </h2>
            <Link href="/tin-tuc" className="text-xs font-semibold text-blue-600 hover:underline">
              Xem tất cả tin tức →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {posts.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500 md:col-span-3">
                Chuyên mục tin tức về an toàn học đường đang được cập nhật.
              </p>
            ) : (
              posts.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <Link
                    href={`/tin-tuc/${p.slug}`}
                    className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:ring-rose-200"
                  >
                    <h3 className="text-sm font-bold leading-snug text-stone-900">{p.title}</h3>
                    <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-stone-500">{p.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      Đọc tiếp <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </Reveal>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
