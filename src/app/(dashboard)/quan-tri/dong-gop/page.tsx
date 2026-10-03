"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, FileEdit, FolderUp, PenLine, ShieldAlert, ShieldCheck, X,
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

type Tab = "POST" | "RESOURCE";

export default function DongGopAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("POST");
  const [postTab, setPostTab] = useState("PENDING");
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const accountsName = (id?: number) =>
    store.accounts.find((a) => a.id === id)?.contactPerson ?? "Đoàn viên";

  const pendingPosts = store.memberContributions.filter((c) => c.status === "PENDING").length;
  const pendingResources = store.resources.filter((r) => r.submittedByAccountId && r.status === "DRAFT").length;

  const posts = useMemo(() => {
    return store.memberContributions
      .filter((c) => (postTab === "ALL" ? true : c.status === postTab))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.memberContributions, postTab]);

  const resources = useMemo(
    () =>
      store.resources
        .filter((r) => r.submittedByAccountId)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [store.resources]
  );

  if (!session || (session.role !== "QUAN_TRI_TW" && session.role !== "BIEN_TAP_VIEN")) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này dành cho Ban TNTH và Biên tập viên</p>
          <p className="mt-1 text-xs text-stone-400">Chỉ QUAN_TRI_TW và BIEN_TAP_VIEN mới duyệt được bài đóng góp.</p>
        </CardBody>
      </Card>
    );
  }

  const moderatePost = (id: number, action: "APPROVE" | "REJECT") => {
    const slug = store.moderateMemberContribution(session, id, action, action === "REJECT" ? note.trim() || undefined : undefined);
    toast(
      action === "APPROVE"
        ? "Đã duyệt đăng — bài hiển thị công khai, đoàn viên được +15 điểm."
        : "Đã từ chối bài đóng góp — người gửi nhận thông báo lý do.",
      action === "APPROVE" ? "success" : "warning"
    );
    if (slug) setOpenId(null);
    setNote("");
  };

  const moderateResource = (id: number, action: "APPROVE" | "REJECT") => {
    store.moderateResourceContribution(session, id, action);
    toast(
      action === "APPROVE"
        ? "Đã duyệt công khai tài nguyên — đoàn viên được +10 điểm."
        : "Đã từ chối tài nguyên — mục nháp được gỡ khỏi hệ thống.",
      action === "APPROVE" ? "success" : "warning"
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Duyệt đóng góp cộng đồng</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Bài viết và tài nguyên đoàn viên gửi về — duyệt xong tự động cộng điểm và thông báo cho người gửi.
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "POST", label: "Bài viết", count: store.memberContributions.length },
          { value: "RESOURCE", label: "Tài nguyên", count: resources.length },
        ]}
      />

      {tab === "POST" ? (
        <>
          <Tabs
            value={postTab}
            onChange={setPostTab}
            tabs={[
              { value: "PENDING", label: "Chờ duyệt", count: pendingPosts },
              { value: "APPROVED", label: "Đã duyệt", count: store.memberContributions.filter((c) => c.status === "APPROVED").length },
              { value: "REJECTED", label: "Đã từ chối", count: store.memberContributions.filter((c) => c.status === "REJECTED").length },
              { value: "ALL", label: "Tất cả", count: store.memberContributions.length },
            ]}
          />
          <div className="space-y-3">
            {posts.length === 0 ? (
              <Card>
                <CardBody className="py-12 text-center text-sm text-stone-400">Không có bài đóng góp nào ở trạng thái này.</CardBody>
              </Card>
            ) : null}
            {posts.map((c) => {
              const open = openId === c.id;
              return (
                <Card key={c.id}>
                  <CardBody className="p-0">
                    <button
                      onClick={() => { setOpenId(open ? null : c.id); setNote(""); }}
                      className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-stone-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                        <PenLine className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-800">{c.title}</p>
                        <p className="text-[11px] text-stone-400">
                          {c.categoryTag} · {accountsName(c.contributorAccountId)} · {formatDateTime(c.createdAt)}
                        </p>
                      </div>
                      {c.aiVerdict === "FLAGGED" ? <Badge tone="yellow">AI gắn cờ</Badge> : null}
                      {c.status === "PENDING" ? <Badge tone="yellow">Chờ duyệt</Badge>
                        : c.status === "APPROVED" ? <Badge tone="green">Đã đăng</Badge>
                        : <Badge tone="red">Đã từ chối</Badge>}
                    </button>

                    {open ? (
                      <div className="space-y-4 border-t border-stone-100 px-5 py-4">
                        <div className="rounded-lg bg-stone-50 p-3.5">
                          <p className="mb-1 text-sm font-semibold text-stone-800">{c.title}</p>
                          <p className="mb-2 text-xs italic text-stone-500">{c.excerpt}</p>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700 line-clamp-10">{c.content}</p>
                          {c.coverDataUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.coverDataUrl} alt="Ảnh bìa" className="mt-3 h-36 rounded-lg object-cover" />
                          ) : null}
                        </div>

                        {/* Strip kết quả kiểm duyệt AI */}
                        <div className={c.aiVerdict === "FLAGGED" ? "rounded-lg border border-red-200 bg-red-50 p-3" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3"}>
                          <p className="flex items-center gap-1.5 text-xs font-bold">
                            {c.aiVerdict === "FLAGGED" ? (
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
                          {c.aiReason ? <p className="mt-1 text-xs text-stone-600">Lý do: {c.aiReason}</p> : null}
                          {c.aiModel ? <p className="mt-0.5 text-[10px] text-stone-400">Mô hình: {c.aiModel}</p> : null}
                        </div>

                        {c.status === "APPROVED" && c.postSlug ? (
                          <Link href={`/tin-tuc/${c.postSlug}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-doan-600 hover:underline">
                            <FileEdit className="h-3.5 w-3.5" /> Xem bài đã đăng →
                          </Link>
                        ) : null}

                        {c.status !== "APPROVED" ? (
                          <div className="space-y-2 border-t border-stone-100 pt-3">
                            <Textarea
                              value={open ? note : ""}
                              onChange={(e) => setNote(e.target.value)}
                              rows={2}
                              placeholder="Lý do từ chối (gửi về cho người đóng góp)…"
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => moderatePost(c.id, "REJECT")}>
                                <X className="h-3.5 w-3.5" /> Từ chối
                              </Button>
                              <Button size="sm" onClick={() => moderatePost(c.id, "APPROVE")}>
                                <Check className="h-3.5 w-3.5" /> Duyệt đăng
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="rounded-lg bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
            Tài nguyên do đoàn viên gửi luôn ở trạng thái nháp — duyệt sẽ công khai trên kho dùng chung (+10 điểm cho người gửi).
          </p>
          {resources.length === 0 ? (
            <Card>
              <CardBody className="py-12 text-center text-sm text-stone-400">Chưa có tài nguyên đóng góp nào.</CardBody>
            </Card>
          ) : null}
          {resources.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-wrap items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <FolderUp className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-800">{r.title}</p>
                  <p className="text-[11px] text-stone-400">
                    {r.fileName} · {(r.fileSizeKb / 1024).toFixed(1)} MB · {accountsName(r.submittedByAccountId)} · {formatDateTime(r.publishedAt)}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{r.description}</p>
                </div>
                {r.status === "DRAFT" ? (
                  <>
                    <Badge tone="yellow">Chờ duyệt</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => moderateResource(r.id, "REJECT")}>
                        <X className="h-3.5 w-3.5" /> Từ chối
                      </Button>
                      <Button size="sm" onClick={() => moderateResource(r.id, "APPROVE")}>
                        <Check className="h-3.5 w-3.5" /> Duyệt công khai
                      </Button>
                    </div>
                  </>
                ) : (
                  <Badge tone="green">Đã công khai</Badge>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
