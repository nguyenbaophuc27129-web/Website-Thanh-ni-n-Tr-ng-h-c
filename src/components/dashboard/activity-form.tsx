"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useStore, type ActivityInput } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Activity } from "@/types";
import { todayISO } from "@/lib/utils";

const PLATFORMS = ["FACEBOOK", "WEBSITE", "ZALO", "TIKTOK", "YOUTUBE", "PRESS", "OTHER"] as const;
type Platform = (typeof PLATFORMS)[number];

export function ActivityForm({ activity }: { activity?: Activity }) {
  const { contentCategories, createActivity, updateActivity, submitActivity } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    title: activity?.title ?? "",
    summary: activity?.summary ?? "",
    startDate: activity?.startDate ?? todayISO(),
    endDate: activity?.endDate ?? todayISO(),
    location: activity?.location ?? "",
    participantCount: activity?.participantCount?.toString() ?? "",
    categoryIds: activity?.categoryIds.map(String) ?? [],
  });
  const [links, setLinks] = useState<{ platform: Platform; url: string; note: string }[]>(
    activity?.links.map((l) => ({ platform: l.platform, url: l.url, note: l.note ?? "" })) ?? []
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleCategory = (id: number) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(String(id))
        ? f.categoryIds.filter((c) => c !== String(id))
        : [...f.categoryIds, String(id)],
    }));
  };

  const buildInput = (): ActivityInput => ({
    title: form.title.trim(),
    summary: form.summary.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    location: form.location.trim() || undefined,
    participantCount: form.participantCount ? Number(form.participantCount) : undefined,
    categoryIds: form.categoryIds.map(Number),
    links: links.filter((l) => l.url.trim().startsWith("http")),
  });

  const validate = () => {
    if (!form.title.trim()) { toast("Chưa nhập tên hoạt động.", "warning"); return false; }
    if (!form.summary.trim()) { toast("Chưa nhập tóm tắt hoạt động.", "warning"); return false; }
    if (form.endDate < form.startDate) { toast("Ngày kết thúc phải sau ngày bắt đầu.", "warning"); return false; }
    return true;
  };

  const handleSave = (submit: boolean) => {
    if (!validate() || !session) return;
    if (activity) {
      updateActivity(activity.id, buildInput());
      if (submit) {
        submitActivity(session, activity.id);
        toast("Đã cập nhật và nộp hoạt động để cấp trên xác nhận.");
      } else {
        toast("Đã lưu thay đổi của hoạt động.");
      }
      router.push(`/quan-tri/hoat-dong/${activity.id}`);
    } else {
      const id = createActivity(session, buildInput(), submit);
      toast(submit ? "Đã tạo và nộp hoạt động để cấp trên xác nhận." : "Đã lưu hoạt động dưới dạng nháp.");
      router.push(`/quan-tri/hoat-dong/${id}`);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Thông tin hoạt động" subtitle="Các trường có dấu * là bắt buộc." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên hoạt động" required className="sm:col-span-2">
            <Input value={form.title} onChange={set("title")} placeholder="VD: Lễ ra quân Tháng Thanh niên tình nguyện 2026" />
          </Field>
          <Field label="Tóm tắt nội dung" required className="sm:col-span-2" hint="Giới hạn dưới 250 từ, tối đa 2000 ký tự.">
            <Textarea value={form.summary} onChange={set("summary")} rows={4} maxLength={2000} />
          </Field>
          <Field label="Ngày bắt đầu" required>
            <Input type="date" value={form.startDate} onChange={set("startDate")} />
          </Field>
          <Field label="Ngày kết thúc" required>
            <Input type="date" value={form.endDate} onChange={set("endDate")} />
          </Field>
          <Field label="Địa điểm tổ chức">
            <Input value={form.location} onChange={set("location")} placeholder="VD: Nhà văn hóa phường" />
          </Field>
          <Field label="Số đoàn viên tham gia" hint="Chỉ nhập số.">
            <Input type="number" min={0} value={form.participantCount} onChange={set("participantCount")} placeholder="VD: 350" />
          </Field>
          <Field label="Nhóm nội dung" className="sm:col-span-2" hint="Chọn 1 hoặc nhiều nhóm phù hợp.">
            <div className="flex flex-wrap gap-2">
              {contentCategories.map((c) => {
                const active = form.categoryIds.includes(String(c.id));
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-doan-600 bg-doan-600 text-white"
                        : "border-stone-300 bg-white text-stone-600 hover:border-doan-300"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Link minh chứng truyền thông"
          subtitle="Bài đăng Facebook, Zalo, TikTok, báo chí… chứng minh hoạt động đã diễn ra."
          action={
            <Button size="sm" variant="secondary" onClick={() => setLinks((l) => [...l, { platform: "FACEBOOK", url: "", note: "" }])}>
              <Plus className="h-3.5 w-3.5" /> Thêm link
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {links.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-xs text-stone-400">
              Chưa có link minh chứng nào.
            </p>
          ) : (
            links.map((l, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-center">
                <Select
                  value={l.platform}
                  onChange={(e) => setLinks((arr) => arr.map((x, j) => (j === i ? { ...x, platform: e.target.value as Platform } : x)))}
                  className="sm:w-36"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
                <Input
                  value={l.url}
                  onChange={(e) => setLinks((arr) => arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                  placeholder="https://facebook.com/…"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))}
                  className="self-start rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Xóa link"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          <p className="text-[11px] text-stone-400">
            Link phải bắt đầu bằng http(s):// — tương tự ràng buộc CHECK của bảng activity_links.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4" /> Lưu nháp
        </Button>
        <Button onClick={() => handleSave(true)}>
          <Send className="h-4 w-4" /> Lưu &amp; nộp hoạt động
        </Button>
      </div>
    </div>
  );
}
