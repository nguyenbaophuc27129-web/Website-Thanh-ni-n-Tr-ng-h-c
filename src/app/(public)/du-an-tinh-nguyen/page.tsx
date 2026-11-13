"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LibraryBig, HeartHandshake, Users, Send, Loader2, Clock, Plus, HandHeart, Landmark, Paperclip,
  Search, CalendarDays, Flag, Trash2, ListOrdered, Mail, Phone, Share2, Globe, MailCheck, Check, UserCheck,
} from "lucide-react";
import { Reveal, CountUp } from "@/components/public/reveal";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { relTime } from "@/lib/utils";
import { FIELD_META, PHASE_META } from "@/lib/volunteer-meta";
import type { VolunteerProject, VolunteerProjectField, VolunteerProjectPhase, VolunteerProjectPhaseEntry } from "@/types";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface GoogleIdNs {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

/** Giải mã Google JWT client-side để hiển thị thông tin email/tên */
function decodeGoogleJwt(cred: string): { email?: string; name?: string } {
  try {
    const payload = cred.split(".")[1];
    if (!payload) return {};
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    return { email: json.email, name: json.name };
  } catch {
    return {};
  }
}

/** 34 đơn vị hành chính cấp tỉnh (mô hình chính quyền 2 cấp, hiệu lực 01/7/2025) */
const PROVINCE_OPTIONS = [
  "An Giang", "Bắc Ninh", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
  "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Nội",
  "Hà Tĩnh", "Hải Phòng", "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ",
  "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
  "Thái Nguyên", "Thanh Hóa", "TP. Hồ Chí Minh", "Tuyên Quang", "Vĩnh Long",
];

/** Chip đính kèm file báo cáo (legacy — form tự khai mới không còn upload file) */
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

  // State xác thực Google
  const [gAuthOpen, setGAuthOpen] = useState(false);
  const [gAuthPurpose, setGAuthPurpose] = useState<"SUBMIT_PROJECT" | "JOIN_PROJECT">("SUBMIT_PROJECT");
  const credRef = useRef<string>("");
  const [googleEmail, setGoogleEmail] = useState<string>("");
  const [googleName, setGoogleName] = useState<string>("");
  const gBtnRef = useRef<HTMLDivElement | null>(null);

  // Form đăng ký dự án mới
  const [openSubmit, setOpenSubmit] = useState(false);
  const [pSchoolName, setPSchoolName] = useState("");
  const [pName, setPName] = useState("");
  const [pProvince, setPProvince] = useState(PROVINCE_OPTIONS[0]);
  const [pWard, setPWard] = useState("");
  const [pField, setPField] = useState<VolunteerProjectField>("KHAC");
  const [pPhase, setPPhase] = useState<VolunteerProjectPhase>("DANG_TRIEN_KHAI");
  const [pSummary, setPSummary] = useState("");
  const [pObjectives, setPObjectives] = useState("");
  const [pTimeframe, setPTimeframe] = useState("");
  const [pBeneficiaries, setPBeneficiaries] = useState("");
  const [pParticipants, setPParticipants] = useState("50");
  const [pInitialResults, setPInitialResults] = useState("");
  const [pDirection, setPDirection] = useState("");
  const [pPhases, setPPhases] = useState<VolunteerProjectPhaseEntry[]>([]);
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pFacebook, setPFacebook] = useState("");
  const [pWebsite, setPWebsite] = useState("");
  const [busy, setBusy] = useState(false);

  // Form đoàn viên đăng ký tham gia dự án
  const [selectedProjectForJoin, setSelectedProjectForJoin] = useState<VolunteerProject | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [joinSchool, setJoinSchool] = useState("");
  const [joinNote, setJoinNote] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [localJoinedIds, setLocalJoinedIds] = useState<number[]>([]);

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
    (p) =>
      p.status === "PENDING" &&
      ((session?.accountId && p.submittedByAccountId === session.accountId) ||
        (googleEmail && p.submitterEmail?.toLowerCase() === googleEmail.toLowerCase()))
  );

  // Render nút Google GIS khi mở modal xác thực
  useEffect(() => {
    if (!gAuthOpen || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    const boot = () => {
      if (cancelled) return;
      const g = (window as unknown as { google?: GoogleIdNs }).google;
      if (!g || !gBtnRef.current) return;
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => {
          credRef.current = r.credential;
          const decoded = decodeGoogleJwt(r.credential);
          if (decoded.email) {
            setGoogleEmail(decoded.email);
            setPEmail(decoded.email);
          }
          if (decoded.name) {
            setGoogleName(decoded.name);
            setJoinName(decoded.name);
          }
          setGAuthOpen(false);
          if (gAuthPurpose === "SUBMIT_PROJECT") {
            setOpenSubmit(true);
          } else if (gAuthPurpose === "JOIN_PROJECT") {
            setJoinModalOpen(true);
          }
        },
      });
      g.accounts.id.renderButton(gBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
        locale: "vi",
      });
    };
    const existing = document.getElementById("gsi-script");
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "gsi-script";
      script.onload = boot;
      document.head.appendChild(script);
    } else {
      boot();
    }
    return () => {
      cancelled = true;
    };
  }, [gAuthOpen, gAuthPurpose]);

  /** Mở form đăng ký dự án: ưu tiên session, nếu chưa có thì xác thực Google Gmail */
  const openForm = () => {
    if (!session && !credRef.current) {
      if (!GOOGLE_CLIENT_ID) {
        toast("Chưa cấu hình xác thực Gmail — liên hệ Ban Tổ chức.", "warning");
        return;
      }
      setGAuthPurpose("SUBMIT_PROJECT");
      setGAuthOpen(true);
      return;
    }
    if (session && !pEmail) {
      setPEmail(session.username);
    }
    setOpenSubmit(true);
  };

  /** Mở form đăng ký tham gia dự án */
  const handleOpenJoin = (project: VolunteerProject) => {
    setSelectedProjectForJoin(project);
    if (!session && !credRef.current) {
      if (!GOOGLE_CLIENT_ID) {
        toast("Chưa cấu hình xác thực Gmail — liên hệ Ban Tổ chức.", "warning");
        return;
      }
      setGAuthPurpose("JOIN_PROJECT");
      setGAuthOpen(true);
      return;
    }
    if (session) {
      setJoinName(session.contactPerson || "");
    } else if (googleName) {
      setJoinName(googleName);
    }
    setJoinModalOpen(true);
  };

  /** Gửi thông tin đăng ký tham gia dự án */
  const submitJoin = async () => {
    if (!selectedProjectForJoin) return;
    if (!joinName.trim()) {
      toast("Vui lòng điền họ và tên của bạn.", "warning");
      return;
    }
    setJoinBusy(true);
    try {
      const res = await fetch("/api/du-an/tham-gia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectForJoin.id,
          fullName: joinName.trim(),
          phone: joinPhone.trim() || undefined,
          schoolName: joinSchool.trim() || undefined,
          note: joinNote.trim() || undefined,
          credential: session ? undefined : credRef.current || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      setJoinBusy(false);
      if (!res.ok || !data?.ok) {
        toast(data?.error ?? "Không thể đăng ký tham gia. Vui lòng thử lại.", "warning");
        return;
      }
      setLocalJoinedIds((prev) => [...prev, selectedProjectForJoin.id]);
      setJoinModalOpen(false);
      setJoinNote("");
      toast(
        data.alreadyRegistered
          ? data.message
          : "Đăng ký tham gia dự án thành công! Thông tin của bạn đã được ghi nhận trên cổng.",
        "success"
      );
    } catch {
      setJoinBusy(false);
      toast("Lỗi kết nối máy chủ. Vui lòng thử lại.", "warning");
    }
  };

  /** Thêm một giai đoạn trống vào form tự khai */
  const addPhaseRow = () => setPPhases((prev) => [...prev, { at: "", content: "" }]);
  const updatePhaseRow = (idx: number, patch: Partial<VolunteerProjectPhaseEntry>) =>
    setPPhases((prev) => prev.map((ph, i) => (i === idx ? { ...ph, ...patch } : ph)));
  const removePhaseRow = (idx: number) => setPPhases((prev) => prev.filter((_, i) => i !== idx));

  const submitProject = async () => {
    if (!session && !credRef.current) {
      toast("Cần xác thực Google Gmail hoặc đăng nhập trước khi gửi dự án.", "warning");
      return;
    }
    if (pName.trim().length < 8 || pSummary.trim().length < 20) {
      toast("Cần tên dự án tối thiểu 8 ký tự và phần ý nghĩa dự án tối thiểu 20 ký tự.", "warning");
      return;
    }
    if (!pWard.trim()) {
      toast("Nhập xã / phường nơi thực hiện dự án.", "warning");
      return;
    }
    if (!session && !pSchoolName.trim()) {
      toast("Vui lòng nhập tên trường hoặc đơn vị của bạn.", "warning");
      return;
    }

    setBusy(true);
    const res = await submitVolunteerProject({
      province: pProvince,
      ward: pWard,
      schoolName: session ? undefined : pSchoolName.trim(),
      projectName: pName,
      summary: pSummary,
      objectives: pObjectives,
      timeframe: pTimeframe,
      beneficiaries: pBeneficiaries || "Cộng đồng địa phương",
      participants: Number(pParticipants) || 1,
      field: pField,
      phase: pPhase,
      initialResults: pInitialResults,
      direction: pDirection,
      phases: pPhases,
      contactEmail: pEmail.trim() || undefined,
      contactPhone: pPhone.trim() || undefined,
      contactFacebook: pFacebook.trim() || undefined,
      contactWebsite: pWebsite.trim() || undefined,
      credential: session ? undefined : credRef.current || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "warning");
      return;
    }
    setOpenSubmit(false);
    setPName(""); setPWard(""); setPSchoolName(""); setPSummary(""); setPObjectives(""); setPTimeframe("");
    setPBeneficiaries(""); setPParticipants("50"); setPInitialResults(""); setPDirection(""); setPPhases([]);
    setPPhone(""); setPFacebook(""); setPWebsite("");
    const clean = res.mod?.verdict !== "FLAGGED";
    toast(
      clean
        ? "Đã tiếp nhận dự án — chờ cấp trên duyệt, được duyệt sẽ đăng vào ngân hàng dự án (+20 điểm)."
        : `AI gắn cờ nội dung (${res.mod?.reason ?? "đáng ngờ"}) — dự án chờ kiểm duyệt thủ công.`,
      clean ? "success" : "warning"
    );
  };

  const hasFilter = q.trim() !== "" || fieldFilter !== "ALL" || provinceFilter !== "ALL" || phaseFilter !== "ALL";

  const effectiveEmail = session?.username || googleEmail || decodeGoogleJwt(credRef.current).email || "";

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
                        {p.schoolName} · {p.province}{p.ward ? ` · ${p.ward}` : ""}
                      </p>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-stone-500">{p.summary}</p>
                      {p.timeframe || (p.phases?.length ?? 0) > 0 ? (
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {p.timeframe ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 text-blue-500" /> {p.timeframe}
                            </span>
                          ) : null}
                          {(p.phases?.length ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <ListOrdered className="h-3 w-3 text-violet-500" /> {p.phases!.length} giai đoạn
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      <ReportFileChip p={p} />
                      {p.contactEmail || p.contactPhone || p.contactFacebook || p.contactWebsite ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                          {p.contactEmail ? (
                            <a href={`mailto:${p.contactEmail}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                              <Mail className="h-3 w-3" /> <span className="max-w-44 truncate">{p.contactEmail}</span>
                            </a>
                          ) : null}
                          {p.contactPhone ? (
                            <a href={`tel:${p.contactPhone}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                              <Phone className="h-3 w-3" /> {p.contactPhone}
                            </a>
                          ) : null}
                          {p.contactFacebook ? (
                            <a href={p.contactFacebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                              <Share2 className="h-3 w-3" /> Facebook
                            </a>
                          ) : null}
                          {p.contactWebsite ? (
                            <a href={p.contactWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                              <Globe className="h-3 w-3" /> Website
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 text-[11px] text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-blue-500" /> {p.participants + (localJoinedIds.includes(p.id) ? 1 : 0)} đoàn viên
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <HandHeart className="h-3.5 w-3.5 text-emerald-500" /> {p.beneficiaries}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenJoin(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all active:scale-95"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Tham gia
                        </button>
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
                  Xác thực Gmail / Đăng nhập → điền form → AI kiểm duyệt → cấp trên duyệt đăng kho dự án
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
                <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /> Đoàn viên tham gia có đăng ký, có xác nhận trên cổng (xác thực nhanh qua Gmail hoặc tài khoản).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal đăng ký dự án mới ===== */}
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
          <div className="rounded-lg bg-sky-50 px-3.5 py-2.5 text-xs text-sky-800">
            {session ? (
              <span>Đơn vị thực hiện: <b>{orgName(session.orgUnitId ?? 0)}</b> (lấy từ tài khoản của bạn)</span>
            ) : (
              <span>
                Xác thực bởi Gmail: <b>{effectiveEmail}</b> (không cần tạo tài khoản — sau này đăng ký tài khoản bằng email này sẽ tự động cộng điểm bù).
              </span>
            )}
          </div>

          {!session ? (
            <Field label="Tên trường / Đơn vị thực hiện" required hint="Tên trường THPT, TT GDNN - GDTX hoặc cơ sở Đoàn nơi bạn sinh hoạt">
              <Input
                value={pSchoolName}
                onChange={(e) => setPSchoolName(e.target.value)}
                placeholder="Ví dụ: Trường THPT Chuyên Lê Hồng Phong"
              />
            </Field>
          ) : null}

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
            <Field label="Xã / phường" required hint="Nơi trường bạn đặt và dự án triển khai">
              <Input value={pWard} onChange={(e) => setPWard(e.target.value)} placeholder="VD: Phường Bến Nghé" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lĩnh vực hoạt động">
              <Select value={pField} onChange={(e) => setPField(e.target.value as VolunteerProjectField)}>
                {(Object.keys(FIELD_META) as VolunteerProjectField[]).map((k) => (
                  <option key={k} value={k}>{FIELD_META[k].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Thời gian thực hiện">
              <Input value={pTimeframe} onChange={(e) => setPTimeframe(e.target.value)} placeholder="VD: 06/2026 — 08/2026" />
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
          <Field label="Ý nghĩa dự án" required hint="Tối thiểu 20 ký tự — nêu rõ việc làm và ý nghĩa với cộng đồng">
            <Textarea value={pSummary} onChange={(e) => setPSummary(e.target.value)} className="min-h-24" />
          </Field>
          <Field label="Mục tiêu">
            <Textarea value={pObjectives} onChange={(e) => setPObjectives(e.target.value)} className="min-h-20" placeholder="Mục tiêu dự án hướng đến, ưu tiên chỉ tiêu đo lường được…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Người thụ hưởng">
              <Input value={pBeneficiaries} onChange={(e) => setPBeneficiaries(e.target.value)} placeholder="VD: 450 hộ dân ven kênh" />
            </Field>
            <Field label="Số đoàn viên tham gia">
              <Input type="number" min={1} value={pParticipants} onChange={(e) => setPParticipants(e.target.value)} />
            </Field>
          </div>
          <Field label="Kết quả bước đầu" hint="Đơn vị tự khai — có thể cập nhật sau khi kết thúc giai đoạn">
            <Textarea value={pInitialResults} onChange={(e) => setPInitialResults(e.target.value)} className="min-h-20" />
          </Field>

          {/* Kênh liên hệ của dự án (tùy chọn) — hiển thị công khai trên thẻ dự án */}
          <Field label="Kênh liên hệ" hint="Không bắt buộc — người quan tâm sẽ liên hệ trực tiếp với dự án">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="Email liên hệ" type="email" className="text-xs" />
              <Input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="Số điện thoại liên hệ" className="text-xs" />
              <Input value={pFacebook} onChange={(e) => setPFacebook(e.target.value)} placeholder="Link fanpage Facebook" className="text-xs" />
              <Input value={pWebsite} onChange={(e) => setPWebsite(e.target.value)} placeholder="Website / trang thông tin" className="text-xs" />
            </div>
          </Field>

          {/* Các giai đoạn của dự án — tự bấm thêm từng giai đoạn */}
          <Field label="Các giai đoạn của dự án" hint="Bấm thêm từng giai đoạn: mốc thời gian + nội dung chính thực hiện">
            <div className="space-y-2.5">
              {pPhases.map((ph, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Flag className="h-3.5 w-3.5 text-blue-500" /> Giai đoạn {i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePhaseRow(i)}
                      className="rounded-full p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Xóa giai đoạn ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[180px_1fr]">
                    <Input value={ph.at} onChange={(e) => updatePhaseRow(i, { at: e.target.value })} placeholder="Mốc thời gian" className="text-xs" />
                    <Input value={ph.content} onChange={(e) => updatePhaseRow(i, { content: e.target.value })} placeholder="Nội dung chính thực hiện trong giai đoạn này" className="text-xs" />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPhaseRow}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-3.5 py-2.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm giai đoạn
              </button>
            </div>
          </Field>

          <Field label="Định hướng phát triển dự án" hint="Không bắt buộc — hướng đi, nhân rộng, phối hợp sau giai đoạn hiện tại">
            <Textarea value={pDirection} onChange={(e) => setPDirection(e.target.value)} className="min-h-16" />
          </Field>
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-700">
            Dự án qua AI kiểm duyệt tự động, sau đó cấp trên duyệt sẽ đăng vào ngân hàng dự án tình nguyện
            và cộng 20 điểm đóng góp cho bạn.
          </p>
        </div>
      </Modal>

      {/* ===== Modal đăng ký tham gia dự án ===== */}
      <Modal
        open={joinModalOpen}
        onClose={() => !joinBusy && setJoinModalOpen(false)}
        title="Đăng ký tham gia dự án tình nguyện"
        footer={
          <>
            <button
              type="button"
              onClick={() => setJoinModalOpen(false)}
              disabled={joinBusy}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitJoin}
              disabled={joinBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {joinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {joinBusy ? "Đang gửi đăng ký…" : "Xác nhận tham gia"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
            <p className="font-bold text-sm text-blue-950">{selectedProjectForJoin?.projectName}</p>
            <p className="mt-1 text-blue-800">
              Đơn vị: {selectedProjectForJoin?.schoolName} · {selectedProjectForJoin?.province}
              {selectedProjectForJoin?.ward ? ` · ${selectedProjectForJoin?.ward}` : ""}
            </p>
          </div>

          <Field label="Họ và tên" required hint="Họ và tên đoàn viên tham gia">
            <Input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
            />
          </Field>

          <Field label="Gmail xác thực" hint="Email đã xác thực thành công">
            <Input value={effectiveEmail} disabled className="bg-stone-100 text-stone-600 cursor-not-allowed" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số điện thoại" hint="Để đơn vị liên hệ điều phối">
              <Input
                value={joinPhone}
                onChange={(e) => setJoinPhone(e.target.value)}
                placeholder="VD: 0912345678"
              />
            </Field>
            <Field label="Trường / Lớp" hint="Trường học hoặc chi đoàn bạn sinh hoạt">
              <Input
                value={joinSchool}
                onChange={(e) => setJoinSchool(e.target.value)}
                placeholder="VD: 11A2, THPT Chu Văn An"
              />
            </Field>
          </div>

          <Field label="Lời nhắn / Ghi chú" hint="Không bắt buộc — mong muốn đóng góp hoặc kỹ năng của bạn">
            <Textarea
              value={joinNote}
              onChange={(e) => setJoinNote(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Em có kinh nghiệm thiết kế truyền thông và có thể tham gia vào các ngày cuối tuần…"
            />
          </Field>

          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800">
            Đoàn viên đăng ký tham gia có xác nhận trên cổng. Sau này khi bạn đăng ký tài khoản Đoàn viên bằng Gmail này,
            hệ thống sẽ tự động liên kết thành tích và cộng điểm bù cho bạn.
          </p>
        </div>
      </Modal>

      {/* ===== Modal xác thực Gmail (Google Identity Services) ===== */}
      <Modal
        open={gAuthOpen}
        onClose={() => setGAuthOpen(false)}
        title={
          gAuthPurpose === "SUBMIT_PROJECT"
            ? "Xác thực Gmail để đăng ký dự án"
            : "Xác thực Gmail để đăng ký tham gia dự án"
        }
        className="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm leading-relaxed text-stone-700">
            {gAuthPurpose === "SUBMIT_PROJECT" ? (
              <>
                Đăng ký dự án tình nguyện <strong>không cần tạo tài khoản</strong> — chỉ cần xác thực nhanh bằng Gmail của bạn.
              </>
            ) : (
              <>
                Đoàn viên đăng ký tham gia dự án <strong>không cần tạo tài khoản</strong> — chỉ cần xác thực nhanh bằng Gmail của bạn để xác nhận trên cổng.
              </>
            )}
          </p>
          <ul className="mx-auto max-w-xs space-y-1.5 text-left text-xs text-stone-600">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
              Xác thực an toàn qua tài khoản Google của bạn.
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
              Khi đăng ký tài khoản Đoàn viên bằng email này sau này, hệ thống sẽ tự động liên kết và cộng điểm bù.
            </li>
          </ul>
          <div ref={gBtnRef} className="flex min-h-11 justify-center" />
          <p className="text-[11px] text-stone-400">
            Đang tải nút Google… Nếu chưa thấy nút, vui lòng đợi vài giây.
          </p>
        </div>
      </Modal>
    </div>
  );
}
