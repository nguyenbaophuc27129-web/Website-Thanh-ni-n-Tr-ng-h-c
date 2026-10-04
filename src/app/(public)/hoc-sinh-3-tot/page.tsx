"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
  GraduationCap, BookOpen, Dumbbell, HeartHandshake, Medal, Plus, Paperclip, X, Award, Landmark, ArrowRight, CheckCircle2, Scale,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Reveal, CountUp } from "@/components/public/reveal";
import {
  ruleEvaluateHs3t, HS3T_CATEGORY_NAMES, HS3T_SUB_CRITERIA, HS3T_MAIN_CATEGORIES, HS3T_ALL_CATEGORIES,
} from "@/lib/hs3t-evaluate";
import type { Hs3tAchievement, Hs3tCategory, Hs3tUnitStandard } from "@/types";

const CATEGORY_META: Record<Hs3tCategory, { icon: typeof BookOpen; tone: string; bar: string }> = {
  PHONG_TRAO: { icon: HeartHandshake, tone: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  HOC_TAP: { icon: BookOpen, tone: "bg-sky-50 text-sky-600", bar: "bg-sky-500" },
  REN_LUYEN: { icon: Dumbbell, tone: "bg-violet-50 text-violet-600", bar: "bg-violet-500" },
  KHAC: { icon: Medal, tone: "bg-amber-50 text-amber-600", bar: "bg-amber-500" },
};

const LEVEL_LABEL: Record<string, string> = {
  XA: "Danh hiệu cấp Xã/Phường",
  TINH: "Danh hiệu cấp Tỉnh/Thành phố",
  TW: "Danh hiệu cấp Trung ương",
};

/** Điều 5 — tiêu chuẩn đơn vị áp dụng: leo lên cây đơn vị nếu trường chưa tự điều chỉnh */
function unitStandardOf(
  orgUnits: { id: number; parentId: number | null }[],
  standards: Hs3tUnitStandard[],
  orgUnitId: number
): Hs3tUnitStandard | null {
  let cur = orgUnits.find((o) => o.id === orgUnitId);
  while (cur) {
    const unit = cur;
    const found = standards.find((s) => s.orgUnitId === unit.id && !s.applyTw);
    if (found) return found;
    if (unit.parentId == null) break;
    const parentId: number = unit.parentId;
    cur = orgUnits.find((o) => o.id === parentId);
  }
  return null;
}

export default function HocSinh3TotPage() {
  const store = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo hồ sơ 1 lần khi đăng nhập (side-effect trong useEffect, KHÔNG trong render)
  useEffect(() => {
    if (!session) return;
    store.ensureHs3tProfile(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountId]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Hs3tCategory>("HOC_TAP");
  const [sub, setSub] = useState("");
  const [achievedAt, setAchievedAt] = useState(new Date().toISOString().slice(0, 10));
  const [evidence, setEvidence] = useState<string[]>([]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <GraduationCap className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-stone-900">Hồ sơ Học sinh 3 tốt</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Chương trình dành cho học sinh — đăng nhập bằng tài khoản Đoàn viên để mở hồ sơ,
          cập nhật thành tích và theo dõi tiến độ xét danh hiệu.
        </p>
        <Link
          href="/dang-nhap"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Đăng nhập để mở hồ sơ
        </Link>
        <p className="mt-3 text-[11px] text-stone-400">Tài khoản demo học sinh: dv.demo / demo123</p>
      </div>
    );
  }

  // Cán bộ Đoàn → chuyển sang trang quản trị hồ sơ
  if (session.role !== "DOAN_VIEN") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Landmark className="mx-auto h-9 w-9 text-blue-600" />
        <h1 className="mt-4 text-xl font-bold text-stone-900">Bạn là cán bộ Đoàn</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Trang này dành cho học sinh. Hồ sơ 3 tốt của đơn vị bạn được quản lý tại khu quản trị.
        </p>
        <Link
          href="/quan-tri/hs3t"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Mở Hồ sơ HS3T trong khu quản trị <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const profile = store.hs3tProfiles.find((p) => p.accountId === session.accountId);
  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-stone-500">
        Đang khởi tạo hồ sơ 3 tốt của bạn…
      </div>
    );
  }

  const achievements = store.hs3tAchievements.filter((a) => a.profileId === profile.id);
  const evaluation = ruleEvaluateHs3t(profile, achievements);
  const unitStandard = unitStandardOf(store.orgUnits, store.hs3tUnitStandards, profile.schoolOrgUnitId);

  const addEvidence = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEvidence((prev) => {
      const next = [...prev];
      for (const f of Array.from(files)) {
        if (next.length >= 5) {
          toast("Tối đa 5 tệp minh chứng mỗi thành tích.", "warning");
          break;
        }
        if (!next.includes(f.name)) next.push(f.name);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitAchievement = () => {
    if (title.trim().length < 5) {
      toast("Tên thành tích tối thiểu 5 ký tự.", "warning");
      return;
    }
    store.addHs3tAchievement(session, profile.id, {
      title,
      category,
      sub: sub || undefined,
      evidenceNames: evidence.length > 0 ? evidence : undefined,
      achievedAt,
    });
    setTitle(""); setSub(""); setEvidence([]);
    toast("Đã thêm thành tích vào hồ sơ 3 tốt — hồ sơ chỉ cộng thêm, không xóa được.");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-1 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Hồ sơ Học sinh 3 tốt
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Cập nhật minh chứng đạo đức, học tập, thể lực theo 12 tiêu chí phụ chuẩn Trung ương (QĐ 317-QĐ/TWĐTN-TNTH)
        — cộng thêm nhóm Thành tích khác (công bố khoa học, chứng chỉ ngoại ngữ, tin học, SAT…).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/hoc-sinh-3-tot/quy-che"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <Scale className="h-3.5 w-3.5" /> Quy chế chuẩn TW (QĐ 317 + điều chỉnh 10/2025)
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-medium text-stone-500">
          Thành tích tính từ 01/9 năm trước đến hết 31/8 năm xét trao
        </span>
      </div>

      {unitStandard ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <Scale className="h-3.5 w-3.5" /> Tiêu chuẩn áp dụng tại {store.orgName(unitStandard.orgUnitId)} — điều chỉnh theo Điều 5 (không cao hơn chuẩn TW)
          </p>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-900/85">
            {unitStandard.daoDuc ? <li>• <b>Đạo đức tốt:</b> {unitStandard.daoDuc}</li> : null}
            {unitStandard.hocTap ? <li>• <b>Học tập tốt:</b> {unitStandard.hocTap}</li> : null}
            {unitStandard.theLuc ? <li>• <b>Thể lực tốt:</b> {unitStandard.theLuc}</li> : null}
          </ul>
          {unitStandard.note ? <p className="mt-1.5 text-[10px] italic text-amber-700/80">{unitStandard.note}</p> : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* ===== Hồ sơ + QR ===== */}
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-5 text-white">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                <GraduationCap className="h-4 w-4" /> Hồ sơ 3 tốt
              </p>
              <p className="mt-1.5 text-lg font-black">{profile.studentName}</p>
              <p className="text-xs text-emerald-100">
                {store.orgName(profile.schoolOrgUnitId)}
                {profile.className ? ` · ${profile.className}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-5 px-6 py-5">
              <div className="qr-glow shrink-0 rounded-2xl bg-white p-2.5 ring-1 ring-emerald-100">
                <QRCode value={profile.code} size={104} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-stone-900">{profile.code}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                  Mã hồ sơ tra cứu — xuất trình khi xét danh hiệu tại trường và cấp trên.
                </p>
                {profile.awardedLevel ? (
                  <Badge tone="green" className="mt-2">
                    <Award className="h-3 w-3" /> {LEVEL_LABEL[profile.awardedLevel]}
                  </Badge>
                ) : (
                  <Badge tone="yellow" className="mt-2">Chưa chốt danh hiệu</Badge>
                )}
              </div>
            </div>
          </div>

          {/* ===== Tiến độ 3 tốt ===== */}
          <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-200">
            <p className="text-sm font-bold text-stone-900">Tiến độ 3 tốt</p>
            <div className="mt-4 space-y-4">
              {HS3T_MAIN_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const n = evaluation.counts[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                        <meta.icon className={`h-3.5 w-3.5 ${meta.tone.split(" ")[1]}`} /> {HS3T_CATEGORY_NAMES[cat]}
                      </span>
                      <span className="font-bold text-stone-800">{n} minh chứng</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${meta.bar} transition-all duration-500`}
                        style={{ width: `${Math.min(100, (n / HS3T_SUB_CRITERIA[cat].length) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Đề xuất hiện tại:{" "}
                {evaluation.suggestedLevel ? (
                  <span className="text-emerald-600">{LEVEL_LABEL[evaluation.suggestedLevel]}</span>
                ) : (
                  <span className="text-amber-600">Chưa đủ điều kiện</span>
                )}
              </p>
              {evaluation.missing.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {evaluation.missing.map((m) => (
                    <li key={m} className="text-[11px] leading-relaxed text-stone-500">• {m}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-[10px] leading-relaxed text-stone-400">
                Ngưỡng: ≥1 nhóm có minh chứng → cấp xã · ≥2 nhóm → cấp tỉnh · đủ 3 nhóm và tổng ≥10 → cấp trung ương.
              </p>
            </div>
          </div>
        </div>

        {/* ===== Thành tích + form ===== */}
        <div className="space-y-6 lg:col-span-3">
          {/* Form thêm thành tích */}
          <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-stone-900">
              <Plus className="h-4 w-4 text-emerald-600" /> Thêm thành tích mới
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Tên thành tích" required className="sm:col-span-2" hint="VD: Giải Ba Học sinh giỏi Tin học cấp tỉnh">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tên thành tích, giải thưởng, hoạt động…" />
              </Field>
              <Field label="Nhóm tiêu chuẩn">
                <Select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as Hs3tCategory);
                    setSub("");
                  }}
                >
                  {HS3T_ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{HS3T_CATEGORY_NAMES[c]}</option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Tiêu chí phụ"
                hint={category === "KHAC" ? "Bổ sung hồ sơ — không tính vào ngưỡng xét 3 nhóm" : "Chọn đúng mục để thống kê theo dõi"}
              >
                <Select value={sub} onChange={(e) => setSub(e.target.value)}>
                  <option value="">— Chưa chọn —</option>
                  {HS3T_SUB_CRITERIA[category].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Ngày đạt">
                <Input type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} />
              </Field>
              <Field label="Minh chứng (không bắt buộc)" hint="Ảnh, chứng nhận… Tối đa 5 tệp" className="sm:col-span-2">
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addEvidence(e.target.files)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> Thêm minh chứng
                  </button>
                  {evidence.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-2.5 pr-1 text-[11px] font-medium text-stone-600">
                          <Paperclip className="h-3 w-3 text-stone-400" />
                          <span className="max-w-52 truncate">{name}</span>
                          <button
                            type="button"
                            onClick={() => setEvidence((prev) => prev.filter((n) => n !== name))}
                            className="rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                            aria-label={`Xóa ${name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>
            <button
              type="button"
              onClick={submitAchievement}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" /> Thêm vào hồ sơ
            </button>
          </div>

          {/* 3 cột thành tích theo nhóm chuẩn TW */}
          <div className="grid gap-4 md:grid-cols-3">
            {HS3T_MAIN_CATEGORIES.map((cat, i) => {
              const meta = CATEGORY_META[cat];
              const list = achievements.filter((a) => a.category === cat);
              return (
                <Reveal key={cat} delay={i * 70}>
                  <div className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.tone}`}>
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <span className="text-2xl font-black text-stone-900">
                        <CountUp value={list.length} />
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-stone-800">{HS3T_CATEGORY_NAMES[cat]}</p>
                    {list.length === 0 ? (
                      <p className="mt-2 rounded-lg bg-stone-50 px-2.5 py-3 text-center text-[11px] text-stone-400">
                        Chưa có minh chứng
                      </p>
                    ) : (
                      <GroupedAchievements cat={cat} list={list} />
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Thành tích khác — bổ sung hồ sơ, không tính ngưỡng 3 nhóm */}
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-[0_8px_30px_rgb(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${CATEGORY_META.KHAC.tone}`}>
                <Medal className="h-4 w-4" />
              </span>
              <span className="text-2xl font-black text-stone-900">
                <CountUp value={achievements.filter((a) => a.category === "KHAC").length} />
              </span>
            </div>
            <p className="mt-2 text-xs font-bold text-stone-800">
              Thành tích khác <span className="font-normal text-stone-400">— công bố khoa học, chứng chỉ ngoại ngữ, tin học văn phòng, SAT…</span>
            </p>
            {achievements.filter((a) => a.category === "KHAC").length === 0 ? (
              <p className="mt-2 rounded-lg bg-stone-50 px-2.5 py-3 text-center text-[11px] text-stone-400">
                Chưa có — nhóm này bổ sung hồ sơ, không tính vào ngưỡng xét 3 nhóm tiêu chuẩn.
              </p>
            ) : (
              <GroupedAchievements cat="KHAC" list={achievements.filter((a) => a.category === "KHAC")} />
            )}
          </div>

          {/* Theo dõi 12 tiêu chí phụ chuẩn TW */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100">
            <p className="text-sm font-bold text-stone-900">Theo dõi 12 tiêu chí phụ chuẩn TW</p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              Đạo đức 6 · Học tập 3 · Thể lực 3 (Điều 4 Quy chế, đã hợp nhất điều chỉnh 10/2025) — nộp đúng mục giúp cấp Đoàn xét nhanh hơn.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {HS3T_MAIN_CATEGORIES.flatMap((cat) => HS3T_SUB_CRITERIA[cat].map((s) => ({ cat, s }))).map(({ cat, s }) => {
                const n = achievements.filter((a) => a.category === cat && a.sub === s).length;
                const meta = CATEGORY_META[cat];
                return (
                  <div
                    key={s}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                      n > 0 ? "bg-emerald-50/60 ring-1 ring-emerald-100" : "bg-stone-50"
                    }`}
                  >
                    <span className="min-w-0 text-[11px] font-medium leading-snug text-stone-600">
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${meta.bar}`} />
                      {s}
                    </span>
                    <span className={`shrink-0 text-xs font-black ${n > 0 ? "text-emerald-600" : "text-stone-300"}`}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-stone-400">
            Thành tích trong hồ sơ chỉ cộng thêm, không xóa được — bảo đảm lịch sử minh chứng trung thực khi cấp trên xét danh hiệu.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Thành tích gom theo tiêu chí phụ — mục chưa chọn sub rơi vào "Khác" */
function GroupedAchievements({ cat, list }: { cat: Hs3tCategory; list: Hs3tAchievement[] }) {
  const knownSubs = HS3T_SUB_CRITERIA[cat].filter((s) => list.some((a) => a.sub === s));
  const others = list.filter((a) => !a.sub || !HS3T_SUB_CRITERIA[cat].includes(a.sub));
  const renderItem = (a: Hs3tAchievement) => (
    <li key={a.id} className="rounded-lg bg-stone-50 px-2.5 py-2">
      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-stone-700">{a.title}</p>
      <p className="mt-0.5 text-[10px] text-stone-400">
        {a.achievedAt}
        {a.addedByRole === "SCHOOL" ? " · trường xác nhận" : ""}
      </p>
    </li>
  );
  return (
    <div className="mt-2.5 space-y-2.5">
      {knownSubs.map((s) => (
        <div key={s}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            {s} <span className="text-stone-300">· {list.filter((a) => a.sub === s).length}</span>
          </p>
          <ul className="mt-1 space-y-1.5">{list.filter((a) => a.sub === s).map(renderItem)}</ul>
        </div>
      ))}
      {others.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Khác · {others.length}</p>
          <ul className="mt-1 space-y-1.5">{others.map(renderItem)}</ul>
        </div>
      ) : null}
    </div>
  );
}
