"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, UserPlus, Users } from "lucide-react";
import { DEMO_ACCOUNTS, useAuth, type Role } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { orgUnits } from "@/data/org-units";
import { DV_HOI_POSITION_GROUPS } from "@/data/positions";

const SOFT_INPUT =
  "mt-1.5 w-full rounded-xl border border-transparent bg-slate-100/60 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]";

const SCHOOLS = orgUnits.filter((u) => u.orgLevel === 4);
const COMMUNES = orgUnits.filter((u) => u.orgLevel === 3);
const PROVINCES = orgUnits.filter((u) => u.orgLevel === 2);

export default function DangKyPage() {
  const { session, ready, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    className: "",
    position: "Đoàn viên",
    orgUnitId: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>("");

  const filteredCommunes = useMemo(() => {
    if (!selectedProvinceId) return [];
    const pId = Number(selectedProvinceId);
    return COMMUNES.filter((c) => c.parentId === pId);
  }, [selectedProvinceId]);

  const filteredSchools = useMemo(() => {
    if (selectedCommuneId) {
      const cId = Number(selectedCommuneId);
      return SCHOOLS.filter((s) => s.parentId === cId);
    }
    if (selectedProvinceId) {
      const pId = Number(selectedProvinceId);
      const cIds = filteredCommunes.map((c) => c.id);
      return SCHOOLS.filter((s) => s.parentId === pId || (s.parentId !== null && cIds.includes(s.parentId)));
    }
    return SCHOOLS;
  }, [selectedProvinceId, selectedCommuneId, filteredCommunes]);

  // Đổi đơn vị thuộc nhóm khác thì reset chọn (value chưa tồn tại trong nhóm mới)


  // Đã đăng nhập thì vào thẳng diễn đàn
  useEffect(() => {
    if (ready && session) router.replace("/dien-dan");
  }, [ready, session, router]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const username = form.username.trim().toLowerCase();
    const schoolId = Number(form.orgUnitId);
    if (!fullName || !email || !schoolId) {
      setError("Hãy điền đủ họ tên, email và chọn đơn vị.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email chưa đúng định dạng.");
      return;
    }
    if (username.length < 4) {
      setError("Tên đăng nhập cần tối thiểu 4 ký tự.");
      return;
    }
    if (form.password.length < 6) {
      setError("Mật khẩu cần tối thiểu 6 ký tự.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    const taken = DEMO_ACCOUNTS.some((a) => a.username.toLowerCase() === username);
    if (taken) {
      setError("Tên đăng nhập đã tồn tại — hãy chọn tên khác.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: form.password,
          email,
          fullName,
          position: form.position,
          className: form.className.trim() || undefined,
          orgUnitId: schoolId,
        }),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!r.ok || !j?.ok) {
        setSubmitting(false);
        setError(j?.error ?? "Không đăng ký được tài khoản. Vui lòng thử lại.");
        return;
      }
    } catch {
      setSubmitting(false);
      setError("Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.");
      return;
    }

    await login(username, form.password);
    toast("Đăng ký thành công! Chào mừng bạn đến với Diễn đàn Đoàn viên.", "success");
    router.push("/dien-dan");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      {/* Nút về trang chủ — góc trên trái */}
      <Link
        href="/"
        className="group absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 py-1.5 pl-1.5 pr-4 text-xs font-semibold text-slate-600 shadow-[0_8px_24px_rgb(15,23,42,0.10)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 sm:left-8 sm:top-7"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-600/30 transition-transform duration-300 group-hover:-translate-x-0.5">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        Về màn hình chính
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-[0_24px_80px_rgb(15,23,42,0.10)] sm:p-9"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Đăng ký Đoàn viên</h1>
            <p className="text-xs text-slate-500">Tham gia Diễn đàn ẩn danh của Cổng Thanh niên Trường học</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-500">Họ và tên</label>
              <input value={form.fullName} onChange={set("fullName")} placeholder="Nguyễn Văn A" className={SOFT_INPUT} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Email</label>
              <input value={form.email} onChange={set("email")} placeholder="ban@truong.edu.vn" type="email" className={SOFT_INPUT} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-500">Lớp</label>
              <input value={form.className} onChange={set("className")} placeholder="VD: 12A1" className={SOFT_INPUT} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Chức vụ Đoàn - Hội</label>
              <select value={form.position} onChange={set("position")} className={SOFT_INPUT}>
                {DV_HOI_POSITION_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.positions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          {/* Phân cấp chọn đơn vị: Tỉnh/Thành -> Quận/Huyện/Xã -> Trường/Cơ sở */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  1
                </span>
                <span className="text-xs font-bold text-slate-700">Đơn vị Đoàn &amp; Trường học</span>
              </div>
              <span className="text-[11px] font-medium text-blue-600">Phân cấp 3 tầng</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  1. Tỉnh / Thành đoàn <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProvinceId}
                  onChange={(e) => {
                    setSelectedProvinceId(e.target.value);
                    setSelectedCommuneId("");
                    setForm((f) => ({ ...f, orgUnitId: "" }));
                  }}
                  className={SOFT_INPUT}
                >
                  <option value="">— Chọn Tỉnh / Thành đoàn —</option>
                  {PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  2. Quận / Huyện / Phường / Xã
                </label>
                <select
                  value={selectedCommuneId}
                  onChange={(e) => {
                    setSelectedCommuneId(e.target.value);
                    setForm((f) => ({ ...f, orgUnitId: "" }));
                  }}
                  disabled={!selectedProvinceId}
                  className={SOFT_INPUT}
                >
                  <option value="">— Tất cả / Trực thuộc Tỉnh/Thành —</option>
                  {filteredCommunes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">
                3. Trường học / Cơ sở đào tạo (Cấp cơ sở) <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.orgUnitId}
                onChange={set("orgUnitId")}
                className={SOFT_INPUT}
                required
              >
                <option value="">
                  {filteredSchools.length === 0
                    ? "— Không tìm thấy trường thuộc phân cấp này —"
                    : "— Chọn trường / cơ sở giáo dục —"}
                </option>
                {filteredSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.schoolTypeName ? `(${s.schoolTypeName})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                * Tài khoản Đoàn viên được kích hoạt tại Đoàn cơ sở Trường THPT, THCS, ĐH/CĐ hoặc GDNN-GDTX.
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Tên đăng nhập</label>
            <input value={form.username} onChange={set("username")} placeholder="tối thiểu 4 ký tự" autoComplete="username" className={SOFT_INPUT} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-500">Mật khẩu</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="tối thiểu 6 ký tự" autoComplete="new-password" className={SOFT_INPUT} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Nhập lại mật khẩu</label>
              <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" autoComplete="new-password" className={SOFT_INPUT} />
            </div>
          </div>

          {error ? (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </motion.p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" /> Tạo tài khoản &amp; vào diễn đàn
          </button>
          <button
            type="button"
            onClick={() => router.push("/dang-nhap")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <LogIn className="h-4 w-4" /> Đã có tài khoản? Đăng nhập
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
          Thông tin đăng ký sẽ được Đoàn trường xác thực và kích hoạt theo quy định quản lý Đoàn viên.
        </p>
      </motion.div>
    </div>
  );
}
