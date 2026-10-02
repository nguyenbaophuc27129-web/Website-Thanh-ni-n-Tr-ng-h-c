"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PROGRAMS } from "@/data/programs";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Việc đơn vị cần làm theo từng chương trình, viết riêng cho cấp cơ sở */
const TODO_BY_KEY: Record<string, string[]> = {
  HS3T: [
    "Rà soát danh sách học sinh đăng ký hồ sơ 3 Tốt trên cổng chương trình",
    "Theo dõi tiến độ rèn luyện và nhắc học sinh cập nhật minh chứng",
    "Đối soát chứng nhận số trước kỳ tổng kết",
  ],
  DU_AN_TN: [
    "Chọn trước 01 ý tưởng dự án tình nguyện có tính bền vững",
    "Chuẩn bị kế hoạch đo lường kết quả (số người thụ hưởng, sản phẩm đầu ra)",
    "Tập huấn cán bộ Đoàn cách cập nhật tiến độ dự án trên Cổng TNTH",
  ],
  THI_KT: [
    "Cử đoàn viên tham gia vòng thi thử khi hệ thống mở",
    "Chuẩn bị đội tuyên truyền viên hướng dẫn học sinh đăng ký",
    "Theo dõi bảng xếp hạng trực tuyến của đơn vị bạn",
  ],
};

export default function ChuongTrinhPage() {
  const { session } = useAuth();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-serif-display text-xl font-bold text-stone-900">
          <Sparkles className="h-5 w-5 text-doan-600" /> Chương trình trọng tâm
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Ba chương trình trọng tâm của Thanh niên Trường học theo lộ trình 3 giai đoạn — theo dõi và chuẩn bị cho đơn vị {session?.orgUnitName ?? "của bạn"}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PROGRAMS.map((p) => (
          <Card key={p.key} className="overflow-hidden">
            <div className={`bg-gradient-to-br ${p.grad} px-5 py-4 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${p.phase === 1 ? "bg-white text-emerald-700" : "bg-white/15 ring-1 ring-white/30"}`}>
                  {p.phase === 1 ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {p.phaseLabel}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-bold leading-snug">{p.title}</h2>
            </div>
            <CardBody className="space-y-3">
              <p className="text-xs leading-relaxed text-stone-500">{p.desc}</p>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  Đơn vị bạn cần làm gì
                </p>
                <ul className="mt-1.5 space-y-1">
                  {TODO_BY_KEY[p.key].map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-stone-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-doan-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-1">
                {p.external ? (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-doan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-doan-700"
                  >
                    Mở cổng chương trình <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    href={p.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-doan-200 px-3.5 py-2 text-xs font-semibold text-doan-700 hover:bg-doan-50"
                  >
                    Xem lộ trình <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="border-doan-100 bg-doan-50/40">
        <CardBody className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-doan-800">
            <strong>Mẹo:</strong> nhiệm vụ của từng chương trình sẽ được cấp trên giao trực tiếp qua mục
            "Nhiệm vụ &amp; chỉ tiêu" — đơn vị nhận được thông báo và nhắc việc tự động khi tới hạn.
          </p>
          <Link href="/quan-tri/nhiem-vu">
            <Button variant="outline" size="sm">
              Nhiệm vụ của tôi <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
