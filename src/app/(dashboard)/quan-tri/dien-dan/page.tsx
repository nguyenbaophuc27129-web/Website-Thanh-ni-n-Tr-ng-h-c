"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, EyeOff, MessageSquareText, MessagesSquare, Search, ShieldAlert, ShieldCheck, X,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import type { ForumComment, ForumThread } from "@/types";

type ModState = "PENDING" | "APPROVED" | "REJECTED";

interface ModItem {
  kind: "THREAD" | "COMMENT";
  id: number;
  state: ModState;
  alias: string;
  title?: string;
  content: string;
  threadId: number;
  createdAt: string;
  aiVerdict: "CLEAN" | "FLAGGED";
  aiReason?: string;
  aiModel?: string;
  moderatedAt?: string;
  /** Thread PUBLISHED thì cho phép ẩn nhanh */
  threadPublished: boolean;
}

function threadState(t: ForumThread): ModState {
  if (t.aiVerdict === "FLAGGED" && !t.moderatedByAccountId) return "PENDING";
  if (t.rejectionReason) return "REJECTED";
  return "APPROVED";
}

export default function DienDanAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const items = useMemo<ModItem[]>(() => {
    const threads: ModItem[] = store.forumThreads.map((t) => ({
      kind: "THREAD" as const,
      id: t.id,
      state: threadState(t),
      alias: t.alias,
      title: t.title,
      content: t.content,
      threadId: t.id,
      createdAt: t.createdAt,
      aiVerdict: t.aiVerdict,
      aiReason: t.aiReason,
      aiModel: t.aiModel,
      moderatedAt: t.moderatedAt,
      threadPublished: t.status === "PUBLISHED",
    }));
    const comments: ModItem[] = store.forumComments.map((c) => ({
      kind: "COMMENT" as const,
      id: c.id,
      state: (c.status === "PENDING_REVIEW" ? "PENDING" : c.status === "REJECTED" ? "REJECTED" : "APPROVED") as ModState,
      alias: c.alias,
      content: c.content,
      threadId: c.threadId,
      createdAt: c.createdAt,
      aiVerdict: c.aiVerdict,
      aiReason: c.aiReason,
      aiModel: c.aiModel,
      moderatedAt: c.moderatedAt,
      threadPublished: false,
    }));
    const all = [...threads, ...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = search.trim().toLowerCase();
    return all
      .filter((it) => (tab === "ALL" ? true : it.state === tab))
      .filter((it) => (q ? it.alias.toLowerCase().includes(q) || it.content.toLowerCase().includes(q) : true));
  }, [store.forumThreads, store.forumComments, tab, search]);

  const counts = useMemo(() => {
    const all = [
      ...store.forumThreads.map(threadState),
      ...store.forumComments.map((c) => (c.status === "PENDING_REVIEW" ? "PENDING" : c.status === "REJECTED" ? "REJECTED" : "APPROVED") as ModState),
    ];
    return {
      PENDING: all.filter((s) => s === "PENDING").length,
      APPROVED: all.filter((s) => s === "APPROVED").length,
      REJECTED: all.filter((s) => s === "REJECTED").length,
      ALL: all.length,
    } as Record<string, number>;
  }, [store.forumThreads, store.forumComments]);

  if (!session || session.role !== "QUAN_TRI_TW") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này chỉ dành cho Quản trị Trung ương</p>
          <p className="mt-1 text-xs text-stone-400">Bạn không có quyền kiểm duyệt diễn đàn toàn quốc.</p>
        </CardBody>
      </Card>
    );
  }

  const keyOf = (it: ModItem) => `${it.kind}-${it.id}`;

  const act = (it: ModItem, action: "APPROVE" | "REJECT" | "HIDE") => {
    store.moderateForumItem(session, it.kind, it.id, action, action === "REJECT" ? note.trim() || undefined : undefined);
    const label =
      action === "APPROVE"
        ? it.kind === "THREAD" && it.state === "APPROVED"
          ? "Đã mở lại bài viết."
          : "Đã duyệt — nội dung đã hiển thị công khai."
        : action === "REJECT"
          ? "Đã từ chối — nội dung không hiển thị công khai."
          : "Đã ẩn bài viết khỏi diễn đàn.";
    toast(label, action === "APPROVE" ? "success" : "warning");
    setNote("");
    setOpenId(null);
  };

  const stateBadge = (state: ModState) =>
    state === "PENDING" ? (
      <Badge tone="yellow">Chờ duyệt</Badge>
    ) : state === "APPROVED" ? (
      <Badge tone="green">Đã duyệt</Badge>
    ) : (
      <Badge tone="red">Đã từ chối</Badge>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Kiểm duyệt Diễn đàn ẩn danh</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Duyệt các nội dung AI gắn cờ, ẩn hoặc mở lại bài viết, từ chối bình luận vi phạm. Danh tính tác giả luôn được ẩn danh.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo bí danh, nội dung…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-doan-400"
          />
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "PENDING", label: "Chờ duyệt", count: counts.PENDING },
          { value: "APPROVED", label: "Đã duyệt", count: counts.APPROVED },
          { value: "REJECTED", label: "Đã từ chối", count: counts.REJECTED },
          { value: "ALL", label: "Tất cả", count: counts.ALL },
        ]}
      />

      <div className="space-y-3">
        {items.map((it) => {
          const key = keyOf(it);
          const open = openId === key;
          return (
            <Card key={key}>
              <CardBody className="p-0">
                <button onClick={() => { setOpenId(open ? null : key); setNote(""); }} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-stone-50">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-doan-50 text-doan-600">
                    {it.kind === "THREAD" ? <MessagesSquare className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800">
                      {it.kind === "THREAD" ? it.title : `Bình luận trong bài #${it.threadId}`}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {it.alias} · {formatDateTime(it.createdAt)} · {it.kind === "THREAD" ? "Bài viết" : "Bình luận"}
                    </p>
                  </div>
                  {it.aiVerdict === "FLAGGED" ? <Badge tone="yellow">AI gắn cờ</Badge> : null}
                  {stateBadge(it.state)}
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-stone-100 px-5 py-4">
                    <div className="rounded-lg bg-stone-50 p-3.5">
                      {it.title ? <p className="mb-1 text-sm font-semibold text-stone-800">{it.title}</p> : null}
                      <p className="text-sm leading-relaxed text-stone-700">{it.content}</p>
                    </div>

                    {/* Strip kết quả kiểm duyệt AI */}
                    <div className={it.aiVerdict === "FLAGGED" ? "rounded-lg border border-red-200 bg-red-50 p-3" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3"}>
                      <p className="flex items-center gap-1.5 text-xs font-bold">
                        {it.aiVerdict === "FLAGGED" ? (
                          <>
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                            <span className="text-red-700">AI gắn cờ nội dung này</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span className="text-emerald-700">AI đánh giá sạch</span>
                          </>
                        )}
                      </p>
                      {it.aiReason ? <p className="mt-1 text-xs text-stone-600">Lý do: {it.aiReason}</p> : null}
                      {it.aiModel ? <p className="mt-0.5 text-[10px] text-stone-400">Mô hình: {it.aiModel}</p> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                      <Link href={`/dien-dan/${it.threadId}`} className="font-semibold text-doan-600 hover:underline">
                        Xem bài gốc →
                      </Link>
                      {it.moderatedAt ? <span>· Đã xử lý {formatDateTime(it.moderatedAt)}</span> : null}
                    </div>

                    <div className="space-y-2 border-t border-stone-100 pt-3">
                      <Textarea
                        value={open ? note : ""}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Lý do từ chối (hiển thị trong hệ thống, không công khai)…"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        {it.kind === "THREAD" && it.state === "APPROVED" && it.threadPublished ? (
                          <Button size="sm" variant="outline" onClick={() => act(it, "HIDE")}>
                            <EyeOff className="h-3.5 w-3.5" /> Ẩn bài
                          </Button>
                        ) : null}
                        <Button size="sm" variant="secondary" onClick={() => act(it, "REJECT")}>
                          <X className="h-3.5 w-3.5" /> Từ chối
                        </Button>
                        <Button size="sm" onClick={() => act(it, "APPROVE")}>
                          <Check className="h-3.5 w-3.5" /> {it.kind === "THREAD" && it.state === "APPROVED" ? "Mở lại" : "Duyệt"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <ShieldCheck className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Không có nội dung nào trong mục này.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
