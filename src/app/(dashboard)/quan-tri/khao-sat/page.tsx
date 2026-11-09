"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  BarChart3,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Survey, SurveyQuestion, SurveyQuestionType, SurveyStatus, SurveyTally } from "@/types";
import {
  adminCreateSurvey,
  adminDeleteSurvey,
  adminFetchSurveyDetail,
  adminFetchSurveys,
  adminUpdateSurvey,
  slugify,
  type CreateSurveyPayload,
} from "@/lib/khao-sat";
import Link from "next/link";

export default function QuanTriKhaoSatPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const isTW = session?.role === "QUAN_TRI_TW";

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal tạo / sửa
  const [editOpen, setEditOpen] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<SurveyStatus>("DRAFT");
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formQuestions, setFormQuestions] = useState<SurveyQuestion[]>([]);
  const [formSaving, setFormSaving] = useState(false);

  // Modal xem kết quả / tallies
  const [viewDetailId, setViewDetailId] = useState<number | null>(null);
  const [detailSurvey, setDetailSurvey] = useState<Survey | null>(null);
  const [tallies, setTallies] = useState<SurveyTally[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSurveys = async () => {
    setLoading(true);
    const res = await adminFetchSurveys();
    if (res.ok) {
      setSurveys(res.surveys ?? []);
    } else {
      toast(res.error ?? "Không thể tải danh sách khảo sát", "warning");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isTW) {
      void loadSurveys();
    }
  }, [isTW]);

  const openCreateModal = () => {
    setEditingSurveyId(null);
    setFormTitle("");
    setFormCode("");
    setFormDesc("");
    setFormStatus("DRAFT");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormQuestions([
      {
        id: `q_1`,
        text: "",
        type: "SINGLE",
        options: ["Rất hài lòng", "Hài lòng", "Bình thường", "Chưa hài lòng"],
        required: true,
      },
    ]);
    setEditOpen(true);
  };

  const openEditModal = (s: Survey) => {
    setEditingSurveyId(s.id);
    setFormTitle(s.title);
    setFormCode(s.code);
    setFormDesc(s.description ?? "");
    setFormStatus(s.status);
    setFormStartsAt(s.startsAt ? s.startsAt.slice(0, 16) : "");
    setFormEndsAt(s.endsAt ? s.endsAt.slice(0, 16) : "");
    setFormQuestions(
      (s.questions ?? []).map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        text: q.text,
        type: q.type,
        options: q.options ? [...q.options] : [],
        required: q.required !== false,
      }))
    );
    setEditOpen(true);
  };

  const handleOpenResults = async (id: number) => {
    setViewDetailId(id);
    setDetailLoading(true);
    const res = await adminFetchSurveyDetail(id);
    setDetailLoading(false);
    if (res.ok && res.survey) {
      setDetailSurvey(res.survey);
      setTallies(res.tallies ?? []);
    } else {
      toast(res.error ?? "Không thể tải kết quả khảo sát", "warning");
      setViewDetailId(null);
    }
  };

  const handleDelete = async (s: Survey) => {
    if (s.status !== "DRAFT") {
      toast("Chỉ có thể xóa khảo sát ở trạng thái Bản nháp (DRAFT).", "warning");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa khảo sát "${s.title}"?`)) return;

    const res = await adminDeleteSurvey(s.id);
    if (res.ok) {
      toast("Đã xóa khảo sát thành công", "success");
      void loadSurveys();
    } else {
      toast(res.error ?? "Không thể xóa khảo sát", "warning");
    }
  };

  const handleQuickStatusChange = async (s: Survey, newStatus: SurveyStatus) => {
    const res = await adminUpdateSurvey({ id: s.id, status: newStatus });
    if (res.ok) {
      toast(`Đã đổi trạng thái khảo sát thành "${newStatus}"`, "success");
      void loadSurveys();
    } else {
      toast(res.error ?? "Lỗi cập nhật trạng thái", "warning");
    }
  };

  // Quản lý câu hỏi trong form
  const addQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        text: "",
        type: "SINGLE",
        options: ["Lựa chọn 1", "Lựa chọn 2"],
        required: true,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addOption = (qIdx: number) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      const currentOpts = next[qIdx].options ?? [];
      next[qIdx] = {
        ...next[qIdx],
        options: [...currentOpts, `Lựa chọn ${currentOpts.length + 1}`],
      };
      return next;
    });
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      const currentOpts = [...(next[qIdx].options ?? [])];
      currentOpts[optIdx] = value;
      next[qIdx] = { ...next[qIdx], options: currentOpts };
      return next;
    });
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      const currentOpts = (next[qIdx].options ?? []).filter((_, i) => i !== optIdx);
      next[qIdx] = { ...next[qIdx], options: currentOpts };
      return next;
    });
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast("Vui lòng nhập tiêu đề khảo sát.", "warning");
      return;
    }
    if (formQuestions.length === 0) {
      toast("Khảo sát phải có ít nhất 1 câu hỏi.", "warning");
      return;
    }

    setFormSaving(true);
    if (editingSurveyId) {
      const res = await adminUpdateSurvey({
        id: editingSurveyId,
        title: formTitle,
        code: formCode || undefined,
        description: formDesc,
        status: formStatus,
        startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : null,
        endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : null,
        questions: formQuestions,
      });
      setFormSaving(false);
      if (res.ok) {
        toast("Cập nhật khảo sát thành công!", "success");
        setEditOpen(false);
        void loadSurveys();
      } else {
        toast(res.error ?? "Lỗi cập nhật", "warning");
      }
    } else {
      const payload: CreateSurveyPayload = {
        title: formTitle,
        code: formCode || undefined,
        description: formDesc,
        status: formStatus,
        startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : undefined,
        endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : undefined,
        questions: formQuestions,
      };
      const res = await adminCreateSurvey(payload);
      setFormSaving(false);
      if (res.ok) {
        toast("Tạo khảo sát thành công!", "success");
        setEditOpen(false);
        void loadSurveys();
      } else {
        toast(res.error ?? "Lỗi tạo khảo sát", "warning");
      }
    }
  };

  if (!isTW) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
          <h3 className="text-base font-bold">Không có quyền truy cập</h3>
          <p className="mt-1 text-xs text-red-600">
            Chức năng quản trị và xem số liệu khảo sát xã hội chỉ dành cho tài khoản Quản trị viên Trung ương.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-[#C4161C]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">Quản lý Khảo sát ý kiến</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            Khởi tạo khảo sát xã hội, lắng nghe tâm tư đoàn viên và phân tích dữ liệu trực quan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F26522] to-[#C4161C] text-xs font-bold text-white shadow-xs hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Tạo khảo sát mới
          </Button>
        </div>
      </div>

      {/* Danh sách khảo sát */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-500">
          <Loader2 className="h-6 w-6 animate-spin text-[#F26522] mr-2" />
          <span className="text-xs font-medium">Đang tải danh sách khảo sát...</span>
        </div>
      ) : surveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-stone-300 mb-3" />
          <h3 className="text-sm font-bold text-stone-800">Chưa có khảo sát nào</h3>
          <p className="mt-1 text-xs text-stone-500">
            Bấm vào nút &ldquo;Tạo khảo sát mới&rdquo; để thiết lập khảo sát đầu tiên.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s) => {
            const isLive = s.status === "LIVE";
            const isDraft = s.status === "DRAFT";
            const isEnded = s.status === "ENDED";
            const respCount = s.responseCount ?? 0;
            const qCount = s.questions?.length ?? 0;

            return (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Đang mở (LIVE)
                      </span>
                    ) : isDraft ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        Bản nháp (DRAFT)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">
                        Đã đóng (ENDED)
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-stone-400">#{s.code}</span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">{s.title}</h3>
                  {s.description && (
                    <p className="mt-1.5 text-xs text-stone-500 line-clamp-2">{s.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1 font-semibold text-stone-800">
                      <Users className="h-3.5 w-3.5 text-stone-400" />
                      {respCount} câu trả lời
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <ClipboardList className="h-3.5 w-3.5 text-stone-400" />
                      {qCount} câu hỏi
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-stone-100 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => void handleOpenResults(s.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-orange-50 text-[#C4161C] hover:bg-orange-100 text-xs font-bold py-1.5"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Kết quả
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditModal(s)}
                      className="rounded-lg text-xs font-semibold py-1.5"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>

                    {isDraft && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDelete(s)}
                        className="rounded-lg text-xs font-semibold py-1.5"
                        title="Xóa khảo sát"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Nút chuyển trạng thái nhanh */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <Link
                      href={`/khao-sat/${s.code}`}
                      target="_blank"
                      className="text-stone-400 hover:text-stone-700 flex items-center gap-0.5"
                    >
                      Xem trang <ExternalLink className="h-3 w-3" />
                    </Link>

                    <div className="flex items-center gap-1">
                      {isDraft && (
                        <button
                          onClick={() => void handleQuickStatusChange(s, "LIVE")}
                          className="font-bold text-emerald-600 hover:underline"
                        >
                          Mở nhận ý kiến →
                        </button>
                      )}
                      {isLive && (
                        <button
                          onClick={() => void handleQuickStatusChange(s, "ENDED")}
                          className="font-bold text-stone-500 hover:underline"
                        >
                          Đóng khảo sát
                        </button>
                      )}
                      {isEnded && (
                        <button
                          onClick={() => void handleQuickStatusChange(s, "LIVE")}
                          className="font-bold text-emerald-600 hover:underline"
                        >
                          Mở lại
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL TẠO / SỬA KHẢO SÁT ================= */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editingSurveyId ? "Chỉnh sửa khảo sát" : "Tạo khảo sát mới"}
        wide
        className="max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={formSaving}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveSurvey}
              disabled={formSaving}
              className="bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white font-bold"
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingSurveyId ? "Lưu thay đổi" : "Tạo khảo sát"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSurvey} className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Tiêu đề khảo sát <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="VD: Khảo sát nhu cầu rèn luyện kỹ năng số của học sinh THPT năm 2026"
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Mã khảo sát (Slug URL) <span className="text-stone-400 font-normal">(để trống tự sinh)</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toLowerCase().trim())}
                placeholder="VD: ky-nang-so-2026"
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Trạng thái khảo sát</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as SurveyStatus)}
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
              >
                <option value="DRAFT">Bản nháp (DRAFT) — Chưa công khai</option>
                <option value="LIVE">Đang mở (LIVE) — Cho phép tham gia</option>
                <option value="ENDED">Đã kết thúc (ENDED) — Đóng nhận ý kiến</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Mô tả / Lời dẫn khảo sát</label>
              <textarea
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Mục đích khảo sát, đơn vị chủ trì, quyền lợi người tham gia..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Thời gian bắt đầu</label>
              <input
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Thời gian kết thúc</label>
              <input
                type="datetime-local"
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Builder câu hỏi */}
          <div className="pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4161C] flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Danh sách câu hỏi ({formQuestions.length})
              </h4>
              <Button
                type="button"
                size="sm"
                onClick={addQuestion}
                className="text-xs font-bold rounded-lg border border-[#F26522] text-[#C4161C] bg-white hover:bg-orange-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm câu hỏi
              </Button>
            </div>

            <div className="space-y-4">
              {formQuestions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-[#C4161C]">Câu {qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-stone-400 hover:text-red-600 transition-colors"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <div>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full rounded-xl border border-stone-300 bg-white p-2 text-xs font-semibold text-stone-900 focus:border-[#F26522] focus:outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value as SurveyQuestionType;
                          const patch: Partial<SurveyQuestion> = { type: newType };
                          if ((newType === "SINGLE" || newType === "MULTI") && (!q.options || q.options.length < 2)) {
                            patch.options = ["Lựa chọn 1", "Lựa chọn 2"];
                          }
                          updateQuestion(qIdx, patch);
                        }}
                        className="w-full rounded-xl border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-[#F26522] focus:outline-hidden"
                      >
                        <option value="SINGLE">Chọn 1 (Radio)</option>
                        <option value="MULTI">Chọn nhiều (Checkbox)</option>
                        <option value="TEXT">Tự luận (Text)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bắt buộc checkbox */}
                  <label className="inline-flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.required !== false}
                      onChange={(e) => updateQuestion(qIdx, { required: e.target.checked })}
                      className="rounded-sm text-[#C4161C] focus:ring-[#F26522]"
                    />
                    <span>Bắt buộc phải trả lời câu hỏi này</span>
                  </label>

                  {/* Options builder nếu type !== TEXT */}
                  {(q.type === "SINGLE" || q.type === "MULTI") && (
                    <div className="pl-3 border-l-2 border-stone-200 space-y-2 pt-1">
                      <div className="text-[11px] font-bold text-stone-500">Các đáp án lựa chọn:</div>
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-[11px] text-stone-400 font-mono w-4">{optIdx + 1}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 focus:border-[#F26522] focus:outline-hidden"
                            required
                          />
                          {(q.options?.length ?? 0) > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIdx, optIdx)}
                              className="text-stone-400 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {(q.options?.length ?? 0) < 10 && (
                        <button
                          type="button"
                          onClick={() => addOption(qIdx)}
                          className="text-[11px] font-bold text-[#F26522] hover:underline pt-1 inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Thêm đáp án
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL KẾT QUẢ / TALLIES ================= */}
      <Modal
        open={viewDetailId !== null}
        onClose={() => setViewDetailId(null)}
        title={detailSurvey ? `Kết quả: ${detailSurvey.title}` : "Thống kê khảo sát"}
        wide
        className="max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-stone-500">
              Tổng số người đã tham gia: <strong className="text-stone-800">{detailSurvey?.responseCount ?? 0}</strong>
            </span>
            <Button variant="secondary" onClick={() => setViewDetailId(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16 text-stone-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#F26522] mr-2" />
            <span className="text-xs font-medium">Đang tổng hợp dữ liệu...</span>
          </div>
        ) : !detailSurvey ? null : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {detailSurvey.description && (
              <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {detailSurvey.description}
              </p>
            )}

            {detailSurvey.questions?.map((q, idx) => {
              const tally = tallies.find((t) => t.questionId === q.id);
              const total = tally?.totalAnswered ?? 0;

              return (
                <div key={q.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                      Câu {idx + 1}: {q.text}
                    </h4>
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                      {total} câu trả lời
                    </span>
                  </div>

                  {/* Biểu đồ phần trăm cho SINGLE và MULTI */}
                  {(q.type === "SINGLE" || q.type === "MULTI") && q.options && (
                    <div className="space-y-2.5 mt-4">
                      {q.options.map((opt) => {
                        const count = tally?.optionCounts[opt] ?? 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                        return (
                          <div key={opt} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-stone-700">{opt}</span>
                              <span className="text-stone-500">
                                <strong>{count}</strong> ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#F26522] to-[#C4161C] transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Danh sách ý kiến tự luận cho TEXT */}
                  {q.type === "TEXT" && (
                    <div className="mt-3">
                      {(!tally || tally.textResponses.length === 0) ? (
                        <p className="text-xs text-stone-400 italic">Chưa có ý kiến phản hồi nào.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {tally.textResponses.map((txt, tIdx) => (
                            <div
                              key={tIdx}
                              className="rounded-xl border border-stone-100 bg-stone-50 p-2.5 text-xs text-stone-700 leading-relaxed"
                            >
                              {txt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
