"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NOMINATION_FIELDS, resizeImageFile, submitNomination } from "@/lib/de-cu";

export default function DeCuNhanTaiPage() {
  const { session, ready } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [nomineeName, setNomineeName] = useState("");
  const [nomineePosition, setNomineePosition] = useState("");
  const [orgUnitId, setOrgUnitId] = useState<number | "">("");
  const [field, setField] = useState<string>(NOMINATION_FIELDS[0]);
  const [quote, setQuote] = useState("");
  const [achievements, setAchievements] = useState("");

  const [schools, setSchools] = useState<{ id: number; name: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  const [evidenceDataUrl, setEvidenceDataUrl] = useState("");
  const [evidenceThumbDataUrl, setEvidenceThumbDataUrl] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách đơn vị trường học cấp 4
  useEffect(() => {
    fetch("/api/org-units")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.units)) {
          const list = (d.units as { id: number; name: string; orgLevel: number }[])
            .filter((u) => u.orgLevel === 4)
            .sort((a, b) => a.name.localeCompare(b.name, "vi"));
          setSchools(list);
          // Nếu session là tài khoản trường thì tự chọn trường mình
          if (session?.orgUnitId && list.some((s) => s.id === session.orgUnitId)) {
            setOrgUnitId(session.orgUnitId);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setSchoolsLoading(false));
  }, [session]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vui lòng chọn tệp hình ảnh hợp lệ (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("Kích thước tệp quá lớn (tối đa 15MB).");
      return;
    }

    try {
      setImageProcessing(true);
      setErrorMsg("");
      const { full, thumb } = await resizeImageFile(file);
      setEvidenceDataUrl(full);
      setEvidenceThumbDataUrl(thumb);
    } catch (err) {
      setErrorMsg((err as Error).message || "Không thể xử lý ảnh.");
    } finally {
      setImageProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg("");

    if (!session) {
      setErrorMsg("Vui lòng đăng nhập để gửi hồ sơ đề cử.");
      return;
    }

    if (session.role === "DOAN_VIEN") {
      setErrorMsg("Chức năng đề cử nhân tài dành cho tổ chức Đoàn các cấp (Đoàn trường, Đoàn xã/phường, Đoàn cấp trên).");
      return;
    }

    if (nomineeName.trim().length < 2) {
      setErrorMsg("Vui lòng nhập họ và tên người được đề cử (tối thiểu 2 ký tự).");
      return;
    }

    if (!orgUnitId) {
      setErrorMsg("Vui lòng chọn trường / đơn vị của người được đề cử.");
      return;
    }

    if (achievements.trim().length < 30) {
      setErrorMsg("Nội dung thành tích đề cử cần tối thiểu 30 ký tự để hội đồng xem xét.");
      return;
    }

    if (!evidenceDataUrl || !evidenceThumbDataUrl) {
      setErrorMsg("Vui lòng tải lên ảnh chân dung hoặc ảnh minh chứng hoạt động.");
      return;
    }

    setSubmitting(true);
    const res = await submitNomination({
      nomineeName: nomineeName.trim(),
      nomineePosition: nomineePosition.trim() || undefined,
      orgUnitId: Number(orgUnitId),
      field,
      quote: quote.trim() || undefined,
      achievements: achievements.trim(),
      evidenceDataUrl,
      evidenceThumbDataUrl,
    });

    setSubmitting(false);

    if (res.ok) {
      toast("Đã gửi hồ sơ đề cử nhân tài thành công! Ban biên tập sẽ đối chiếu và phê duyệt.", "success");
      router.push("/nhan-tai");
    } else {
      setErrorMsg(res.error || "Không thể gửi hồ sơ. Vui lòng kiểm tra lại thông tin.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href="/nhan-tai"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại Cổng nhân tài
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Hồ sơ phát hiện nhân tài trẻ
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="text-center sm:text-left">
            <h1 className="font-serif-display text-2xl font-black text-slate-900 sm:text-3xl">
              Đề cử gương mặt nhân tài
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Dành cho Ban Chấp hành Đoàn các trường và tổ chức Đoàn các cấp giới thiệu những tấm gương
              học sinh, thanh thiếu niên tiêu biểu có năng khiếu, sáng kiến và thành tích vượt trội.
            </p>
          </div>

          {/* Cảnh báo chưa đăng nhập hoặc là tài khoản Đoàn viên */}
          {ready && !session && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Yêu cầu đăng nhập tài khoản cán bộ Đoàn</p>
                <p className="mt-1 text-amber-800">
                  Bạn cần đăng nhập tài khoản tổ chức Đoàn trường hoặc cán bộ để gửi đề cử.{" "}
                  <Link href="/dang-nhap" className="font-bold underline hover:text-amber-950">
                    Đăng nhập tại đây
                  </Link>
                </p>
              </div>
            </div>
          )}

          {ready && session?.role === "DOAN_VIEN" && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-xs text-blue-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="font-bold">Lưu ý phân quyền đề cử</p>
                <p className="mt-1 text-blue-800">
                  Đề cử nhân tài là hành vi của tổ chức Đoàn. Bạn đang đăng nhập bằng tài khoản Đoàn viên.
                  Nếu bạn muốn tham gia ứng cử cá nhân, vui lòng xem mục{" "}
                  <Link href="/binh-chon-hs3t" className="font-bold underline hover:text-blue-950">
                    Bình chọn Hành trình 3 tốt
                  </Link>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Họ và tên người được đề cử" required hint="Họ tên đầy đủ theo giấy tờ khai sinh">
                <Input
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  required
                />
              </Field>

              <Field label="Chức vụ / Lớp / Chi đoàn" hint="Ví dụ: Bí thư Chi đoàn 12A1 / Lớp trưởng">
                <Input
                  value={nomineePosition}
                  onChange={(e) => setNomineePosition(e.target.value)}
                  placeholder="Ví dụ: Lớp 12 Chuyên Toán"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Đoàn trường / Đơn vị đề cử" required hint="Chọn trường THPT trực thuộc">
                <Select
                  value={orgUnitId}
                  onChange={(e) => setOrgUnitId(Number(e.target.value) || "")}
                  disabled={schoolsLoading}
                  required
                >
                  <option value="">-- Chọn trường học (cấp cơ sở) --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Lĩnh vực đề cử" required hint="Lĩnh vực thế mạnh vượt trội">
                <Select value={field} onChange={(e) => setField(e.target.value)} required>
                  {NOMINATION_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Châm ngôn sống / Lời trích dẫn" hint="Câu nói tâm đắc của cá nhân (tối đa 300 ký tự)">
              <Input
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Ví dụ: Tri thức chỉ có giá trị khi được chuyển hóa thành hành động phụng sự cộng đồng."
                maxLength={300}
              />
            </Field>

            <Field
              label="Tóm tắt quá trình phấn đấu & Thành tích nổi bật"
              required
              hint="Liệt kê các giải thưởng, sáng kiến, nghiên cứu khoa học, thành tích học đường (từ 30 đến 4000 ký tự)"
            >
              <Textarea
                rows={6}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="1. Quá trình nỗ lực rèn luyện...&#10;2. Các thành tích nổi bật:&#10;- Đạt giải Nhất học sinh giỏi cấp Quốc gia...&#10;- Sáng kiến khoa học kỹ thuật đạt giải..."
                required
              />
              <div className="mt-1 flex justify-end text-[11px] text-slate-400">
                <span>{achievements.length} / 4000 ký tự</span>
              </div>
            </Field>

            {/* Upload ảnh chân dung / minh chứng */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                Ảnh chân dung / Ảnh minh chứng hoạt động <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Tải lên ảnh rõ nét của người được đề cử (ảnh thẻ, ảnh nhận giải hoặc khoảnh khắc tham gia hoạt động).
              </p>

              {evidenceThumbDataUrl ? (
                <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evidenceThumbDataUrl}
                    alt="Xem trước ảnh đề cử"
                    className="h-24 w-20 rounded-xl object-cover shadow-xs border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Đã tải lên ảnh thành công
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Ảnh đã được tối ưu hóa chuẩn tự động cho hồ sơ hiển thị.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceDataUrl("");
                        setEvidenceThumbDataUrl("");
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Chọn ảnh khác
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 transition hover:border-amber-400 hover:bg-amber-50/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {imageProcessing ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">Đang tối ưu hóa hình ảnh...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-xs font-bold text-slate-800">
                        Nhấn để chọn ảnh từ máy tính hoặc kéo thả ảnh vào đây
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Định dạng PNG, JPG, WebP — tối đa 15MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/nhan-tai")}
                className="w-full sm:w-auto"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={submitting || imageProcessing || !session || session.role === "DOAN_VIEN"}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-bold hover:brightness-110 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi hồ sơ...
                  </>
                ) : (
                  <>
                    <Award className="mr-2 h-4 w-4" /> Gửi hồ sơ đề cử
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
