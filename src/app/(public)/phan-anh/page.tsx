"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy, SearchCheck, Send, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useToast } from "@/lib/toast-context";

const STEPS = [
  { icon: Send, title: "Gửi nội dung", desc: "Điền thông tin và nội dung phản ánh, không cần đăng nhập." },
  { icon: ShieldCheck, title: "Nhận mã tra cứu", desc: "Hệ thống cấp mã PA-2026-XXXXX kèm đường dẫn riêng." },
  { icon: Clock, title: "Chờ tiếp nhận", desc: "Cán bộ phụ trách sẽ phản hồi qua email và trên cổng." },
  { icon: CheckCircle2, title: "Theo dõi kết quả", desc: "Tra cứu bằng mã để xem tiến độ xử lý.", last: true },
];

export default function PhanAnhPage() {
  const { feedbackTopics, submitFeedback } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    senderName: "", senderEmail: "", senderPhone: "", senderOrgText: "",
    feedbackTopicId: String(feedbackTopics[0]?.id ?? 1),
    title: "", content: "",
  });
  const [agree, setAgree] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.senderName.trim() || !form.senderEmail.trim() || !form.title.trim() || !form.content.trim()) {
      toast("Vui lòng điền đầy đủ các trường bắt buộc.", "warning");
      return;
    }
    const code = submitFeedback({ ...form, feedbackTopicId: Number(form.feedbackTopicId) });
    toast(`Gửi phản ánh thành công! Mã tra cứu của bạn: ${code}`);
    router.push(`/phan-anh/${code}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif-display text-2xl font-bold text-stone-900">Góp ý — Phản ánh</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-stone-500">
          Kênh tiếp nhận ý kiến của đoàn viên, học sinh, phụ huynh về hoạt động phong trào, nhiệm vụ thi đua
          và hệ thống. Không cần tài khoản — sau khi gửi bạn nhận ngay mã tra cứu.
        </p>
      </div>

      {/* Steps */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={i} className="relative rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Bước {i + 1}</span>
            </div>
            <p className="mt-2.5 text-sm font-semibold text-stone-900">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Thông tin người gửi" subtitle="Dùng để nhận kết quả xử lý qua email." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" required>
                <Input value={form.senderName} onChange={set("senderName")} placeholder="Nguyễn Văn A" />
              </Field>
              <Field label="Email nhận kết quả" required>
                <Input type="email" value={form.senderEmail} onChange={set("senderEmail")} placeholder="email@example.com" />
              </Field>
              <Field label="Số điện thoại">
                <Input value={form.senderPhone} onChange={set("senderPhone")} placeholder="09xx xxx xxx" />
              </Field>
              <Field label="Trường / đơn vị">
                <Input value={form.senderOrgText} onChange={set("senderOrgText")} placeholder="VD: Đoàn Trường THPT Chánh Phú Hưng" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Nội dung phản ánh" subtitle="Mô tả rõ bối cảnh, đơn vị liên quan để được xử lý nhanh." />
            <CardBody className="space-y-4">
              <Field label="Lĩnh vực" required>
                <Select value={form.feedbackTopicId} onChange={set("feedbackTopicId")}>
                  {feedbackTopics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tiêu đề" required>
                <Input value={form.title} onChange={set("title")} placeholder="Tóm tắt nội dung phản ánh" />
              </Field>
              <Field label="Nội dung chi tiết" required hint="Tối thiểu 20 ký tự. Thông tin sai sự thật sẽ bị từ chối xử lý.">
                <Textarea value={form.content} onChange={set("content")} rows={6} placeholder="Nhập nội dung…" />
              </Field>
              <label className="flex items-start gap-2.5 text-xs text-stone-600">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-doan-600" />
                Tôi cam đoan nội dung phản ánh đúng sự thật và chịu trách nhiệm trước nội dung mình gửi.
              </label>
              <Button type="submit" size="lg" disabled={!agree} className="w-full sm:w-auto">
                <Send className="h-4 w-4" /> Gửi phản ánh
              </Button>
            </CardBody>
          </Card>
        </form>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Đã có mã tra cứu?" />
            <CardBody>
              <p className="text-xs leading-relaxed text-stone-500">
                Nhập mã dạng <code className="rounded bg-stone-100 px-1">PA-2026-XXXXX</code> để xem
                lịch sử trao đổi và trạng thái xử lý.
              </p>
              <Link href="/phan-anh/tra-cuu" className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-doan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-doan-700">
                <SearchCheck className="h-4 w-4" /> Tra cứu phản ánh
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Cam kết của Ban biên tập" />
            <CardBody className="space-y-2.5 text-xs leading-relaxed text-stone-600">
              <p className="flex items-start gap-2"><LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-doan-600" /> Tiếp nhận trong vòng 2 ngày làm việc.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-doan-600" /> Bảo mật thông tin người gửi, chỉ phục vụ xử lý.</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-doan-600" /> Phản hồi kết quả qua email đã đăng ký.</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
