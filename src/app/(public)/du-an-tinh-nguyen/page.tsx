"use client";

import { useMemo, useRef, useState } from "react";
import {
  LibraryBig, HeartHandshake, Users, Send, Loader2, Clock, Plus, HandHeart, Landmark, FileDown, Paperclip, X, Search,
} from "lucide-react";
import { Reveal, CountUp } from "@/components/public/reveal";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { moderateText } from "@/lib/ai-moderation";
import { buildTemplateWordData, downloadWordDoc } from "@/lib/word-export";
import { relTime } from "@/lib/utils";
import { FIELD_META, PHASE_META } from "@/lib/volunteer-meta";
import type { VolunteerProject, VolunteerProjectField, VolunteerProjectPhase } from "@/types";

/** Danh sách tỉnh thành đơn vị có thể chọn khi đăng dự án */
const PROVINCE_OPTIONS = [
  "Lào Cai", "Hà Nội", "Bắc Giang", "Nghệ An", "Đà Nẵng",
  "Bình Dương", "TP Hồ Chí Minh", "Cần Thơ", "Bến Tre",
];

const REPORT_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Chip đính kèm file báo cáo (card + khối chờ duyệt dùng chung) */
function ReportFileChip({ p }: { p: Pick<VolunteerProject, "reportFile"> }) {
  const file = p.reportFile;
  if (!file?.name) return null;
  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2.5 pr-3 text-[11px] font-medium text-slate-600">
      <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
      {file.dataUrl ? (
        <a href={file.dataUrl} download={file.name} className="max-w-56 truncate text-blue-600 hover:underline" title={`Tải ${file.name}`}>
          {file.name}
        </a>
      ) : (
        <span className="max-w-56 truncate">{file.name}</span>
      )}
    </span>
  );
}

type PhaseFilter = "ALL" | VolunteerProjectPhase;

export default function DuAnTinhNguyenPage() {
  const { volunteerProjects, orgName, submitVolunteerProject } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const [fieldFilter, setFieldFilter] = useState<VolunteerProjectField | "ALL">("ALL");
  const [provinceFilter, setProvinceFilter] = useState<string>("ALL");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("ALL");

  const [openSubmit, setOpenSubmit] = useState(false);
  const [pName, setPName] = useState("");
  const [pProvince, setPProvince] = useState(PROVINCE_OPTIONS[0]);
  const [pField, setPField] = useState<VolunteerProjectField>("KHAC");
  const [pPhase, setPPhase] = useState<VolunteerProjectPhase>("DANG_TRIEN_KHAI");
  const [pSummary, setPSummary] = useState("");
  const [pBeneficiaries, setPBeneficiaries] = useState("");
  const [pParticipants, setPParticipants] = useState("50");
  const [pReportFile, setPReportFile] = useState<{ name: string; dataUrl?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const approved = useMemo(
    () => volunteerProjects.filter((p) => p.status === "APPROVED"),
    [volunteerProjects]
  );

  const provincesInBank = useMemo(() => new Set(approved.map((p) => p.province)), [approved]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return approved.filter((p) => {
      if (fieldFilter !== "ALL" && p.field !== fieldFilter) return false;
      if (provinceFilter !== "ALL" && p.province !== provinceFilter) return false;
      if (phaseFilter !== "ALL" && p.phase !== phaseFilter) return false;
      if (needle) {
        const hay = `${p.projectName} ${p.schoolName} ${p.summary} ${p.beneficiaries}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [approved, q, fieldFilter, provinceFilter, phaseFilter]);

  const totalParticipants = approved.reduce((s, p) => s + p.participants, 0);
  const recruitingCount = approved.filter((p) => p.phase === "DANG_TUYEN").length;
  const myPending = volunteerProjects.filter(
    (p) => p.status === "PENDING" && p.submittedByAccountId === session?.accountId
  );

  const openForm = () => {
    if (!session) {
      toast("Bạn cần đăng nhập để đăng ký dự án. Tài khoản demo: dv.demo / demo123", "warning");
      return;
    }
    setOpenSubmit(true);
  };

  /** Tải mẫu văn bản báo cáo phương pháp thực hiện (Word thể thức hành chính) */
  const downloadTemplate = () => {
    const data = buildTemplateWordData({
      orgUnitName: session?.orgUnitName ?? "ĐOÀN TRƯỜNG / CƠ SỞ",
      docCode: "MẪU",
      title: "BÁO CÁO PHƯƠNG PHÁP THỰC HIỆN DỰ ÁN TÌNH NGUYỆN VÌ CỘNG ĐỒNG",
      bases: [
        "Điều lệ Đoàn TNCS Hồ Chí Minh",
        "Nghị quyết Đại hội Đoàn TNCS Hồ Chí Minh khoá XII, nhiệm kỳ 2022 - 2027",
        "Kế hoạch phong trào tình nguyện của đơn vị năm học hiện hành",
      ],
      outline: [
        "II. THÔNG TIN CHUNG DỰ ÁN",
        "III. MỤC TIÊU VÀ ĐỐI TƯỢNG THỤ HƯỞNG",
        "IV. PHƯƠNG PHÁP VÀ TIẾN TRÌNH THỰC HIỆN",
        "V. NGUỒN LỰC VÀ KINH PHÍ",
        "VI. KẾT QUẢ, ĐÁNH GIÁ VÀ BÀI HỌC KINH NGHIỆM",
      ],
      signerName: session?.contactPerson ?? "…",
      signerPosition: session?.contactPosition ?? "BÍ THƯ ĐOÀN TRƯỜNG",
      recipients: ["Ban Thanh niên Trường học cấp trên trực tiếp", "Lưu: VT.Đoàn trường"],
    });
    downloadWordDoc("mau-bao-cao-du-an-tinh-nguyen.doc", data);
    toast("Đã tải mẫu báo cáo — điền nội dung rồi đính kèm lại khi gửi dự án.", "info");
  };

  const pickReportFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > REPORT_FILE_MAX_BYTES) {
      toast(`File "${file.name}" vượt 5MB — hãy nén hoặc chọn file nhỏ hơn.`, "warning");
    } else {
      const reader = new FileReader();
      reader.onload = () => setPReportFile({ name: file.name, dataUrl: String(reader.result) });
      reader.onerror = () => toast(`Không đọc được file "${file.name}".`, "warning");
      reader.readAsDataURL(file);
    }
    if (reportInputRef.current) reportInputRef.current.value = "";
  };

  const submitProject = async () => {
    if (!session) return;
    if (pName.trim().length < 8 || pSummary.trim().length < 20) {
      toast("Cần tên dự án tối thiểu 8 ký tự và tóm tắt tối thiểu 20 ký tự.", "warning");
      return;
    }
    setBusy(true);
    const mod = await moderateText(`${pName}\n${pSummary}`);
    submitVolunteerProject(
      session,
      {
        orgUnitId: session.orgUnitId,
        schoolName: orgName(session.orgUnitId),
        province: pProvince,
        projectName: pName,
        summary: pSummary,
        beneficiaries: pBeneficiaries || "Cộng đồng địa phương",
        participants: Number(pParticipants) || 1,
        field: pField,
        phase: pPhase,
        reportFile: pReportFile ?? undefined,
      },
      mod
    );
    setBusy(false);
    setOpenSubmit(false);
    setPName(""); setPSummary(""); setPBeneficiaries(""); setPParticipants("50"); setPReportFile(null);
    toast(
      mod.verdict === "CLEAN"
        ? "Đã tiếp nhận dự án — chờ cấp trên duyệt, được duyệt sẽ đăng vào ngân hàng dự án (+20 điểm)."
        : `AI gắn cờ nội dung (${mod.reason ?? "đáng ngờ"}) — dự án chờ kiểm duyệt thủ công.`,
      mod.verdict === "CLEAN" ? "success" : "warning"
    );
  };

  const hasFilter = q.trim() !== "" || fieldFilter !== "ALL" || provinceFilter !== "ALL" || phaseFilter !== "ALL";

  return (
    <div>
      {/* ===== Hero đêm ===== */}
      <section className="relative overflow-hidden bg-[#040b1c] text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl hero-glow-1" />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl hero-glow-2" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            Đang hoạt động
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Ngân hàng dự án tình nguyện
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/90 sm:text-base">
            Kho dự án tình nguyện của thanh niên trường học toàn quốc: mỗi trường xây dựng tối thiểu
            01 dự án mỗi năm học — có mục tiêu đo lường được, có kết quả kiểm chứng, tra cứu theo
            lĩnh vực và giai đoạn triển khai.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-10">
        {/* ===== Stats 4 ô ===== */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: LibraryBig, label: "Dự án trong kho", value: approved.length, suffix: " dự án" },
            { icon: Users, label: "Lượt đoàn viên tham gia", value: totalParticipants, suffix: " bạn" },
            { icon: HeartHandshake, label: "Tỉnh thành có dự án", value: provincesInBank.size, suffix: " tỉnh" },
            { icon: HandHeart, label: "Đang tuyển thành viên", value: recruitingCount, suffix: " dự án" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    <CountUp value={s.value} />
                    <span className="text-sm font-bold text-slate-400">{s.suffix}</span>
                  </p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ===== Thanh tra cứu ngân hàng dự án ===== */}
        <div className="mt-10 rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm tên dự án, đơn vị, đối tượng thụ hưởng…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <select
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value as VolunteerProjectField | "ALL")}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-stone-700 outline-none focus:border-blue-300 focus:bg-white"
            >
              <option value="ALL">Mọi lĩnh vực</option>
              {(Object.keys(FIELD_META) as VolunteerProjectField[]).map((k) => (
                <option key={k} value={k}>{FIELD_META[k].label}</option>
              ))}
            </select>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-stone-700 outline-none focus:border-blue-300 focus:bg-white"
            >
              <option value="ALL">Mọi tỉnh thành</option>
              {[...provincesInBank].sort((a, b) => a.localeCompare(b, "vi")).map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {([
              { value: "ALL", label: "Tất cả giai đoạn" },
              { value: "DANG_TUYEN", label: "Đang tuyển thành viên" },
              { value: "DANG_TRIEN_KHAI", label: "Đang triển khai" },
              { value: "HOAN_THANH", label: "Hoàn thành" },
            ] as { value: PhaseFilter; label: string }[]).map((ph) => (
              <button
                key={ph.value}
                type="button"
                onClick={() => setPhaseFilter(ph.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  phaseFilter === ph.value
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {ph.label}
              </button>
            ))}
            {hasFilter ? (
              <button
                type="button"
                onClick={() => { setQ(""); setFieldFilter("ALL"); setProvinceFilter("ALL"); setPhaseFilter("ALL"); }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 underline decoration-dotted hover:text-slate-600"
              >
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
        </div>

        {/* ===== Grid thẻ dự án + cột phải ===== */}
        <div className="mt-8 grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold text-slate-900">
              {hasFilter ? "Kết quả tra cứu" : "Dự án mới nhất"}{" "}
              <span className="text-sm font-medium text-slate-400">({shown.length})</span>
            </h2>
            {shown.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
                Không có dự án nào khớp bộ lọc — thử bỏ bớt điều kiện tra cứu.
              </p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {shown.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i, 6) * 60}>
                    <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:ring-blue-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={FIELD_META[p.field]?.tone ?? "gray"}>
                          {FIELD_META[p.field]?.label ?? p.field}
                        </Badge>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${PHASE_META[p.phase]?.cls ?? ""}`}
                        >
                          {p.phase === "DANG_TUYEN" ? (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                            </span>
                          ) : null}
                          {PHASE_META[p.phase]?.label ?? p.phase}
                        </span>
                      </div>
                      <h3 className="mt-2.5 text-sm font-bold leading-snug text-stone-900">{p.projectName}</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {p.schoolName} · {p.province}
                      </p>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-stone-500">{p.summary}</p>
                      <ReportFileChip p={p} />
                      <div className="mt-auto flex items-center gap-4 pt-3.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-blue-500" /> {p.participants} đoàn viên
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HandHeart className="h-3.5 w-3.5 text-emerald-500" /> {p.beneficiaries}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          {/* ===== Cột phải: nút đăng ký + list chờ duyệt + tiêu chí ===== */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={openForm}
              className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-left text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Plus className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Đăng ký dự án của trường bạn</span>
                <span className="block text-[11px] text-blue-100">
                  Đăng nhập → điền form → AI kiểm duyệt → cấp trên duyệt đăng kho dự án
                </span>
              </span>
            </button>

            {myPending.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Clock className="h-3.5 w-3.5" /> Dự án của bạn chờ duyệt ({myPending.length})
                </p>
                <ul className="mt-2.5 space-y-2">
                  {myPending.map((p) => (
                    <li key={p.id} className="rounded-xl bg-white/80 px-3 py-2">
                      <p className="truncate text-sm font-medium text-stone-800">{p.projectName}</p>
                      <p className="text-[11px] text-stone-500">
                        {p.province} · gửi {relTime(p.createdAt)}
                        {p.aiVerdict === "FLAGGED" ? " · AI gắn cờ, chờ kiểm duyệt thủ công" : ""}
                      </p>
                      <ReportFileChip p={p} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100">
              <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Tiêu chí một dự án tốt
              </p>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
                <li className="flex gap-2"><HandHeart className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Giải quyết vấn đề thật của cộng đồng, đo lường được kết quả.</li>
                <li className="flex gap-2"><Landmark className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /> Có minh chứng hình ảnh và danh sách người thụ hưởng rõ ràng.</li>
                <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /> Đoàn viên tham gia có đăng ký, có xác nhận trên cổng.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal đăng ký dự án ===== */}
      <Modal
        open={openSubmit}
        onClose={() => !busy && setOpenSubmit(false)}
        title="Đăng ký dự án tình nguyện"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpenSubmit(false)}
              disabled={busy}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitProject}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "AI đang kiểm duyệt…" : "Gửi đăng ký"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
            Đơn vị thực hiện: <b>{orgName(session?.orgUnitId ?? 0)}</b> (lấy từ tài khoản của bạn)
          </div>
          <Field label="Tên dự án" required hint="Tối thiểu 8 ký tự">
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Ví dụ: Đồng quản lý kênh Nông Trại xanh" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tỉnh thành">
              <Select value={pProvince} onChange={(e) => setPProvince(e.target.value)}>
                {PROVINCE_OPTIONS.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lĩnh vực hoạt động">
              <Select value={pField} onChange={(e) => setPField(e.target.value as VolunteerProjectField)}>
                {(Object.keys(FIELD_META) as VolunteerProjectField[]).map((k) => (
                  <option key={k} value={k}>{FIELD_META[k].label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Giai đoạn hiện tại">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PHASE_META) as VolunteerProjectPhase[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPPhase(k)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    pPhase === k
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {PHASE_META[k].label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tóm tắt dự án" required hint="Tối thiểu 20 ký tự — nêu rõ việc làm và kết quả đo được">
            <Textarea value={pSummary} onChange={(e) => setPSummary(e.target.value)} className="min-h-24" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Người thụ hưởng">
              <Input value={pBeneficiaries} onChange={(e) => setPBeneficiaries(e.target.value)} placeholder="VD: 450 hộ dân ven kênh" />
            </Field>
            <Field label="Số đoàn viên tham gia">
              <Input type="number" min={1} value={pParticipants} onChange={(e) => setPParticipants(e.target.value)} />
            </Field>
          </div>
          <Field label="File báo cáo phương pháp thực hiện (không bắt buộc)" hint=".pdf/.doc/.docx · tối đa 5MB — có thể tải mẫu về điền">
            <div className="space-y-2">
              <input ref={reportInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => pickReportFile(e.target.files)} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => reportInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-3.5 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Chọn file báo cáo
                </button>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3.5 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                >
                  <FileDown className="h-3.5 w-3.5" /> Tải mẫu báo cáo (.doc)
                </button>
              </div>
              {pReportFile ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[11px] font-medium text-blue-700">
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-56 truncate">{pReportFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setPReportFile(null)}
                    className="rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                    aria-label="Xóa file đã chọn"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </div>
          </Field>
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-700">
            Dự án qua AI kiểm duyệt tự động, sau đó cấp trên duyệt sẽ đăng vào ngân hàng dự án tình nguyện
            và cộng 20 điểm đóng góp cho bạn.
          </p>
        </div>
      </Modal>
    </div>
  );
}
