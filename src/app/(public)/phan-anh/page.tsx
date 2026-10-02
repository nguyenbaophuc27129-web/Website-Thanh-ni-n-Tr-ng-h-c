"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LifeBuoy, SearchCheck, Send, ShieldCheck, Clock, CheckCircle2, Paperclip, X } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Send, title: "Gửi nội dung", desc: "Điền thông tin, không cần đăng nhập" },
  { icon: ShieldCheck, title: "Nhận mã tra cứu", desc: "Cấp mã PA-2026-XXXXX ngay" },
  { icon: Clock, title: "Chờ tiếp nhận", desc: "Phản hồi qua email và trên cổng" },
  { icon: CheckCircle2, title: "Theo dõi kết quả", desc: "Tra cứu mã để xem tiến độ" },
];

/* Input "mượt như lụa": nền xám cực nhạt không viền → focus nền trắng + viền xanh + glow ring */
const SOFT_INPUT =
  "h-auto rounded-xl border border-transparent bg-slate-100/50 px-4 py-2.5 text-sm " +
  "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function PhanAnhPage() {
  const { feedbackTopics, submitFeedback } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    senderName: "", senderEmail: "", senderPhone: "", senderOrgText: "",
    senderCommuneUnion: "", senderProvinceUnion: "",
    feedbackTopicId: String(feedbackTopics[0]?.id ?? 1),
    title: "", content: "",
  });
  const [evidence, setEvidence] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agree, setAgree] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addEvidence = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEvidence((prev) => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        if (next.length >= 5) {
          toast("Tối đa 5 tệp minh chứng cho mỗi phản ánh.", "warning");
          break;
        }
        if (!next.includes(file.name)) next.push(file.name);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.senderName.trim() || !form.senderEmail.trim() || !form.title.trim() || !form.content.trim()) {
      toast("Vui lòng điền đầy đủ các trường bắt buộc.", "warning");
      return;
    }
    const code = submitFeedback({
      ...form,
      feedbackTopicId: Number(form.feedbackTopicId),
      evidenceNames: evidence.length > 0 ? evidence : undefined,
    });
    toast(`Gửi phản ánh thành công! Mã tra cứu của bạn: ${code}`);
    router.push(`/phan-anh/${code}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== Header ===== */}
      <div>
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Góp ý — Phản ánh</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Kênh tiếp nhận ý kiến của đoàn viên, học sinh, phụ huynh về hoạt động phong trào, nhiệm vụ thi đua
          và hệ thống. Không cần tài khoản — sau khi gửi bạn nhận ngay mã tra cứu.
        </p>
      </div>

      {/* ===== Connected Tracker — vòng tròn nối vạch, bước active phát sáng ===== */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-10 overflow-x-auto rounded-3xl bg-white px-6 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200 sm:px-10"
      >
        <div className="flex min-w-[640px] items-start lg:min-w-0">
          {STEPS.map((s, i) => (
            <div key={s.title} className="contents">
              <div className="flex w-28 shrink-0 flex-col items-center text-center">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-all",
                    i === 0
                      ? "bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.5)] ring-4 ring-blue-500/20"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  <s.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <p className={cn("mt-2.5 text-xs font-semibold", i === 0 ? "text-slate-900" : "text-slate-400")}>
                  Bước {i + 1} · {s.title}
                </p>
                <p className="mt-0.5 hidden text-[11px] font-light leading-relaxed text-slate-400 lg:block">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mt-5 h-0.5 flex-1 rounded-full",
                    i === 0 ? "bg-gradient-to-r from-blue-500 to-slate-200" : "bg-slate-200"
                  )}
                />
              ) : null}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* ===== Form — card trắng tinh khiết viền mỏng ===== */}
        <motion.form
          onSubmit={handleSubmit}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="space-y-5 lg:col-span-2"
        >
          <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 className="text-base font-bold text-slate-900">Thông tin người gửi</h2>
              <p className="mt-1 text-xs font-light leading-relaxed text-slate-400">
                Việc cung cấp thông tin cá nhân được thực hiện theo quy định tại khoản 1, khoản 2 Điều 8 Luật Khiếu nại
                hiện hành; Điều 22 và khoản 1 Điều 23 Luật Tố cáo hiện hành. Mọi thông tin được bảo mật, chỉ dùng để
                liên hệ và trả kết quả giải quyết.
              </p>
            </div>
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
              <Field label="Họ và tên" required>
                <Input value={form.senderName} onChange={set("senderName")} placeholder="Nguyễn Văn A" className={SOFT_INPUT} />
              </Field>
              <Field label="Email nhận kết quả" required>
                <Input type="email" value={form.senderEmail} onChange={set("senderEmail")} placeholder="email@example.com" className={SOFT_INPUT} />
              </Field>
              <Field label="Số điện thoại">
                <Input value={form.senderPhone} onChange={set("senderPhone")} placeholder="09xx xxx xxx" className={SOFT_INPUT} />
              </Field>
              <Field label="Trường / đơn vị">
                <Input value={form.senderOrgText} onChange={set("senderOrgText")} placeholder="VD: Đoàn Trường THPT Chánh Phú Hưng" className={SOFT_INPUT} />
              </Field>
              <Field label="Đoàn xã, phường, đặc khu và tương đương" hint="Xã, phường, đặc khu nơi trường bạn đang học đặt cơ sở, hoặc tên Đại học/Trường Đại học nếu trường bạn trực thuộc.">
                <Input value={form.senderCommuneUnion} onChange={set("senderCommuneUnion")} placeholder="VD: Đoàn Phường Hiệp Thành" className={SOFT_INPUT} />
              </Field>
              <Field label="Đoàn cấp tỉnh/thành phố">
                <Input value={form.senderProvinceUnion} onChange={set("senderProvinceUnion")} placeholder="VD: Tỉnh Đoàn Bình Dương" className={SOFT_INPUT} />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 className="text-base font-bold text-slate-900">Nội dung phản ánh</h2>
              <p className="mt-1 text-xs font-light text-slate-400">Mô tả rõ bối cảnh, đơn vị liên quan để được xử lý nhanh.</p>
            </div>
            <div className="space-y-4 px-6 py-6 sm:px-8">
              <Field label="Lĩnh vực" required>
                <Select value={form.feedbackTopicId} onChange={set("feedbackTopicId")} className={SOFT_INPUT}>
                  {feedbackTopics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tiêu đề" required>
                <Input value={form.title} onChange={set("title")} placeholder="Tóm tắt nội dung phản ánh" className={SOFT_INPUT} />
              </Field>
              <Field label="Nội dung chi tiết" required hint="Tối thiểu 20 ký tự. Thông tin sai sự thật sẽ bị từ chối xử lý.">
                <Textarea value={form.content} onChange={set("content")} rows={6} placeholder="Nhập nội dung…" className={cn(SOFT_INPUT, "min-h-32")} />
              </Field>
              <Field label="Đính kèm minh chứng" hint="Ảnh chụp màn hình, văn bản… Tối đa 5 tệp.">
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addEvidence(e.target.files)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100/70 px-4 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> Thêm minh chứng
                  </button>
                  {evidence.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-[11px] font-medium text-slate-600">
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          <span className="max-w-52 truncate">{name}</span>
                          <button
                            type="button"
                            onClick={() => setEvidence((prev) => prev.filter((n) => n !== name))}
                            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            aria-label={`Xóa ${name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>
              <label className="flex items-start gap-2.5 text-xs text-slate-500">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-blue-600" />
                Tôi cam đoan nội dung phản ánh đúng sự thật và chịu trách nhiệm trước nội dung mình gửi.
              </label>
              <button
                type="submit"
                disabled={!agree}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:shadow-none sm:w-auto"
              >
                <Send className="h-4 w-4" /> Gửi phản ánh
              </button>
            </div>
          </div>
        </motion.form>

        {/* ===== Sidebar — Widget Card độc lập ===== */}
        <motion.aside
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="space-y-5"
        >
          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50/60 text-blue-600 ring-1 ring-blue-100">
              <SearchCheck className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-base font-bold text-slate-900">Đã có mã tra cứu?</h2>
            <p className="mt-1.5 text-xs font-light leading-relaxed text-slate-500">
              Nhập mã dạng <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-600">PA-2026-XXXXX</code> để xem
              lịch sử trao đổi và trạng thái xử lý.
            </p>
            <Link
              href="/phan-anh/tra-cuu"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
            >
              <SearchCheck className="h-4 w-4" /> Tra cứu phản ánh
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Cam kết của Ban biên tập</h2>
            <div className="mt-4 space-y-3.5 text-xs font-light leading-relaxed text-slate-500">
              {[
                { icon: LifeBuoy, tint: "bg-blue-50/60 text-blue-600 ring-blue-100", text: "Tiếp nhận trong vòng 2 ngày làm việc." },
                { icon: ShieldCheck, tint: "bg-emerald-50/60 text-emerald-600 ring-emerald-100", text: "Bảo mật thông tin người gửi, chỉ phục vụ xử lý." },
                { icon: CheckCircle2, tint: "bg-violet-50/60 text-violet-600 ring-violet-100", text: "Phản hồi kết quả qua email đã đăng ký." },
              ].map((c) => (
                <p key={c.text} className="flex items-start gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1", c.tint)}>
                    <c.icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  {c.text}
                </p>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
