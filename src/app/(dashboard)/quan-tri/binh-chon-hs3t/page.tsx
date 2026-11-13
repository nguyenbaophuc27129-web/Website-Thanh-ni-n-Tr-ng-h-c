"use client";

/**
 * Quản trị Bình chọn HS3T — duyệt bài (AI badge + ảnh duyệt mắt), thống kê
 * theo trường/tỉnh, cấu hình chiến dịch (TW). Dữ liệu qua /api/binh-chon/quan-tri,
 * scope theo cây đơn vị (TW toàn quốc, còn lại chỉ subtree của mình).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldAlert, Vote, Check, X, BarChart3, Settings2, FileText, Loader2, Sparkles,
  AlertTriangle, Trophy, School, MapPin, Play, Square, Medal, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { adminGet, adminPatch, type AdminBinhChonResult } from "@/lib/binh-chon";
import type { BinhChonStory, HonorLevel, VoteCampaignStatus } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/dashboard/stat-card";
import { TableWrap, THead, Th, Tr, Td } from "@/components/ui/table";
import { StoryContent } from "@/components/public/binh-chon/story-content";
import { HONOR_LEVEL_LABEL, HONOR_LEVEL_SHORT } from "@/components/public/binh-chon/palette";
import { cn } from "@/lib/utils";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "stats" | "campaign";

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function QuanTriBinhChonPage() {
  const { session, ready } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [kind, setKind] = useState<"HS3T" | "DOAN_TRUONG">("HS3T");
  const [tab, setTab] = useState<Tab>("PENDING");
  const [data, setData] = useState<AdminBinhChonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [viewStory, setViewStory] = useState<BinhChonStory | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  /** Admin chỉnh lại danh hiệu 3 cấp khi duyệt (HS tự khai có thể sai) */
  const [honorEdits, setHonorEdits] = useState<Record<number, HonorLevel>>({});

  // Form chiến dịch (TW)
  const [cTitle, setCTitle] = useState("");
  const [cStarts, setCStarts] = useState("");
  const [cEnds, setCEnds] = useState("");
  const [cStatus, setCStatus] = useState<VoteCampaignStatus>("LIVE");
  const [cGift, setCGift] = useState("");
  const [cSaving, setCSaving] = useState(false);

  const allowed = ready && !!session && ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"].includes(session.role);
  const isTW = session?.role === "QUAN_TRI_TW";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGet(kind);
    setData(res.ok ? res : null);
    if (res.ok && res.campaign) {
      setCTitle(res.campaign.title);
      setCGift(res.campaign.giftNote ?? "");
      setCStatus(res.campaign.status);
      // datetime-local dùng local-parts — không toISOString trên date-only (tránh lệch múi giờ)
      const parts = (iso: string) => {
        const d = new Date(iso);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      };
      setCStarts(parts(res.campaign.startsAt));
      setCEnds(parts(res.campaign.endsAt));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const stories = data?.stories ?? [];
  const tabStories = useMemo(() => stories.filter((s) => s.status === tab), [stories, tab]);

  /** Sau PATCH 200 → thông báo cho học sinh (map username → accountId qua store) + refetch; persistence qua /api/store sync */
  const notify = (s: BinhChonStory, approved: boolean, reason?: string) => {
    const acc = store.accounts.find((a) => a.username === s.accountUsername);
    if (acc) {
      store.addNotification({
        recipientAccountId: acc.id,
        notificationType: approved ? "CONTRIBUTION_APPROVED" : "CONTRIBUTION_REJECTED",
        title: approved ? "Bài bình chọn HS3T đã được duyệt" : "Bài bình chọn HS3T bị từ chối",
        message: approved
          ? `Câu chuyện của ${s.studentName} đã được công khai trong cuộc bình chọn Học sinh 3 tốt tiêu biểu.`
          : `Lý do: ${reason ?? s.rejectionReason ?? "không rõ"}`,
        refType: "hs3t_story",
        refId: s.id,
        linkUrl: "/binh-chon-hs3t",
      });
    }
    void load();
  };

  const moderate = async (s: BinhChonStory, action: "approve" | "reject", reason?: string) => {
    setBusyId(s.id);
    const res = await adminPatch(
      action === "approve"
        ? { action, id: s.id, honorLevel: honorEdits[s.id] ?? s.honorLevel ?? "TRUONG" }
        : { action, id: s.id, reason: reason ?? "" }
    );
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? "Không thực hiện được.", "warning");
      return;
    }
    if (action === "reject") {
      setRejectId(null);
      setRejectReason("");
      toast("Đã từ chối bài dự thi.", "success");
    } else {
      toast("Đã duyệt và công khai bài dự thi.", "success");
    }
    notify(s, action === "approve", reason);
  };

  /** Xóa vĩnh viễn bài (hủy đăng bài) — mở chỗ cho học sinh đăng lại; phiếu bị xoá theo */
  const handleDelete = async (s: BinhChonStory) => {
    if (!window.confirm(`Xóa vĩnh viễn bài của ${s.studentName}? Học sinh sẽ được mở chỗ để đăng lại bài mới.`)) return;
    setBusyId(s.id);
    const res = await adminPatch({ action: "delete", id: s.id });
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? "Không xóa được bài.", "warning");
      return;
    }
    setViewStory(null);
    toast("Đã xóa bài dự thi.", "success");
    notify(s, false, "bài đã bị gỡ khỏi cuộc bình chọn — bạn có thể đăng lại bài mới");
  };

  /** Đổi bảng dự thi (danh hiệu) cho bài đã duyệt — sửa nhầm/nâng hạng, không đụng phiếu */
  const changeHonor = async (s: BinhChonStory) => {
    const honorLevel = honorEdits[s.id];
    if (!honorLevel || honorLevel === (s.honorLevel ?? "TRUONG")) return;
    setBusyId(s.id);
    const res = await adminPatch({ action: "honor", id: s.id, honorLevel });
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? "Không đổi được danh hiệu.", "warning");
      return;
    }
    toast(`Đã chuyển sang ${HONOR_LEVEL_LABEL[honorLevel]}.`, "success");
    void load();
  };

  const saveCampaign = async (patch: { status?: VoteCampaignStatus }) => {
    setCSaving(true);
    const res = await adminPatch({
      action: "campaign",
      title: cTitle,
      startsAt: cStarts ? new Date(cStarts).toISOString() : undefined,
      endsAt: cEnds ? new Date(cEnds).toISOString() : undefined,
      status: patch.status ?? cStatus,
      giftNote: cGift,
    });
    setCSaving(false);
    if (!res.ok) {
      toast(res.error ?? "Không lưu được chiến dịch.", "warning");
      return;
    }
    setCStatus(patch.status ?? cStatus);
    toast("Đã lưu chiến dịch.", "success");
    void load();
  };

  if (!ready) return null;
  if (!allowed) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này dành cho cán bộ Đoàn các cấp</p>
          <p className="mt-1 text-xs text-stone-400">Học sinh xem và bình chọn tại trang công khai /binh-chon-hs3t.</p>
        </CardBody>
      </Card>
    );
  }

  const counts = data?.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  const stats = data?.stats;
  const campaign = data?.campaign;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "PENDING", label: "Chờ duyệt", badge: counts.PENDING },
    { key: "APPROVED", label: "Đã duyệt", badge: counts.APPROVED },
    { key: "REJECTED", label: "Từ chối", badge: counts.REJECTED },
    { key: "stats", label: "Thống kê" },
    ...(isTW ? [{ key: "campaign" as Tab, label: "Chiến dịch" }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-black text-stone-900">Bình chọn Hành trình 3 tốt</h1>
          <p className="mt-0.5 text-xs text-stone-500">
            {campaign ? `${campaign.title} · ${fmtDate(campaign.startsAt)} → ${fmtDate(campaign.endsAt)}` : "Đang tải…"}
          </p>
        </div>
        <Badge tone={campaign?.status === "LIVE" ? "green" : campaign?.status === "ENDED" ? "gray" : "yellow"}>
          {campaign?.status === "LIVE" ? "Đang diễn ra" : campaign?.status === "ENDED" ? "Đã kết thúc" : "Bản nháp"}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors",
              tab === t.key ? "bg-doan-600 text-white" : "text-stone-600 hover:bg-stone-50"
            )}
          >
            {t.key === "stats" ? <BarChart3 className="h-3.5 w-3.5" /> : t.key === "campaign" ? <Settings2 className="h-3.5 w-3.5" /> : null}
            {t.label}
            {t.badge !== undefined && t.badge > 0 ? (
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", tab === t.key ? "bg-white/20 text-white" : "bg-doan-50 text-doan-700")}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-stone-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : tab === "stats" ? (
        /* ═══════════ THỐNG KÊ ═══════════ */
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Câu chuyện chờ duyệt" value={counts.PENDING} icon={FileText} tone="amber" />
            <StatCard label="Đã công khai" value={counts.APPROVED} icon={Check} tone="green" />
            <StatCard label="Tổng phiếu bình chọn" value={stats?.totalVotes ?? 0} icon={Vote} tone="red" />
            <StatCard label="Người đã bình chọn" value={stats?.voterAccounts ?? 0} icon={Trophy} tone="blue" />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader title="Top 5 bài dẫn đầu" subtitle="Theo phiếu bình chọn" />
              <CardBody className="space-y-2.5">
                {(stats?.topStories ?? []).length === 0 ? (
                  <p className="py-6 text-center text-xs text-stone-400">Chưa có dữ liệu</p>
                ) : (
                  stats?.topStories.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 && "bg-amber-100 text-amber-700",
                          i === 1 && "bg-stone-200 text-stone-600",
                          i === 2 && "bg-orange-100 text-orange-700",
                          i > 2 && "bg-stone-100 text-stone-500"
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-800">{s.studentName}</p>
                        <p className="truncate text-[11px] text-stone-500">{s.schoolName}</p>
                      </div>
                      <Badge tone="red">{s.votes} phiếu</Badge>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Theo trường" subtitle="Trường có bài công khai" action={<School className="h-4 w-4 text-stone-300" />} />
              <CardBody className="!p-0">
                <TableWrap>
                  
                    <THead>
                      <Tr>
                        <Th>Trường</Th>
                        <Th className="text-center">Bài</Th>
                        <Th className="text-center">Phiếu</Th>
                      </Tr>
                    </THead>
                    <tbody>
                      {(stats?.bySchool ?? []).length === 0 ? (
                        <Tr>
                          <Td className="text-center text-stone-400" colSpan={3}>Chưa có dữ liệu</Td>
                        </Tr>
                      ) : (
                        stats?.bySchool.map((r) => (
                          <Tr key={r.schoolName}>
                            <Td className="max-w-56 truncate">{r.schoolName}</Td>
                            <Td className="text-center">{r.stories}</Td>
                            <Td className="text-center font-semibold text-doan-700">{r.votes}</Td>
                          </Tr>
                        ))
                      )}
                    </tbody>
                  
                </TableWrap>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Theo tỉnh, thành phố" subtitle="Địa bàn có bài công khai" action={<MapPin className="h-4 w-4 text-stone-300" />} />
              <CardBody className="!p-0">
                <TableWrap>
                  
                    <THead>
                      <Tr>
                        <Th>Tỉnh / TP</Th>
                        <Th className="text-center">Bài</Th>
                        <Th className="text-center">Phiếu</Th>
                      </Tr>
                    </THead>
                    <tbody>
                      {(stats?.byProvince ?? []).length === 0 ? (
                        <Tr>
                          <Td className="text-center text-stone-400" colSpan={3}>Chưa có dữ liệu</Td>
                        </Tr>
                      ) : (
                        stats?.byProvince.map((r) => (
                          <Tr key={r.provinceName}>
                            <Td>{r.provinceName}</Td>
                            <Td className="text-center">{r.stories}</Td>
                            <Td className="text-center font-semibold text-doan-700">{r.votes}</Td>
                          </Tr>
                        ))
                      )}
                    </tbody>
                  
                </TableWrap>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : tab === "campaign" ? (
        /* ═══════════ CHIẾN DỊCH (TW) ═══════════ */
        <Card className="max-w-2xl">
          <CardHeader title="Cấu hình chiến dịch" subtitle="Chỉ Trung ương Đoàn chỉnh sửa" />
          <CardBody className="space-y-4">
            <Field label="Tên chiến dịch">
              <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} maxLength={200} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bắt đầu">
                <Input type="datetime-local" value={cStarts} onChange={(e) => setCStarts(e.target.value)} />
              </Field>
              <Field label="Kết thúc">
                <Input type="datetime-local" value={cEnds} onChange={(e) => setCEnds(e.target.value)} />
              </Field>
            </div>
            <Field label="Trạng thái">
              <Select value={cStatus} onChange={(e) => setCStatus(e.target.value as VoteCampaignStatus)}>
                <option value="DRAFT">Bản nháp — ẩn khỏi công khai</option>
                <option value="LIVE">Đang diễn ra</option>
                <option value="ENDED">Đã kết thúc</option>
              </Select>
            </Field>
            <Field label="Phần thưởng minigame" hint="Hiển thị ở trang bình chọn">
              <Textarea value={cGift} onChange={(e) => setCGift(e.target.value)} className="min-h-16" />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => saveCampaign({})} disabled={cSaving}>
                {cSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Lưu thay đổi
              </Button>
              <Button variant="outline" onClick={() => saveCampaign({ status: "LIVE" })} disabled={cSaving || cStatus === "LIVE"}>
                <Play className="h-4 w-4" /> Mở bình chọn ngay
              </Button>
              <Button variant="secondary" onClick={() => saveCampaign({ status: "ENDED" })} disabled={cSaving || cStatus === "ENDED"}>
                <Square className="h-4 w-4" /> Kết thúc
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        /* ═══════════ DANH SÁCH DUYỆT ═══════════ */
        <div className="space-y-3">
          {tabStories.length === 0 ? (
            <Card>
              <CardBody className="flex flex-col items-center py-16 text-center">
                <Sparkles className="h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm font-semibold text-stone-600">Không có bài nào ở trạng thái này</p>
              </CardBody>
            </Card>
          ) : (
            tabStories.map((s) => (
              <Card key={s.id}>
                <CardBody className="flex flex-col gap-4 sm:flex-row">
                  {/* Ảnh duyệt mắt */}
                  <div className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.photoThumbDataUrl}
                      alt={`Ảnh của ${s.studentName}`}
                      className="h-40 w-32 rounded-lg border border-stone-200 object-cover"
                    />
                    <p className="mt-1 text-center text-[10px] text-stone-400">Duyệt mắt ảnh thủ công</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-900">{s.studentName}</p>
                      {s.className ? <Badge tone="blue">Lớp {s.className}</Badge> : null}
                      <Badge tone="purple">{HONOR_LEVEL_SHORT[s.honorLevel ?? "TRUONG"]}</Badge>
                      {/* Badge AI */}
                      {s.aiVerdict === "FLAGGED" ? (
                        <Badge tone="red" className="!py-1">
                          <AlertTriangle className="h-3 w-3" /> AI đề xuất chặn
                        </Badge>
                      ) : s.aiVerdict === "CLEAN" ? (
                        <Badge tone="green" className="!py-1">
                          <Check className="h-3 w-3" /> AI: Sạch
                        </Badge>
                      ) : null}
                      {s.voteCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-doan-700">
                          <Vote className="h-3.5 w-3.5" /> {s.voteCount} phiếu
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {s.orgDisplayName || s.schoolName}
                      {s.provinceName ? ` · ${s.provinceName}` : ""} · {s.accountUsername ?? "—"} · {fmtDate(s.createdAt)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600">{s.story}</p>
                    {s.aiReason ? (
                      <p className={cn("mt-2 rounded-md px-2.5 py-1.5 text-[11px]", s.aiVerdict === "FLAGGED" ? "bg-red-50 text-red-700" : "bg-stone-50 text-stone-500")}>
                        AI: {s.aiReason}
                      </p>
                    ) : null}
                    {s.status === "REJECTED" && s.rejectionReason ? (
                      <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">Lý do từ chối: {s.rejectionReason}</p>
                    ) : null}

                    {(s.evidenceFiles?.length ?? 0) > 0 ? (
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <FileText className="h-3 w-3 text-red-400" /> Minh chứng:
                        </span>
                        {(s.evidenceFiles ?? []).map((ev, i) => (
                          <a
                            key={i}
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            download={ev.name}
                            className="max-w-44 truncate font-medium text-blue-600 hover:underline"
                            title={ev.name ?? `Tệp ${i + 1}`}
                          >
                            {ev.name || `Tệp ${i + 1}`}
                          </a>
                        ))}
                      </p>
                    ) : s.honorLevel !== "TW_DE_CU" && s.status === "PENDING" ? (
                      <p className="mt-2 text-[11px] text-amber-600">
                        Chưa có minh chứng PDF — danh hiệu cấp Trường/Tỉnh cần tối thiểu 1 bằng khen/giấy khen.
                      </p>
                    ) : null}

                    {s.status === "PENDING" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Select
                          value={honorEdits[s.id] ?? s.honorLevel ?? "TRUONG"}
                          onChange={(e) =>
                            setHonorEdits((m) => ({ ...m, [s.id]: e.target.value as HonorLevel }))
                          }
                          className="!w-auto !py-1.5 text-xs"
                          aria-label="Danh hiệu đã đạt"
                        >
                          {(Object.keys(HONOR_LEVEL_LABEL) as HonorLevel[]).map((k) => (
                            <option key={k} value={k}>
                              {HONOR_LEVEL_LABEL[k]}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => moderate(s, "approve")}
                          disabled={busyId === s.id}
                        >
                          <Check className="h-3.5 w-3.5" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setRejectId(s.id);
                            setRejectReason("");
                          }}
                          disabled={busyId === s.id}
                        >
                          <X className="h-3.5 w-3.5" /> Từ chối
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setViewStory(s)}>
                          <FileText className="h-3.5 w-3.5" /> Xem đầy đủ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => void handleDelete(s)}
                          disabled={busyId === s.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa bài
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {s.status === "APPROVED" ? (
                          <>
                            <Select
                              value={honorEdits[s.id] ?? s.honorLevel ?? "TRUONG"}
                              onChange={(e) =>
                                setHonorEdits((m) => ({ ...m, [s.id]: e.target.value as HonorLevel }))
                              }
                              className="!w-auto !py-1.5 text-xs"
                              aria-label="Đổi bảng dự thi"
                              disabled={busyId === s.id}
                            >
                              {(Object.keys(HONOR_LEVEL_LABEL) as HonorLevel[]).map((k) => (
                                <option key={k} value={k}>
                                  {HONOR_LEVEL_LABEL[k]}
                                </option>
                              ))}
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void changeHonor(s)}
                              disabled={
                                busyId === s.id ||
                                !honorEdits[s.id] ||
                                honorEdits[s.id] === (s.honorLevel ?? "TRUONG")
                              }
                            >
                              {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Lưu danh hiệu
                            </Button>
                          </>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => setViewStory(s)}>
                          <FileText className="h-3.5 w-3.5" /> Xem đầy đủ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => void handleDelete(s)}
                          disabled={busyId === s.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa bài
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal xem bài đầy đủ */}
      <Modal
        open={!!viewStory}
        onClose={() => setViewStory(null)}
        title={viewStory ? `Câu chuyện của ${viewStory.studentName}` : ""}
        wide
        footer={
          viewStory ? (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-stone-500">
                {viewStory.voteCount} phiếu · {fmtDate(viewStory.createdAt)}
                {viewStory.accountUsername ? ` · ${viewStory.accountUsername}` : ""}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleDelete(viewStory)}
                disabled={busyId === viewStory.id}
              >
                {busyId === viewStory.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Xóa bài — hủy đăng
              </Button>
            </div>
          ) : null
        }
      >
        {viewStory ? (
          <div className="space-y-3">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewStory.photoThumbDataUrl} alt="" className="h-44 w-36 rounded-lg border border-stone-200 object-cover" />
              <div className="text-sm">
                <p className="font-semibold text-stone-900">{viewStory.studentName}</p>
                <p className="text-stone-500">
                  {viewStory.className ? `Lớp ${viewStory.className} · ` : ""}
                  {viewStory.orgDisplayName || viewStory.schoolName}
                </p>
                {viewStory.quote ? <p className="mt-1 text-xs italic text-stone-500">“{viewStory.quote}”</p> : null}
              </div>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 border border-stone-200"><StoryContent content={viewStory.story} /></div>
            {/* Minh chứng bằng khen/giấy khen (PDF) — mở tab mới để đối chiếu */}
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-xs font-bold text-stone-600">Minh chứng bằng khen / giấy khen</p>
              {(viewStory.evidenceFiles?.length ?? 0) > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {viewStory.evidenceFiles!.map((ev, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        download={ev.name}
                        className="truncate font-medium text-blue-600 hover:underline"
                      >
                        {ev.name || `Minh chứng ${i + 1}`}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Không có tệp đính kèm{viewStory.honorLevel === "TW_DE_CU" ? " (danh hiệu cấp TW — đối chiếu trên khenthuong.doanthanhnien.vn)" : ""}.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal lý do từ chối */}
      <Modal
        open={rejectId !== null}
        onClose={() => setRejectId(null)}
        title="Từ chối bài dự thi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectId(null)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              disabled={rejectReason.trim().length < 3}
              onClick={() => {
                const s = tabStories.find((x) => x.id === rejectId);
                if (s) void moderate(s, "reject", rejectReason.trim());
              }}
            >
              Từ chối bài
            </Button>
          </>
        }
      >
        <Field label="Lý do (gửi tới học sinh)" required hint="Tối thiểu 3 ký tự. Phiếu bình chọn của bài sẽ bị xoá.">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-24" placeholder="Ví dụ: ảnh chưa đúng quy cách khung 3:4…" />
        </Field>
      </Modal>
    </div>
  );
}
