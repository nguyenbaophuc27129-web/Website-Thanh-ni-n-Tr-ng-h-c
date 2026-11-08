"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Plus, Sparkles, CheckCircle2, Loader2, FileText, History, FileDown, LayoutTemplate, Database, RefreshCw, Copy, Check, Download, Calendar, Code, CheckSquare } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate } from "@/lib/utils";
import { reportTemplates, suggestDocCode, templateById } from "@/data/report-templates";
import { buildReportWordData, buildTemplateWordData, downloadWordDoc, vnDateStr, type WordDocData } from "@/lib/word-export";

const TYPE_LABEL: Record<string, string> = {
  MONTHLY: "Báo cáo tháng", QUARTERLY: "Báo cáo quý", ANNUAL: "Báo cáo năm", CUSTOM: "Báo cáo đột xuất",
};

const TYPE_TO_TEMPLATE: Record<string, "DINH_KY" | "CHINH_TRI_TONG_KET"> = {
  MONTHLY: "DINH_KY", QUARTERLY: "DINH_KY", ANNUAL: "DINH_KY", CUSTOM: "DINH_KY",
};

const periodLabelOf = (r: { reportType: string; periodNumber?: number; periodYear: number; periodStart?: string; periodEnd?: string }) => {
  if (r.reportType === "MONTHLY") return `tháng ${r.periodNumber}/${r.periodYear}`;
  if (r.reportType === "QUARTERLY") return `quý ${r.periodNumber}/${r.periodYear}`;
  if (r.reportType === "ANNUAL") return `năm ${r.periodYear}`;
  return `giai đoạn ${r.periodStart} — ${r.periodEnd}`;
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

  // Chat chỉnh nháp AI — yêu cầu 1 lượt rồi thay bản nháp
  const [aiEditId, setAiEditId] = useState<number | null>(null);
  const [aiEditInstruction, setAiEditInstruction] = useState("");
  const [aiEditBusy, setAiEditBusy] = useState(false);

  // Modal xuất Word
  const [exportFor, setExportFor] = useState<number | null>(null);
  const [tplId, setTplId] = useState<"DINH_KY" | "CHINH_TRI_TONG_KET">("DINH_KY");
  const [docCode, setDocCode] = useState("");
  const [checkedBases, setCheckedBases] = useState<string[]>([]);
  const [extraBase, setExtraBase] = useState("");

  // Modal xuất dữ liệu nguồn cho AI (JSON)
  const [jsonExportOpen, setJsonExportOpen] = useState(false);
  const [jsonExportMode, setJsonExportMode] = useState<"period" | "activity">("period");
  const [jsonPeriodStart, setJsonPeriodStart] = useState("2026-09-01");
  const [jsonPeriodEnd, setJsonPeriodEnd] = useState("2026-09-30");
  const [jsonSelectedActIds, setJsonSelectedActIds] = useState<number[]>([]);
  const [jsonResult, setResultJson] = useState<string | null>(null);
  const [jsonRawData, setJsonRawData] = useState<any>(null);
  const [jsonExportBusy, setJsonExportBusy] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [aiSendingBusy, setAiSendingBusy] = useState(false);

  // Modal nhập số liệu — xuất Word tự động từ kho mẫu
  const [fillTpl, setFillTpl] = useState<string | null>(null);
  const [fillPeriod, setFillPeriod] = useState("tháng 9 năm 2026");
  const [fillDocCode, setFillDocCode] = useState("");
  const [fillStats, setFillStats] = useState({ acts: 0, participants: 0, tasks: 0, posts: 0, score: 0 });
  const [fillSections, setFillSections] = useState<string[]>([]);

  const exportingReport = useMemo(
    () => store.reports.find((r) => r.id === exportFor) ?? null,
    [store.reports, exportFor]
  );

  const openExport = (reportId: number) => {
    const rep = store.reports.find((r) => r.id === reportId);
    if (!rep) return;
    const tpl = templateById(TYPE_TO_TEMPLATE[rep.reportType] ?? "DINH_KY") ?? reportTemplates[0];
    setExportFor(reportId);
    setTplId(tpl.id);
    setDocCode(suggestDocCode(rep.exports.length, tpl.docPrefix));
    setCheckedBases(tpl.defaultBases);
    setExtraBase("");
  };

  const toggleBase = (b: string) => {
    setCheckedBases((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const finalBases = useMemo(
    () => [...checkedBases, ...(extraBase.trim() ? [extraBase.trim()] : [])],
    [checkedBases, extraBase]
  );

  const unitDataPreview = useMemo(() => {
    if (!session) return null;
    const acts = store.activities.filter((a) => a.orgUnitId === session.orgUnitId);
    const asgs = store.taskAssignments.filter((a) => a.orgUnitId === session.orgUnitId);
    const posts = store.publishedPosts.filter((p) => p.authorOrgUnitName === session.orgUnitName);
    return { acts: acts.length, participants: acts.reduce((s, a) => s + (a.participantCount ?? 0), 0), tasks: asgs.length, posts: posts.length };
  }, [session, store.activities, store.taskAssignments, store.publishedPosts]);

  const downloadExport = () => {
    if (!session || !exportingReport) return;
    const tpl = templateById(tplId);
    if (!tpl) return;
    const data = buildReportWordData({
      store,
      orgUnitId: exportingReport.orgUnitId,
      templateId: tpl.id,
      docCode: docCode.trim() || suggestDocCode(exportingReport.exports.length, tpl.docPrefix),
      title: tpl.titlePattern(periodLabelOf(exportingReport), session.orgUnitName.replace("Đoàn ", "")),
      bases: finalBases.length > 0 ? finalBases : tpl.defaultBases,
      periodLabel: periodLabelOf(exportingReport),
      signerName: session.contactPerson,
      signerPosition: session.contactPosition,
      recipients: tpl.recipients(session.orgUnitName),
    });
    downloadWordDoc(`bao-cao-${exportingReport.id}-${tpl.id.toLowerCase()}`, data);
    store.exportReport(exportingReport.id, "DOCX");
    toast(`Đã tải văn bản Word "${data.docCode}" theo mẫu ${tpl.name}.`);
  };

  const downloadBlank = (tid: string) => {
    if (!session) return;
    const tpl = templateById(tid);
    if (!tpl) return;
    const data = buildTemplateWordData({
      orgUnitName: session.orgUnitName,
      docCode: suggestDocCode(0, tpl.docPrefix),
      title: tpl.titlePattern("…", session.orgUnitName.replace("Đoàn ", "")),
      bases: tpl.defaultBases,
      outline: tpl.outline,
      signerName: session.contactPerson,
      signerPosition: session.contactPosition,
      recipients: tpl.recipients(session.orgUnitName),
    });
    downloadWordDoc(`mau-${tid.toLowerCase()}`, data);
    toast(`Đã tải mẫu trắng "${tpl.name}" (${vnDateStr(new Date())}).`);
  };

  const contentHeadingsOf = (tid: string) =>
    templateById(tid)?.outline.filter((o) => !/^I\.\s*CĂN CỨ/i.test(o)) ?? [];

  /** Sinh nội dung nháp tự động cho từng phần, có ghép số liệu đã nhập */
  const draftForHeading = (heading: string, s: typeof fillStats, period: string): string => {
    const orgShort = session?.orgUnitName.replace("Đoàn ", "") ?? "đơn vị";
    const h = heading.toUpperCase();
    if (h.includes("DƯ LUẬN")) {
      return `Tình hình dư luận xã hội trong thanh niên trên địa bàn ổn định; không có vụ việc phức tạp phát sinh trong ${period}. Đơn vị duy trì nắm bắt tình hình và báo cáo định kỳ theo quy định.`;
    }
    if (h.includes("ĐÁNH GIÁ") || h.includes("BÀI HỌC") || h.includes("ĐIỂN HÌNH")) {
      return `Đánh giá chung: ${orgShort} cơ bản hoàn thành các nội dung công tác trong ${period}, tích cực thực hiện các nội dung theo Bộ Tiêu chí thi đua. Điểm thi đua tích lũy theo Bộ tiêu chí hiện hành: ${s.score} điểm.\n\nBài học kinh nghiệm: tăng cường phối hợp giữa các cấp Đoàn, cập nhật số liệu kịp thời trên hệ thống để phục vụ chấm điểm và báo cáo.`;
    }
    if (h.includes("KIẾN NGHỊ") || h.includes("HƯỚNG") || h.includes("ĐẨY MẠNH")) {
      return `Kiến nghị, đề xuất: đề nghị cấp trên quan tâm hỗ trợ kinh phí hoạt động, tập huấn nghiệp vụ sử dụng hệ thống và gia hạn thời gian cho các nhiệm vụ chưa hoàn thành có lý do chính đáng.`;
    }
    if (h.includes("TIẾN ĐỘ") || h.includes("RỦI RO")) {
      return s.tasks > 0
        ? `Đơn vị đang theo dõi ${s.tasks} nhiệm vụ thi đua được giao, đã cập nhật kết quả tiến độ định kỳ trên hệ thống. Các nội dung thiếu minh chứng sẽ được bổ sung trong kỳ rà soát tiếp theo.`
        : `Đơn vị chưa được giao nhiệm vụ thi đua nào trong kỳ báo cáo.`;
    }
    // Kết quả thực hiện (mặc định)
    return [
      `Trong ${period}, ${orgShort} đã triển khai ${s.acts} hoạt động với tổng ${s.participants.toLocaleString("vi-VN")} lượt đoàn viên, thanh niên tham gia.`,
      s.tasks > 0
        ? `Tiến độ nhiệm vụ thi đua: theo dõi ${s.tasks} nhiệm vụ được giao, cập nhật kết quả định kỳ trên hệ thống.`
        : `Đơn vị chưa được giao nhiệm vụ thi đua nào trong kỳ.`,
      `Công tác truyền thông: ${s.posts} tin bài đã đăng tải công khai trên Cổng thông tin điện tử.`,
    ].join("\n\n");
  };

  const myActivities = useMemo(() => {
    if (!session) return [];
    return store.activities
      .filter((a) => a.orgUnitId === session.orgUnitId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [store.activities, session]);

  const handleExportJson = async () => {
    if (!session) return;
    setJsonExportBusy(true);
    try {
      const res = await fetch("/api/bao-cao/xuat-du-lieu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: jsonExportMode,
          periodStart: jsonExportMode === "period" ? jsonPeriodStart : undefined,
          periodEnd: jsonExportMode === "period" ? jsonPeriodEnd : undefined,
          activityIds: jsonExportMode === "activity" ? jsonSelectedActIds : undefined,
          orgUnitId: session.orgUnitId,
          clientFallbackData: {
            orgUnits: store.orgUnits,
            activities: store.activities,
            tasks: store.tasks,
            taskAssignments: store.taskAssignments,
            publishedPosts: store.publishedPosts,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setJsonRawData(data);
      setResultJson(JSON.stringify(data.contextForAi, null, 2));
      toast(`Đã trích xuất ${data.metadata.activityCount} hoạt động thành dữ liệu JSON chuẩn cho AI!`, "success");
    } catch (err) {
      toast(`Lỗi trích xuất dữ liệu: ${err instanceof Error ? err.message : "không rõ"}`, "warning");
    } finally {
      setJsonExportBusy(false);
    }
  };

  const handleCopyJson = () => {
    if (!jsonResult) return;
    navigator.clipboard.writeText(jsonResult);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    toast("Đã sao chép dữ liệu JSON vào bộ nhớ đệm.");
  };

  const handleDownloadJson = () => {
    if (!jsonResult) return;
    const blob = new Blob([jsonResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `du-lieu-bao-cao-ai-${jsonExportMode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Đã tải xuống tệp dữ liệu JSON.");
  };

  const handleSendToAi = async () => {
    if (!jsonRawData?.contextForAi || !session) return;
    setAiSendingBusy(true);
    try {
      const res = await fetch("/api/ai/nhap-bao-cao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctx: jsonRawData.contextForAi }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.content) throw new Error(data.error || `HTTP ${res.status}`);
      const periodLabel = jsonRawData.contextForAi.period || "Kỳ báo cáo";
      const newId = store.createReport(session, {
        orgUnitId: session.orgUnitId,
        reportType: "MONTHLY",
        periodYear: new Date().getFullYear(),
        periodNumber: new Date().getMonth() + 1,
        periodStart: jsonExportMode === "period" ? jsonPeriodStart : new Date().toISOString().slice(0, 10),
        periodEnd: jsonExportMode === "period" ? jsonPeriodEnd : new Date().toISOString().slice(0, 10),
        title: `Báo cáo công tác Đoàn (${periodLabel}) - Tạo từ AI`,
      });
      store.updateReport(newId, {
        content: data.content,
        aiDraftContent: data.content,
        aiModel: data.model || "Gemini AI",
        aiGeneratedAt: new Date().toISOString(),
      });
      toast("Đã tạo báo cáo mới từ dữ liệu JSON và bản nháp AI thành công!", "success");
      setJsonExportOpen(false);
    } catch (err) {
      toast(`Không gọi được AI: ${err instanceof Error ? err.message : "lỗi không rõ"}`, "warning");
    } finally {
      setAiSendingBusy(false);
    }
  };

  const openFill = (tid: string) => {
    const tpl = templateById(tid);
    if (!tpl) return;
    const u = unitDataPreview ?? { acts: 0, participants: 0, tasks: 0, posts: 0 };
    const stats = { ...u, score: 0 };
    setFillTpl(tid);
    setFillDocCode(suggestDocCode(0, tpl.docPrefix));
    setCheckedBases(tpl.defaultBases);
    setExtraBase("");
    setFillStats(stats);
    setFillSections(contentHeadingsOf(tid).map((h) => draftForHeading(h, stats, "tháng 9 năm 2026")));
  };

  const regenDraft = () => {
    if (!fillTpl) return;
    setFillSections(contentHeadingsOf(fillTpl).map((h) => draftForHeading(h, fillStats, fillPeriod)));
    toast("Đã sinh lại nội dung nháp từ số liệu hiện tại.");
  };

  const exportFilled = () => {
    if (!session || !fillTpl) return;
    const tpl = templateById(fillTpl);
    if (!tpl) return;
    const org = store.orgById(session.orgUnitId);
    const data: WordDocData = {
      docCode: fillDocCode.trim() || suggestDocCode(0, tpl.docPrefix),
      orgUnitName: session.orgUnitName.toUpperCase(),
      orgUnitAddress: org?.address,
      title: tpl.titlePattern(fillPeriod, session.orgUnitName.replace("Đoàn ", "")).toUpperCase(),
      greeting: `Kính gửi: ${tpl.recipients(session.orgUnitName)[0]}`,
      bases: finalBases.length > 0 ? finalBases : tpl.defaultBases,
      sections: contentHeadingsOf(fillTpl).map((heading, i) => ({
        heading,
        paragraphs: (fillSections[i] || "………").split("\n\n"),
      })),
      place: (org?.adminUnitName ?? "Hà Nội").split(",")[0],
      dateStr: vnDateStr(new Date()),
      signerPosition: session.contactPosition.toUpperCase(),
      signerName: session.contactPerson,
      recipients: tpl.recipients(session.orgUnitName),
    };
    downloadWordDoc(`xu-tu-dong-${fillTpl.toLowerCase()}`, data);
    toast(`Đã xuất tự động văn bản "${data.docCode}" theo mẫu ${tpl.name} từ số liệu đã nhập.`);
  };

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

  const generateAi = async (reportId: number) => {
    if (aiBusy !== null) return;
    setAiBusy(reportId);
    try {
      const rep = store.reports.find((r) => r.id === reportId);
      // Gọi BE trích xuất JSON dữ liệu kỳ báo cáo (hoặc client fallback)
      const exportRes = await fetch("/api/bao-cao/xuat-du-lieu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "period",
          periodStart: rep?.periodStart,
          periodEnd: rep?.periodEnd,
          periodLabel: rep ? periodLabelOf(rep) : "kỳ báo cáo",
          orgUnitId: rep?.orgUnitId,
          clientFallbackData: {
            orgUnits: store.orgUnits,
            activities: store.activities,
            tasks: store.tasks,
            taskAssignments: store.taskAssignments,
            publishedPosts: store.publishedPosts,
          },
        }),
      });
      const exportData = await exportRes.json().catch(() => null);
      const aiCtx = exportData?.ok ? exportData.contextForAi : null;

      // Gom số liệu gửi lên AI agent
      const res = await fetch("/api/ai/nhap-bao-cao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctx: aiCtx }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; content?: string; model?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.content) throw new Error(data?.error ?? `HTTP ${res.status}`);
      store.updateReport(reportId, {
        aiDraftContent: data.content,
        aiModel: data.model ?? "AI",
        aiGeneratedAt: new Date().toISOString(),
      });
      toast("Đã tạo bản nháp AI. Bạn xem, chỉnh sửa rồi chốt báo cáo.");
    } catch {
      toast("Không gọi được API tạo nháp AI — kiểm tra kết nối rồi thử lại.", "warning");
    } finally {
      setAiBusy(null);
    }
  };

  const startEdit = (id: number) => {
    const rep = store.reports.find((r) => r.id === id);
    setEditingId(id);
    setEditContent(rep?.content ?? rep?.aiDraftContent ?? "");
  };

  /** Gửi yêu cầu chỉnh nháp lên AI — thay lại aiDraftContent */
  const applyAiEdit = async (reportId: number) => {
    const rep = store.reports.find((r) => r.id === reportId);
    const draft = rep?.aiDraftContent ?? "";
    const instruction = aiEditInstruction.trim();
    if (!draft || !instruction || aiEditBusy) return;
    setAiEditBusy(true);
    try {
      const res = await fetch("/api/ai/chinh-bao-cao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, instruction }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; content?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.content) throw new Error(data?.error ?? `HTTP ${res.status}`);
      store.updateReport(reportId, { aiDraftContent: data.content });
      setAiEditInstruction("");
      setAiEditId(null);
      toast("AI đã chỉnh xong bản nháp — bạn xem lại trước khi chốt báo cáo.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không chỉnh được báo cáo bằng AI.", "warning");
    } finally {
      setAiEditBusy(false);
    }
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
            Lập báo cáo tháng/quý/năm từ dữ liệu hệ thống, có bản nháp gợi ý bằng AI và xuất Word.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setJsonExportOpen(true); setResultJson(null); setJsonRawData(null); }} className="flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
            <Code className="h-4 w-4 text-blue-600" /> Xuất JSON cho AI
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Tạo báo cáo
          </Button>
        </div>
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
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
                    {r.aiDraftContent}
                  </div>
                  {aiEditId === r.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        value={aiEditInstruction}
                        onChange={(e) => setAiEditInstruction(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyAiEdit(r.id)}
                        placeholder="VD: rút gọn phần C, thêm mục triển khai quý 4…"
                        className="h-8 min-w-56 flex-1 text-xs"
                      />
                      <Button size="sm" onClick={() => applyAiEdit(r.id)} disabled={aiEditBusy}>
                        {aiEditBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {aiEditBusy ? "Đang chỉnh…" : "Chỉnh bằng AI"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAiEditId(null); setAiEditInstruction(""); }}>
                        Bỏ
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAiEditId(r.id); setAiEditInstruction(""); }}
                      className="mt-2 text-[11px] font-medium text-violet-700 hover:underline"
                    >
                      Chỉnh sửa bản nháp bằng AI…
                    </button>
                  )}
                </div>
              ) : null}

              {editingId === r.id ? (
                <div className="space-y-2">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={7} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Hủy</Button>
                    <Button size="sm" onClick={saveContent}>Lưu nội dung</Button>
                  </div>
                </div>
              ) : r.content ? (
                <div className="rounded-lg border border-stone-200 bg-white p-3.5 text-xs leading-relaxed text-stone-700">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">Nội dung đã biên tập</p>
                  <div className="whitespace-pre-wrap">{r.content}</div>
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
                  <Button size="sm" variant="outline" onClick={() => openExport(r.id)}>
                    <FileDown className="h-3.5 w-3.5" /> Xuất Word thể thức
                  </Button>
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
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Kho mẫu văn bản chính thức (02 mẫu quy định)"
          subtitle="Áp dụng chuẩn 02 mẫu văn bản chính thức: Báo cáo định kỳ (Tuần/Tháng/Quý/Năm) và Báo cáo chính trị Đại hội Đoàn."
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-stone-100">
            {reportTemplates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-doan-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800">
                    {t.name} <span className="ml-1 font-normal text-[11px] text-stone-400">Ký hiệu {t.docSuffix} · {t.cadence}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">{t.description}</p>
                  <p className="mt-1 text-[11px] text-stone-400">
                    Khung nội dung: {t.outline.map((o) => o.replace(/^[IVX]+\.\s*/, "")).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" onClick={() => openFill(t.id)}>
                    <Database className="h-3.5 w-3.5" /> Nhập số liệu → xuất Word
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadBlank(t.id)}>
                    <FileDown className="h-3.5 w-3.5" /> Mẫu trắng
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Modal
        open={exportFor !== null}
        onClose={() => setExportFor(null)}
        title="Xuất Word theo mẫu thể thức"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setExportFor(null)}>Hủy</Button>
            <Button onClick={downloadExport}>
              <FileDown className="h-4 w-4" /> Tải Word (.doc)
            </Button>
          </>
        }
      >
        {exportingReport ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-stone-800">{exportingReport.title}</p>
              <p className="text-xs text-stone-500">{TYPE_LABEL[exportingReport.reportType]} · {periodLabelOf(exportingReport)}</p>
            </div>

            <Field label="Truy xuất mẫu văn bản">
              <Select value={tplId} onChange={(e) => {
                const t = templateById(e.target.value);
                setTplId(e.target.value as typeof tplId);
                if (t) {
                  setCheckedBases(t.defaultBases);
                  setDocCode(suggestDocCode(exportingReport.exports.length, t.docPrefix));
                }
              }}>
                {reportTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.description.slice(0, 60)}…</option>
                ))}
              </Select>
            </Field>

            <Field label="Số / ký hiệu văn bản">
              <Input value={docCode} onChange={(e) => setDocCode(e.target.value)} placeholder="BC-101/BC-ĐTN" />
            </Field>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <Database className="h-3.5 w-3.5 text-doan-600" /> Số liệu đơn vị trên hệ thống (điền tự động vào văn bản)
              </p>
              {unitDataPreview ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Hoạt động", value: unitDataPreview.acts },
                    { label: "Lượt tham gia", value: unitDataPreview.participants.toLocaleString("vi-VN") },
                    { label: "Nhiệm vụ thi đua", value: unitDataPreview.tasks },
                    { label: "Tin bài đã đăng", value: unitDataPreview.posts },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-center">
                      <p className="font-serif-display text-lg font-bold text-doan-700">{s.value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-stone-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-stone-700">Trích căn cứ (bỏ chọn / thêm căn cứ riêng của đơn vị)</p>
              <div className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-3">
                {(templateById(tplId)?.defaultBases ?? []).map((b) => (
                  <label key={b} className="flex cursor-pointer items-start gap-2 text-xs text-stone-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-doan-600"
                      checked={checkedBases.includes(b)}
                      onChange={() => toggleBase(b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  value={extraBase}
                  onChange={(e) => setExtraBase(e.target.value)}
                  placeholder="Thêm căn cứ khác (VD: Kế hoạch số …/KH-ĐTN ngày …)"
                />
              </div>
            </div>

            <p className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-[11px] text-violet-700">
              Bản Word sẽ đúng thể thức văn bản hành chính: quốc hiệu — tiêu ngữ, số/ký hiệu, trích căn cứ, bảng số liệu từ dữ liệu đơn vị, nơi nhận và chỗ ký.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={fillTpl !== null}
        onClose={() => setFillTpl(null)}
        title="Nhập số liệu — xuất Word tự động"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFillTpl(null)}>Hủy</Button>
            <Button onClick={exportFilled}>
              <FileDown className="h-4 w-4" /> Xuất Word tự động
            </Button>
          </>
        }
      >
        {fillTpl ? (() => {
          const tpl = templateById(fillTpl);
          if (!tpl) return null;
          const heads = contentHeadingsOf(fillTpl);
          return (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-stone-800">{tpl.name}</p>
                <p className="text-xs text-stone-500">{tpl.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Kỳ báo cáo">
                  <Input value={fillPeriod} onChange={(e) => setFillPeriod(e.target.value)} placeholder="VD: tháng 9 năm 2026" />
                </Field>
                <Field label="Số / ký hiệu văn bản">
                  <Input value={fillDocCode} onChange={(e) => setFillDocCode(e.target.value)} />
                </Field>
              </div>

              <div>
                <p className="mb-1.5 flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-doan-600" /> Số liệu báo cáo
                  </span>
                  <button onClick={regenDraft} className="flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900">
                    <RefreshCw className="h-3 w-3" /> Sinh lại nội dung tự động
                  </button>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { key: "acts", label: "Hoạt động" },
                    { key: "participants", label: "Lượt tham gia" },
                    { key: "tasks", label: "Nhiệm vụ" },
                    { key: "posts", label: "Tin bài" },
                    { key: "score", label: "Điểm thi đua" },
                  ] as const).map((f) => (
                    <Field key={f.key} label={f.label}>
                      <Input
                        type="number"
                        min={0}
                        value={fillStats[f.key]}
                        onChange={(e) => setFillStats((s) => ({ ...s, [f.key]: Number(e.target.value) || 0 }))}
                        className="text-center"
                      />
                    </Field>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-stone-400">Số liệu được điền sẵn từ dữ liệu đơn vị đã nhập trên hệ thống — sửa trực tiếp nếu cần.</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-stone-700">Nội dung từng phần (tự soạn theo số liệu — sửa được)</p>
                {heads.map((h, i) => (
                  <Field key={h} label={h}>
                    <Textarea
                      value={fillSections[i] ?? ""}
                      onChange={(e) =>
                        setFillSections((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      rows={3}
                    />
                  </Field>
                ))}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-stone-700">Trích căn cứ</p>
                <div className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  {tpl.defaultBases.map((b) => (
                    <label key={b} className="flex cursor-pointer items-start gap-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-doan-600"
                        checked={checkedBases.includes(b)}
                        onChange={() => toggleBase(b)}
                      />
                      <span>{b}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <Input value={extraBase} onChange={(e) => setExtraBase(e.target.value)} placeholder="Thêm căn cứ khác (nếu có)" />
                </div>
              </div>
            </div>
          );
        })() : null}
      </Modal>

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

      {/* Modal Xuất dữ liệu nguồn thành JSON gửi thẳng vào AI */}
      <Modal
        open={jsonExportOpen}
        onClose={() => setJsonExportOpen(false)}
        title="Dữ liệu nguồn cho AI (Xuất JSON & Gửi AI)"
        wide
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              {jsonResult && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5"
                  >
                    {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedJson ? "Đã chép" : "Sao chép JSON"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Tải file .json
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setJsonExportOpen(false)}>
                Đóng
              </Button>
              {jsonResult && (
                <Button
                  onClick={handleSendToAi}
                  disabled={aiSendingBusy}
                  className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
                >
                  {aiSendingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiSendingBusy ? "Đang gửi vào AI…" : "Gửi thẳng vào AI tạo nháp"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200 text-xs text-blue-900 leading-relaxed">
            Hệ thống tự động lọc toàn bộ hoạt động, số lượt tham gia, tiến độ nhiệm vụ thi đua và tin bài theo kỳ báo cáo hoặc danh sách chọn, chuyển thành cấu trúc JSON chuẩn theo <strong>Đặc tả huấn luyện AI agent báo cáo Đoàn</strong> để nạp thẳng vào AI.
          </div>

          <div className="flex items-center gap-4 border-b border-stone-200 pb-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="radio"
                name="jsonMode"
                value="period"
                checked={jsonExportMode === "period"}
                onChange={() => setJsonExportMode("period")}
                className="accent-blue-600"
              />
              <span>1. Theo kỳ báo cáo (Thời gian)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="radio"
                name="jsonMode"
                value="activity"
                checked={jsonExportMode === "activity"}
                onChange={() => setJsonExportMode("activity")}
                className="accent-blue-600"
              />
              <span>2. Chọn hoạt động cụ thể ({jsonSelectedActIds.length} đã chọn)</span>
            </label>
          </div>

          {jsonExportMode === "period" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Từ ngày">
                  <Input
                    type="date"
                    value={jsonPeriodStart}
                    onChange={(e) => setJsonPeriodStart(e.target.value)}
                  />
                </Field>
                <Field label="Đến ngày">
                  <Input
                    type="date"
                    value={jsonPeriodEnd}
                    onChange={(e) => setJsonPeriodEnd(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    setJsonPeriodStart("2026-10-01");
                    setJsonPeriodEnd("2026-10-31");
                  }}
                  className="rounded-md bg-stone-100 px-2 py-1 hover:bg-stone-200"
                >
                  Tháng 10/2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonPeriodStart("2026-09-01");
                    setJsonPeriodEnd("2026-09-30");
                  }}
                  className="rounded-md bg-stone-100 px-2 py-1 hover:bg-stone-200"
                >
                  Tháng 9/2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonPeriodStart("2026-10-06");
                    setJsonPeriodEnd("2026-10-12");
                  }}
                  className="rounded-md bg-stone-100 px-2 py-1 hover:bg-stone-200"
                >
                  Tuần 41 (06 - 12/10)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Chọn các hoạt động cần tổng hợp báo cáo:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setJsonSelectedActIds(myActivities.map((a) => a.id))}
                    className="text-blue-600 hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setJsonSelectedActIds([])}
                    className="text-stone-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                {myActivities.length === 0 ? (
                  <p className="text-xs text-stone-400 py-3 text-center">Đơn vị chưa có hoạt động nào được tạo.</p>
                ) : (
                  myActivities.map((act) => {
                    const isChecked = jsonSelectedActIds.includes(act.id);
                    return (
                      <label
                        key={act.id}
                        className={`flex items-start gap-2.5 rounded-md p-2 text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50 border border-blue-200" : "bg-white border border-stone-100 hover:bg-stone-100/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-blue-600"
                          checked={isChecked}
                          onChange={() => {
                            setJsonSelectedActIds((prev) =>
                              prev.includes(act.id) ? prev.filter((id) => id !== act.id) : [...prev, act.id]
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-stone-900 truncate">{act.title}</p>
                          <p className="text-[11px] text-stone-500">
                            Ngày: {formatDate(act.startDate)} {act.location ? `· ${act.location}` : ""} · {act.participantCount || 0} lượt tham gia
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleExportJson}
              disabled={jsonExportBusy || (jsonExportMode === "activity" && jsonSelectedActIds.length === 0)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {jsonExportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code className="h-4 w-4" />}
              {jsonExportBusy ? "Đang trích xuất JSON từ Backend..." : "Trích xuất JSON từ dữ liệu hệ thống"}
            </Button>
          </div>

          {jsonResult && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  JSON đầu vào AI ({jsonRawData?.metadata?.activityCount || 0} hoạt động, {jsonRawData?.metadata?.participantCount || 0} lượt tham gia)
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {jsonRawData?.metadata?.orgUnitName}
                </span>
              </div>
              <textarea
                readOnly
                value={jsonResult}
                rows={10}
                className="w-full rounded-xl border border-stone-200 bg-stone-900 p-3 font-mono text-xs text-emerald-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
