"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  UserCircle, LogIn, LogOut, Coins, FileEdit, FolderUp, HeartHandshake, Award, ArrowRight, MessageSquareQuote,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { CountUp } from "@/components/public/reveal";
import { formatDate, relTime } from "@/lib/utils";
import { CONTRIBUTION_POINTS } from "@/types";
import type { ContributionKind } from "@/types";

const KIND_META: Record<ContributionKind, { label: string; icon: typeof FileEdit; tone: string }> = {
  POST: { label: "Bài viết", icon: FileEdit, tone: "bg-sky-50 text-sky-600" },
  RESOURCE: { label: "Tài nguyên", icon: FolderUp, tone: "bg-violet-50 text-violet-600" },
  PROJECT: { label: "Dự án tình nguyện", icon: HeartHandshake, tone: "bg-emerald-50 text-emerald-600" },
  HS3T: { label: "Hồ sơ 3 tốt", icon: Award, tone: "bg-amber-50 text-amber-600" },
};

export default function TaiKhoanPage() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const store = useStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-doan-50 text-doan-600">
          <UserCircle className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-stone-900">Tài khoản của tôi</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Đăng nhập bằng tài khoản Đoàn viên để theo dõi điểm đóng góp, bài viết đã gửi,
          hồ sơ Học sinh 3 tốt và tiến trình phản ánh của bạn.
        </p>
        <Link
          href="/dang-nhap"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-doan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-doan-700"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
        <p className="mt-3 text-[11px] text-stone-400">Tài khoản demo Đoàn viên: dv.demo / demo123</p>
      </div>
    );
  }

  const myPoints = store.contributions.filter((c) => c.accountId === session.accountId);
  const totalPoints = myPoints.reduce((s, c) => s + c.points, 0);
  const byKind = (kind: ContributionKind) =>
    myPoints.filter((c) => c.kind === kind).reduce((s, c) => s + c.points, 0);

  const myContributions = store.memberContributions.filter((c) => c.contributorAccountId === session.accountId);
  const myFeedbacks = store.feedbacks.filter((f) => f.senderAccountId === session.accountId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tài khoản của tôi</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* ===== Cột trái: hồ sơ + điểm đóng góp ===== */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white">
                {session.contactPerson.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-900">{session.contactPerson}</p>
                <p className="truncate text-xs text-stone-500">{session.orgUnitName}</p>
                <p className="mt-1 truncate text-[11px] text-stone-400">
                  {session.email} · @{session.username}
                </p>
              </div>
              <button
                onClick={() => { logout(); router.push("/"); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" /> Đăng xuất
              </button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Điểm đóng góp" subtitle="Gửi bài, tài nguyên, dự án và hoàn thành hồ sơ 3 tốt đều được cộng điểm" />
            <CardBody>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-doan-600">
                  <CountUp value={totalPoints} />
                </span>
                <span className="pb-1 text-xs font-medium text-stone-400">điểm đóng góp</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(Object.keys(CONTRIBUTION_POINTS) as ContributionKind[]).map((kind) => {
                  const meta = KIND_META[kind];
                  const pts = byKind(kind);
                  return (
                    <div key={kind} className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-stone-500">{meta.label}</p>
                        <p className="text-sm font-bold text-stone-800">{pts} điểm</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
                Quy tắc cộng điểm: bài viết +{CONTRIBUTION_POINTS.POST} · tài nguyên +{CONTRIBUTION_POINTS.RESOURCE} ·
                dự án tình nguyện +{CONTRIBUTION_POINTS.PROJECT} · hồ sơ 3 tốt được chốt danh hiệu +{CONTRIBUTION_POINTS.HS3T}.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* ===== Cột phải: đóng góp + phản ánh ===== */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader
              title="Đóng góp của tôi"
              subtitle="Bài viết chuyên mục bạn gửi — qua AI kiểm duyệt và Ban TNTH duyệt đăng"
            />
            <CardBody>
              {myContributions.length === 0 ? (
                <div className="rounded-xl bg-stone-50 px-4 py-6 text-center">
                  <p className="text-sm text-stone-500">Bạn chưa gửi bài đóng góp nào.</p>
                  <Link
                    href="/tin-tuc"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-doan-600 hover:underline"
                    onClick={() => toast("Mở trang tin tức, chọn \"Đóng góp bài viết\" để gửi bài.", "info")}
                  >
                    Gửi bài đầu tiên <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {myContributions.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start gap-3 py-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <FileEdit className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">{c.title}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {c.categoryTag} · {mounted ? relTime(c.createdAt) : formatDate(c.createdAt)}
                          {c.aiVerdict === "FLAGGED" ? " · AI gắn cờ, chờ kiểm duyệt thủ công" : ""}
                        </p>
                        {c.status === "REJECTED" && c.rejectionReason ? (
                          <p className="mt-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600">{c.rejectionReason}</p>
                        ) : null}
                      </div>
                      {c.status === "PENDING" ? <Badge tone="yellow">Chờ duyệt</Badge>
                        : c.status === "APPROVED" ? (
                          <Link href={`/tin-tuc/${c.postSlug}`} className="shrink-0">
                            <Badge tone="green">Đã đăng</Badge>
                          </Link>
                        ) : <Badge tone="red">Từ chối</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Phản ánh của tôi"
              subtitle="Phản ánh bạn gửi khi đăng nhập — theo dõi tiến trình xử lý tại đây"
            />
            <CardBody>
              {myFeedbacks.length === 0 ? (
                <div className="rounded-xl bg-stone-50 px-4 py-6 text-center">
                  <p className="text-sm text-stone-500">Bạn chưa gửi phản ánh nào khi đăng nhập.</p>
                  <Link
                    href="/phan-anh"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-doan-600 hover:underline"
                  >
                    <MessageSquareQuote className="h-3.5 w-3.5" /> Gửi phản ánh
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {myFeedbacks.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-start gap-3 py-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <MessageSquareQuote className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">{f.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-stone-400">
                          {f.trackingCode} · {mounted ? relTime(f.submittedAt) : formatDate(f.submittedAt)}
                        </p>
                      </div>
                      {f.status === "NEW" ? <Badge tone="blue">Tiếp nhận</Badge>
                        : f.status === "IN_PROGRESS" ? <Badge tone="yellow">Đang xử lý</Badge>
                        : f.status === "RESOLVED" ? <Badge tone="green">Đã giải quyết</Badge>
                        : <Badge tone="gray">Đã đóng</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
