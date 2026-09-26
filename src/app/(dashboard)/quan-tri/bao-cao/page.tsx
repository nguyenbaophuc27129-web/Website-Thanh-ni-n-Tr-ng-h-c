"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Plus, Sparkles, CheckCircle2, Loader2, FileText, History } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MockExportButton } from "@/components/dashboard/mock-export-button";
import { Textarea as TA } from "@/components/ui/input";
import { formatDateTime, formatDate, todayISO } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  MONTHLY: "Báo cáo tháng", QUARTERLY: "Báo cáo quý", ANNUAL: "Báo cáo năm", CUSTOM: "Báo cáo đột xuất",
};

export default function BaoCaoPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", reportType: "MONTHLY", periodYear: "2026", periodNumber: "9",
    periodStart: "2026-09-01", periodEnd: "2026-09-30",
  });

  const [aiBusy, setAiBusy] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const myReports = useMemo(
    () => store.reports.filter((r) => r.orgUnitId === session?.orgUnitId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.reports, session]
  );
  const scopeReports = useMemo(() => {
    const scope = session ? store.scopeIds(session) : [];
    return store.reports.filter((r) => scope.includes(r.orgUnitId) && r.orgUnitId !== session?.orgUnitId);
  }, [store.reports, session]);

  const handleCreate = () => {
    if (!session) return;
    if (!form.title.trim()) {
      toast("Nhập tên báo cáo.", "warning");
      return;
    }
    store.createReport(session, {
      orgUnitId: session.orgUnitId,
      title: form.title.trim(),
      reportType: form.reportType as "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM",
      periodYear: Number(form.periodYear),
      periodNumber: Number(form.periodNumber),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
    });
    toast("Đã tạo báo cáo. Bạn có thể dùng 'Tạo nháp AI' để lấy bản nháp gợi ý.");
    setCreateOpen(false);
  };

  const generateAi = (reportId: number) => {
    if (aiBusy !== null) return;
    setAiBusy(reportId);
    setTimeout(() => {
      const rep = store.reports.find((r) => r.id === reportId);
      const acts = store.activities.filter((a) => a.orgUnitId === rep?.orgUnitId);
      const asgs = store.taskAssignments.filter((a) => a.orgUnitId === rep?.orgUnitId);
      const draft = [
        `Kính gửi cấp trên,`,
        `Trong kỳ báo cáo, ${store.orgName(rep?.orgUnitId ?? 0)} đã triển khai ${acts.length} hoạt động với tổng ${acts.reduce((s, a) => s + (a.participantCount ?? 0), 0).toLocaleString("vi-VN")} lượt đoàn viên tham gia.`,
        `Tiến độ nhiệm vụ thi đua: ${asgs.length > 0 ? asgs.map((a) => `${store.tasks.find((t) => t.id === a.taskId)?.code ?? "?"} đạt ${a.completionRate.toFixed(1)}%`).join("; ") : "chưa có nhiệm vụ được giao"}.`,
        `Công tác truyền thông ghi nhận ${store.publishedPosts.filter((p) => p.status === "PUBLISHED" && p.authorOrgUnitName === store.orgName(rep?.orgUnitId ?? 0)).length} tin bài đăng công khai.`,
        `Kiến nghị: đề nghị cấp trên quan tâm hỗ trợ kinh phí hoạt động và gia hạn một số nhiệm vụ tại địa phương.`,
      ].join("\n\n");
      store.updateReport(reportId, {
        aiDraftContent: draft,
        aiModel: "tnth-draft-v1 (mock)",
        aiGeneratedAt: new Date().toISOString(),
      });
      setAiBusy(null);
      toast("Đã tạo bản nháp AI (giả lập). Bạn xem, chỉnh sửa rồi chốt báo cáo.");
    }, 1800);
  };

  const startEdit = (id: number) => {
    const rep = store.reports.find((r) => r.id === id);
    setEditingId(id);
    setEditContent(rep?.content ?? rep?.aiDraftContent ?? "");
  };

  const saveContent = () => {
    if (editingId === null) return;
    store.updateReport(editingId, { content: editContent });
    toast("Đã lưu nội dung báo cáo.");
    setEditingId(null);
  };

  const finalize = (id: number) => {
    store.finalizeReport(id);
    toast("Đã chốt báo cáo (FINALIZED).");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Báo cáo</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Lập báo cáo tháng/quý/năm từ dữ liệu hệ thống, có bản nháp gợi ý (giả lập AI) và xuất Word/PDF/Excel.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Tạo báo cáo
        </Button>
      </div>

      <div className="space-y-4">
        {myReports.map((r) => (
          <Card key={r.id}>
            <CardHeader
              title={r.title}
              subtitle={`${TYPE_LABEL[r.reportType]} ${r.periodNumber ? `số ${r.periodNumber} · ` : ""}năm ${r.periodYear} · ${formatDate(r.periodStart)} — ${formatDate(r.periodEnd)}`}
              action={
                r.status === "FINALIZED" ? (
                  <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Đã chốt</Badge>
                ) : (
                  <Badge tone="yellow">Bản nháp</Badge>
                )
              }
            />
            <CardBody className="space-y-4">
              {r.aiDraftContent ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-800">
                    <Sparkles className="h-3.5 w-3.5" /> Bản nháp AI
                    <span className="ml-1 font-normal text-violet-500">
                      {r.aiModel} · {formatDateTime(r.aiGeneratedAt)}
                    </span>
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-600">
                    {r.aiDraftContent.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
                  </div>
                </div>
              ) : null}

              {editingId === r.id ? (
                <div className="space-y-2">
                  <TA value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={7} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Hủy</Button>
                    <Button size="sm" onClick={saveContent}>Lưu nội dung</Button>
                  </div>
                </div>
              ) : r.content ? (
                <div className="rounded-lg border border-stone-200 bg-white p-3.5 text-xs leading-relaxed text-stone-700">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Nội dung đã biên tập</p>
                  {r.content.split("\n\n").map((para, i) => <p key={i} className="mb-1.5">{para}</p>)}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                {r.status === "DRAFT" ? (
                  <Button size="sm" variant="outline" onClick={() => generateAi(r.id)} disabled={aiBusy !== null}>
                    {aiBusy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiBusy === r.id ? "Đang soạn nháp…" : r.aiDraftContent ? "Tạo lại nháp AI" : "Tạo nháp AI"}
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => startEdit(r.id)}>
                  <FileText className="h-3.5 w-3.5" /> {r.content ? "Sửa nội dung" : "Viết nội dung"}
                </Button>
                {r.status === "DRAFT" ? (
                  <Button size="sm" onClick={() => finalize(r.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Chốt báo cáo
                  </Button>
                ) : null}
                <div className="ml-auto flex gap-2">
                  <MockExportButton fileName={`bao-cao-${r.id}`} format="DOCX" size="sm" />
                  <MockExportButton fileName={`bao-cao-${r.id}`} format="PDF" size="sm" />
                  <MockExportButton fileName={`bao-cao-${r.id}`} format="XLSX" size="sm" />
                </div>
              </div>

              {r.exports.length > 0 ? (
                <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
                  <History className="h-3 w-3" />
                  Đã xuất: {r.exports.map((e) => `${e.exportFormat} (${formatDateTime(e.exportedAt)})`).join(", ")}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ))}
        {myReports.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <FileBarChart className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Đơn vị bạn chưa có báo cáo nào.</p>
          </div>
        ) : null}
      </div>

      {scopeReports.length > 0 ? (
        <Card>
          <CardHeader title="Báo cáo của cấp dưới" subtitle="Theo dõi tiến độ báo cáo trong phạm vi quản lý" />
          <CardBody className="p-0">
            <ul className="divide-y divide-stone-100">
              {scopeReports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <FileBarChart className="h-4 w-4 shrink-0 text-stone-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{r.title}</p>
                    <p className="text-[11px] text-stone-400">{store.orgName(r.orgUnitId)} · {formatDateTime(r.createdAt)}</p>
                  </div>
                  {r.status === "FINALIZED" ? <Badge tone="green">Đã chốt</Badge> : <Badge tone="yellow">Nháp</Badge>}
                  <MockExportButton fileName={`bao-cao-${r.id}`} format="XLSX" size="sm" />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo báo cáo mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}>Tạo báo cáo</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tên báo cáo" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="VD: Báo cáo phong trào tháng 9/2026"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại báo cáo">
              <Select value={form.reportType} onChange={(e) => setForm((f) => ({ ...f, reportType: e.target.value }))}>
                <option value="MONTHLY">Tháng</option>
                <option value="QUARTERLY">Quý</option>
                <option value="ANNUAL">Năm</option>
                <option value="CUSTOM">Đột xuất</option>
              </Select>
            </Field>
            <Field label="Năm">
              <Input type="number" value={form.periodYear} onChange={(e) => setForm((f) => ({ ...f, periodYear: e.target.value }))} />
            </Field>
            <Field label="Số thứ tự kỳ (tháng/quý)">
              <Input type="number" min={1} max={12} value={form.periodNumber} onChange={(e) => setForm((f) => ({ ...f, periodNumber: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ ngày">
              <Input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
            </Field>
            <Field label="Đến ngày">
              <Input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
