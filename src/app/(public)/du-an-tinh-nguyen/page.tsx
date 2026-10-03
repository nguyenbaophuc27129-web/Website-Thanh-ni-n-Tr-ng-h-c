"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  MapPin, HeartHandshake, Users, Send, Loader2, Clock, Plus, MapPinned, HandHeart, Landmark, FileDown, Paperclip, X,
} from "lucide-react";
import { Reveal, CountUp } from "@/components/public/reveal";
import { SponsorStrip } from "@/components/public/sponsor-strip";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { moderateText } from "@/lib/ai-moderation";
import { buildTemplateWordData, downloadWordDoc } from "@/lib/word-export";
import { relTime } from "@/lib/utils";
import type { VolunteerProject } from "@/types";

/** Tọa độ pin % trên ảnh bản đồ 34 tỉnh (public/vn-map-34.jpg 1200×1485) */
const PROVINCE_PINS: Record<string, { x: number; y: number }> = {
  "Lào Cai": { x: 18, y: 16 },
  "Hà Nội": { x: 21, y: 21 },
  "Bắc Giang": { x: 22, y: 19 },
  "Nghệ An": { x: 26, y: 36 },
  "Đà Nẵng": { x: 38, y: 47 },
  "Bình Dương": { x: 28.5, y: 63 },
  "TP Hồ Chí Minh": { x: 27, y: 65 },
  "Cần Thơ": { x: 22, y: 71 },
  "Bến Tre": { x: 25, y: 73 },
};

const PROVINCE_OPTIONS = Object.keys(PROVINCE_PINS);

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

export default function DuAnTinhNguyenPage() {
  const { volunteerProjects, orgName, submitVolunteerProject } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [openSubmit, setOpenSubmit] = useState(false);
  const [pName, setPName] = useState("");
  const [pProvince, setPProvince] = useState(PROVINCE_OPTIONS[0]);
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

  // Aggregate theo tỉnh — 1 pin/tỉnh, badge số dự án nếu >1
  const byProvince = useMemo(() => {
    const map = new Map<string, { count: number; participants: number }>();
    for (const p of approved) {
      const cur = map.get(p.province) ?? { count: 0, participants: 0 };
      cur.count += 1;
      cur.participants += p.participants;
      map.set(p.province, cur);
    }
    return map;
  }, [approved]);

  const shown = useMemo(
    () => (provinceFilter ? approved.filter((p) => p.province === provinceFilter) : approved),
    [approved, provinceFilter]
  );

  const totalParticipants = approved.reduce((s, p) => s + p.participants, 0);
  const myPending = volunteerProjects.filter(
    (p) => p.status === "PENDING" && p.submittedByAccountId === session?.accountId
  );

  const openForm = () => {
    if (!session) {
      toast("Bạn cần đăng nhập để tiếp nhận dự án. Tài khoản demo: dv.demo / demo123", "warning");
      return;
    }
    setOpenSubmit(true);
  };

  const pickProvince = (prov: string) => {
    setPProvince(prov);
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
        mapX: PROVINCE_PINS[pProvince]?.x ?? 25,
        mapY: PROVINCE_PINS[pProvince]?.y ?? 45,
        reportFile: pReportFile ?? undefined,
      },
      mod
    );
    setBusy(false);
    setOpenSubmit(false);
    setPName(""); setPSummary(""); setPBeneficiaries(""); setPParticipants("50"); setPReportFile(null);
    toast(
      mod.verdict === "CLEAN"
        ? "Đã tiếp nhận dự án — chờ cấp trên duyệt, được duyệt sẽ hiển thị trên bản đồ (+20 điểm)."
        : `AI gắn cờ nội dung (${mod.reason ?? "đáng ngờ"}) — dự án chờ kiểm duyệt thủ công.`,
      mod.verdict === "CLEAN" ? "success" : "warning"
    );
  };

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
            Mỗi trường THPT — 01 dự án tình nguyện vì cộng đồng
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/90 sm:text-base">
            Bản đồ dự án toàn quốc: mỗi trường xây dựng tối thiểu 1 dự án tình nguyện mỗi năm học —
            có mục tiêu đo lường được, có kết quả kiểm chứng và hiển thị công khai trên Cổng TNTH.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-10">
        {/* ===== Stats 3 ô ===== */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: HeartHandshake, label: "Dự án đã duyệt", value: approved.length, suffix: " dự án" },
            { icon: Users, label: "Lượt đoàn viên tham gia", value: totalParticipants, suffix: " bạn" },
            { icon: MapPin, label: "Tỉnh thành có dự án", value: byProvince.size, suffix: `/${PROVINCE_OPTIONS.length} tỉnh` },
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

        {/* ===== Bản đồ dự án ===== */}
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                <MapPinned className="h-5 w-5 text-blue-600" /> Bản đồ dự án 34 tỉnh thành
              </h2>
              {provinceFilter ? (
                <button
                  type="button"
                  onClick={() => setProvinceFilter(null)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Bỏ lọc: {provinceFilter} ✕
                </button>
              ) : (
                <p className="text-[11px] text-slate-400">Nhấn pin để xem dự án theo tỉnh</p>
              )}
            </div>
            <div className="relative mt-4 overflow-hidden rounded-3xl bg-white p-2 shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/vn-map-34.jpg"
                alt="Bản đồ Việt Nam 34 tỉnh thành"
                className="w-full rounded-2xl"
                draggable={false}
              />
              {approved.map((p) => {
                const agg = byProvince.get(p.province);
                if (!agg) return null;
                // 1 pin / tỉnh — chỉ render pin cho dự án có id nhỏ nhất của tỉnh
                const isFirstOfProvince = !approved.some((q) => q.province === p.province && q.id < p.id);
                if (!isFirstOfProvince) return null;
                const pos = PROVINCE_PINS[p.province] ?? { x: p.mapX, y: p.mapY };
                const active = provinceFilter === p.province;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvinceFilter(active ? null : p.province)}
                    title={`${p.province} — ${agg.count} dự án`}
                    className="group absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-lg transition-transform group-hover:scale-110 ${
                        active ? "bg-red-500 ring-2 ring-red-200" : "bg-blue-600"
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {agg.count > 1 ? agg.count : ""}
                    </span>
                    {active || agg.count <= 1 ? (
                      <span
                        className={`absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 ${
                          active ? "bg-red-500" : "bg-blue-600"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== Cột phải: nút tiếp nhận + list chờ duyệt ===== */}
          <div className="space-y-5 lg:col-span-2">
            <button
              type="button"
              onClick={openForm}
              className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-left text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Plus className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Tiếp nhận dự án của trường bạn</span>
                <span className="block text-[11px] text-blue-100">
                  Đăng nhập → điền form → AI kiểm duyệt → cấp trên duyệt đăng bản đồ
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

        {/* ===== Grid thẻ dự án ===== */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">
            {provinceFilter ? `Dự án tại ${provinceFilter}` : "Dự án mới nhất"}{" "}
            <span className="text-sm font-medium text-slate-400">({shown.length})</span>
          </h2>
          {shown.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
              Chưa có dự án đã duyệt ở khu vực này.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:ring-blue-200">
                    <div className="flex items-center gap-2">
                      <Badge tone="blue">{p.province}</Badge>
                      <span className="text-[11px] text-slate-400">{p.schoolName}</span>
                    </div>
                    <h3 className="mt-2.5 text-sm font-bold leading-snug text-stone-900">{p.projectName}</h3>
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
      </div>

      {/* ===== Modal tiếp nhận dự án ===== */}
      <Modal
        open={openSubmit}
        onClose={() => !busy && setOpenSubmit(false)}
        title="Tiếp nhận dự án tình nguyện"
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
              {busy ? "AI đang kiểm duyệt…" : "Gửi tiếp nhận"}
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
          <Field label="Tỉnh thành" hint="Chọn tỉnh — vị trí pin trên bản đồ tự điền theo tỉnh">
            <Select value={pProvince} onChange={(e) => pickProvince(e.target.value)}>
              {PROVINCE_OPTIONS.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </Select>
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
            Dự án qua AI kiểm duyệt tự động, sau đó cấp trên duyệt sẽ hiển thị pin trên bản đồ toàn quốc
            và cộng 20 điểm đóng góp cho bạn.
          </p>
        </div>
      </Modal>

      <SponsorStrip />
    </div>
  );
}
