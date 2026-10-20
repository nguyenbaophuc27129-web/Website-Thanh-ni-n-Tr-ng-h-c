"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Send, Sparkles, Loader2, Link2, Target } from "lucide-react";
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
  const { contentCategories, tasks, taskMetrics, activeCriteriaSet, createActivity, updateActivity, submitActivity } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Fast import from URL
  const [importUrl, setImportUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

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

  // Cây tiêu chí & chỉ tiêu
  const activeSet = activeCriteriaSet();
  const availableTasks = useMemo(() => {
    if (!activeSet) return [];
    return tasks.filter((t) => t.criteriaSetId === activeSet.id && t.taskKind === "CRITERION" && t.status === "PUBLISHED");
  }, [tasks, activeSet]);

  const [selectedTaskId, setSelectedTaskId] = useState<number | "">(activity?.taskId ?? "");
  const [selectedMetricId, setSelectedMetricId] = useState<number | "">(activity?.taskMetricId ?? "");
  const [contributionVal, setContributionVal] = useState<string>(activity?.metricContributionValue?.toString() ?? "");

  const currentMetrics = useMemo(() => {
    if (!selectedTaskId) return [];
    return taskMetrics.filter((m) => m.taskId === Number(selectedTaskId));
  }, [taskMetrics, selectedTaskId]);

  const handleSelectTask = (taskIdStr: string) => {
    if (!taskIdStr) {
      setSelectedTaskId("");
      setSelectedMetricId("");
      return;
    }
    const tid = Number(taskIdStr);
    setSelectedTaskId(tid);
    const metrics = taskMetrics.filter((m) => m.taskId === tid);
    if (metrics.length > 0) {
      setSelectedMetricId(metrics[0].id);
    } else {
      setSelectedMetricId("");
    }
  };

  const handleExtractUrl = async () => {
    const url = importUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast("Vui lòng nhập đường link bài báo hợp lệ (bắt đầu bằng http:// hoặc https://).", "warning");
      return;
    }
    setExtracting(true);
    try {
      const res = await fetch("/api/fetch-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.title) {
        setForm((prev) => ({
          ...prev,
          title: data.title,
          summary: data.excerpt || (data.content ? data.content.slice(0, 300) : prev.summary),
        }));
        setLinks((prev) => {
          if (prev.some((l) => l.url === url)) return prev;
          return [...prev, { platform: "PRESS", url, note: "Link bài viết nguồn đã trích xuất" }];
        });
        toast("Đã tự động trích xuất thông tin bài viết thành công!", "success");
      } else {
        toast("Không trích xuất được bài viết từ link này. Bạn có thể tự nhập tay.", "warning");
      }
    } catch {
      toast("Lỗi khi kết nối trích xuất bài viết. Vui lòng thử lại.", "warning");
    } finally {
      setExtracting(false);
    }
  };

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
    taskId: selectedTaskId ? Number(selectedTaskId) : undefined,
    taskMetricId: selectedMetricId ? Number(selectedMetricId) : undefined,
    metricContributionValue: contributionVal ? Number(contributionVal) : undefined,
  });

  const validate = () => {
    if (!form.title.trim()) { toast("Chưa nhập tên hoạt động.", "warning"); return false; }
    if (!form.summary.trim()) { toast("Chưa nhập tóm tắt hoạt động.", "warning"); return false; }
    if (!form.location.trim()) { toast("Bắt buộc nhập địa điểm tổ chức theo yêu cầu.", "warning"); return false; }
    if (!form.participantCount || Number(form.participantCount) <= 0) { toast("Bắt buộc nhập số đoàn viên tham gia theo yêu cầu.", "warning"); return false; }
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
      {/* ===== Trích xuất nhanh từ link bài báo ===== */}
      <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50/60 to-blue-50/40">
        <CardBody className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-800">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            <span>Trích xuất thông tin tự động từ link bài báo / website</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Dán đường link bài viết (báo Tiền Phong, Tuổi Trẻ, web trường, cổng thông tin...)"
              className="flex-1 bg-white"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={extracting}
              onClick={handleExtractUrl}
              className="shrink-0 text-cyan-800 hover:bg-cyan-100"
            >
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              {extracting ? "Đang trích xuất..." : "Trích xuất"}
            </Button>
          </div>
          <p className="text-[11px] text-cyan-700/80">
            Hệ thống sẽ tự động bóc tách tiêu đề, tóm tắt nội dung và lưu link bài viết vào mục minh chứng.
          </p>
        </CardBody>
      </Card>

      {/* ===== Thông tin cơ bản hoạt động ===== */}
      <Card>
        <CardHeader title="Thông tin hoạt động" subtitle="Các trường có dấu * là bắt buộc." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên hoạt động" required className="sm:col-span-2">
            <Input value={form.title} onChange={set("title")} placeholder="VD: Lễ ra quân Ngày Chủ Nhật Xanh và trồng cây bảo vệ môi trường" />
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
          <Field label="Địa điểm tổ chức" required hint="Bắt buộc nhập địa điểm diễn ra hoạt động.">
            <Input value={form.location} onChange={set("location")} placeholder="VD: Trường THPT Chánh Phú Hòa, TX. Bến Cát" />
          </Field>
          <Field label="Số đoàn viên tham gia" required hint="Bắt buộc nhập số lượng thực tế tham gia.">
            <Input type="number" min={1} value={form.participantCount} onChange={set("participantCount")} placeholder="VD: 350" />
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

      {/* ===== Liên kết Cây Tiêu Chí & Chỉ Tiêu Thi Đua ===== */}
      <Card className="border-emerald-200">
        <CardHeader
          title="Đóng góp vào Cây Tiêu chí & Chỉ tiêu thi đua"
          subtitle="Tự động cộng dồn số liệu vào cây chỉ tiêu của đơn vị và cấp trên sau khi được phê duyệt."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiêu chí / Nhiệm vụ liên kết" className="sm:col-span-2" hint="Chọn tiêu chí trong bộ tiêu chí năm mà hoạt động này đóng góp kết quả">
              <Select value={selectedTaskId} onChange={(e) => handleSelectTask(e.target.value)}>
                <option value="">— Không đóng góp vào chỉ tiêu (hoạt động thường xuyên) —</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.code}] {t.title}
                  </option>
                ))}
              </Select>
            </Field>

            {selectedTaskId ? (
              <>
                <Field label="Chỉ số đánh giá (Metric)">
                  <Select value={selectedMetricId} onChange={(e) => setSelectedMetricId(Number(e.target.value))}>
                    {currentMetrics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unitOfMeasure})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Số lượng đóng góp đạt được" hint="Nhập số lượng cụ thể đạt được từ hoạt động này">
                  <Input
                    type="number"
                    min={1}
                    value={contributionVal}
                    onChange={(e) => setContributionVal(e.target.value)}
                    placeholder="VD: 50"
                  />
                </Field>
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 sm:col-span-2">
                  <span className="font-semibold">✓ Cơ chế cộng dồn tự động: </span>
                  Khi cấp trên xác nhận hoạt động này, số lượng <b className="text-emerald-900">{contributionVal || "0"}</b> sẽ được tự động cộng dồn vào tiến độ hoàn thành chỉ tiêu tương ứng của trường và cấp trên mà không cần lập báo cáo nhập tay.
                </div>
              </>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* ===== Link minh chứng truyền thông ===== */}
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
