"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Trash2, Loader2, CheckCircle2, Info, ShieldAlert, Eraser,
  ClipboardPaste, ArrowRight, BellRing,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { parseDirective, demoDirectiveText, type DirectiveDraft } from "@/lib/ai-directive";
import { addDaysISO } from "@/lib/utils";

/** AI phân tích chỉ mở cho cấp quản lý (TW / Tỉnh / Cấp 3) */
const MANAGERS = ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3"] as const;

interface EditableDraft extends DirectiveDraft {
  selected: boolean;
}

const STEP_BADGE =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-doan-600 text-xs font-bold text-white";
const STEP_TITLE = "text-sm font-semibold text-stone-900";

export default function AiPhanTichPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [sourceDocNumber, setSourceDocNumber] = useState("");
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  const [done, setDone] = useState<{ taskId: number; assignmentCount: number } | null>(null);
  /** Tên model AI trả về từ API — hiện thị góc phải tiêu đề */
  const [model, setModel] = useState("tnth-kpi-v1 (mô phỏng quy tắc)");

  const allowed = !!session && (MANAGERS as readonly string[]).includes(session.role);

  /** Đơn vị con trực tiếp đang hoạt động */
  const childUnits = useMemo(() => {
    if (!session || !allowed) return [];
    return store.orgUnits.filter((u) => u.parentId === session.orgUnitId && u.isActive);
  }, [store.orgUnits, session, allowed]);

  const selectedDrafts = drafts.filter((d) => d.selected);
  const commonDueDate = useMemo(
    () =>
      selectedDrafts
        .map((d) => d.dueDate)
        .filter(Boolean)
        .sort()[0] ?? "",
    [selectedDrafts]
  );

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-stone-900">Chức năng dành cho cấp quản lý</p>
          <p className="max-w-sm text-xs text-stone-500">
            AI phân tích công văn chỉ dành cho Ban Thường vụ / Ban TNTH các cấp (TW, tỉnh, cấp 3).
            Tài khoản của bạn không có quyền truy cập trang này.
          </p>
          <Link href="/quan-tri">
            <Button variant="secondary">Về bảng điều khiển</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const resetAll = () => {
    setText("");
    setTaskTitle("");
    setSourceDocNumber("");
    setDrafts([]);
    setSelectedUnits([]);
    setDone(null);
  };

  const pasteDemo = () => {
    setText(demoDirectiveText());
    setDrafts([]);
    setDone(null);
  };

  const runAnalyze = async () => {
    if (text.trim().length < 40) return;
    setAnalyzing(true);
    setDone(null);
    const started = Date.now();
    let parsed: DirectiveDraft[] = [];
    try {
      // Gọi API AI — mặc định là parser quy tắc trên máy chủ, dễ thay bằng AI thật (xem route)
      const res = await fetch("/api/ai/phan-tich-cong-van", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; drafts?: DirectiveDraft[]; model?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.drafts) throw new Error(data?.error ?? `HTTP ${res.status}`);
      parsed = data.drafts;
      if (data.model) setModel(data.model);
    } catch {
      // API không gọi được → fallback parser cục bộ để demo không gãy
      parsed = parseDirective(text);
      setModel("tnth-kpi-v1 (mô phỏng cục bộ)");
    }
    // Giữ spinner tối thiểu 1.2s cho mượt (AI thật sẽ chậm hơn sẵn)
    const elapsed = Date.now() - started;
    if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed));
    const firstLine = text.split("\n").map((s) => s.trim()).find(Boolean) ?? "";
    const derivedTitle = firstLine.replace(/^\s*[-–•*]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").slice(0, 90);
    setTaskTitle(derivedTitle || "Nhiệm vụ trích từ công văn");
    setDrafts(parsed.map((d) => ({ ...d, selected: true, dueDate: d.dueDate || addDaysISO(14) })));
    setSelectedUnits([]);
    setAnalyzing(false);
    if (parsed.length === 0) {
      toast("AI không tìm thấy chỉ tiêu nào — thử dán nội dung có số liệu và hạn cụ thể.", "warning");
    }
  };

  const patchDraft = (idx: number, patch: Partial<EditableDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const toggleUnit = (id: number) => {
    setSelectedUnits((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!session) return;
    const metrics = selectedDrafts.map((d) => ({
      name: d.metricName,
      unit: d.unit,
      targetValue: d.targetValue,
      aggregationType: d.aggregationType,
    }));
    const result = store.createDirectiveTask(session, {
      title: taskTitle.trim() || "Nhiệm vụ trích từ công văn",
      description: `AI lượng hoá từ nội dung công văn${sourceDocNumber ? ` số ${sourceDocNumber}` : ""} (${metrics.length} chỉ tiêu).`,
      dueDate: commonDueDate || addDaysISO(14),
      metrics,
      targetOrgUnitIds: selectedUnits,
      sourceDocNumber: sourceDocNumber.trim() || undefined,
    });
    setDone({ taskId: result.taskId, assignmentCount: result.assignmentIds.length });
    toast(`Đã tạo nhiệm vụ với ${metrics.length} chỉ tiêu, giao cho ${selectedUnits.length} đơn vị.`, "success");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif-display text-xl font-bold text-stone-900">
            <Sparkles className="h-5 w-5 text-doan-600" /> AI phân tích công văn
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Dán nội dung công văn — AI lượng hoá thành chỉ tiêu KPI để giao xuống đơn vị cơ sở.
          </p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] text-stone-500" title="Model AI đang phục vụ — đổi tại src/app/api/ai/phan-tich-cong-van/route.ts">
          {model}
        </span>
      </div>

      {done ? (
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-800">Đã giao nhiệm vụ thành công</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                {selectedDrafts.length} chỉ tiêu × {selectedUnits.length} đơn vị · hạn chung {commonDueDate || addDaysISO(14)}.
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                <BellRing className="h-3.5 w-3.5" /> Nhắc việc đã tự sinh — kiểm tra chuông thông báo.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/quan-tri/nhiem-vu">
                <Button>Danh sách nhiệm vụ <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Button variant="secondary" onClick={resetAll}>Phân tích công văn khác</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* ===== Bước 1 — Dán công văn ===== */}
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={STEP_BADGE}>1</span>
                <p className={STEP_TITLE}>Dán nội dung công văn</p>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "Ví dụ:\nPhấn đấu đạt 1.200 lượt đoàn viên tham gia hoạt động tình nguyện, hoàn thành trước ngày 15/10/2026.\nMỗi trường phải tổ chức 3 sân chơi an toàn cho học sinh trong hè."
                }
                className="min-h-44 font-[15px] leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runAnalyze} disabled={analyzing || text.trim().length < 40}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "AI đang phân tích…" : "AI phân tích"}
                </Button>
                <Button variant="secondary" onClick={pasteDemo}>
                  <ClipboardPaste className="h-4 w-4" /> Dán mẫu
                </Button>
                <Button variant="ghost" onClick={resetAll}>
                  <Eraser className="h-4 w-4" /> Xoá
                </Button>
                {text.trim().length > 0 && text.trim().length < 40 ? (
                  <span className="text-[11px] text-amber-600">Cần ít nhất 40 ký tự để AI phân tích.</span>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {/* ===== Bước 2 — Rà soát chỉ tiêu ===== */}
          {drafts.length > 0 ? (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={STEP_BADGE}>2</span>
                  <p className={STEP_TITLE}>Rà soát chỉ tiêu AI dự thảo</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100">
                    AI chỉ dự thảo — sửa cho đúng trước khi giao.
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tên nhiệm vụ">
                    <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                  </Field>
                  <Field label="Số hiệu công văn (tùy chọn)">
                    <Input
                      value={sourceDocNumber}
                      onChange={(e) => setSourceDocNumber(e.target.value)}
                      placeholder="VD: 128/KH-TWĐ"
                    />
                  </Field>
                </div>
                <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-left text-[11px] uppercase tracking-wide text-stone-500">
                        <th className="w-10 px-3 py-2">Chọn</th>
                        <th className="px-3 py-2">Chỉ tiêu</th>
                        <th className="w-24 px-3 py-2">Chỉ số</th>
                        <th className="w-28 px-3 py-2">Đơn vị</th>
                        <th className="w-36 px-3 py-2">Hạn</th>
                        <th className="w-12 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {drafts.map((d, i) => (
                        <tr key={i} className={d.selected ? "" : "opacity-50"}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={(e) => patchDraft(i, { selected: e.target.checked })}
                              className="h-4 w-4 accent-doan-600"
                              aria-label={`Chọn chỉ tiêu ${i + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={d.metricName}
                              onChange={(e) => patchDraft(i, { metricName: e.target.value })}
                              className="h-8 text-[13px]"
                            />
                            {d.recipientHint ? (
                              <p className="mt-1 text-[10px] text-stone-400">Nhận về: {d.recipientHint}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={d.targetValue}
                              onChange={(e) => patchDraft(i, { targetValue: Number(e.target.value) })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={d.unit}
                              onChange={(e) => patchDraft(i, { unit: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={d.dueDate}
                              onChange={(e) => patchDraft(i, { dueDate: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                              className="rounded-md p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-500"
                              aria-label="Xoá chỉ tiêu"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* ===== Bước 3 — Chọn đơn vị nhận ===== */}
          {drafts.length > 0 ? (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className={STEP_BADGE}>3</span>
                  <p className={STEP_TITLE}>Chọn đơn vị nhận</p>
                  <span className="text-[11px] text-stone-400">({childUnits.length} đơn vị con trực tiếp)</span>
                </div>
                {childUnits.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs text-stone-400">
                    <Info className="h-3.5 w-3.5" /> Đơn vị của bạn chưa có đơn vị con trực tiếp.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {childUnits.map((u) => (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] ring-1 ring-stone-200 transition-colors hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUnits.includes(u.id)}
                            onChange={() => toggleUnit(u.id)}
                            className="h-4 w-4 accent-doan-600"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-stone-700">{u.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedUnits(childUnits.map((u) => u.id))}>
                        Chọn tất cả
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUnits([])}>
                        Bỏ chọn
                      </Button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          ) : null}

          {/* ===== Bước 4 — Tổng kết & giao ===== */}
          {drafts.length > 0 ? (
            <Card className="border-doan-100">
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className={STEP_BADGE}>4</span>
                  <p className={STEP_TITLE}>Tổng kết &amp; giao nhiệm vụ</p>
                </div>
                <p className="text-sm text-stone-600">
                  Sẽ tạo <strong>{selectedDrafts.length} chỉ tiêu</strong> ×{" "}
                  <strong>{selectedUnits.length} đơn vị</strong>
                  {commonDueDate ? (
                    <>
                      {" "}· hạn chung <strong>{commonDueDate}</strong>
                    </>
                  ) : null}
                  . Mỗi đơn vị nhận 1 lượt giao kèm đầy đủ chỉ tiêu và tự sinh nhắc việc khi tới hạn.
                </p>
                <Button onClick={submit} disabled={selectedDrafts.length === 0 || selectedUnits.length === 0}>
                  <Sparkles className="h-4 w-4" /> Giao nhiệm vụ ngay
                </Button>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
