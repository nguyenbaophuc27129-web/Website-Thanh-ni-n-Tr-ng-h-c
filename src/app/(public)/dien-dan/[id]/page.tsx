"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Heart, ImagePlus, LogIn, MessagesSquare, MessageSquareText, Send, ShieldAlert, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { moderateText } from "@/lib/ai-moderation";
import { readForumMediaFiles } from "@/lib/forum-media";
import { avatarInitials, avatarTone } from "@/lib/forum-alias";
import { formatDateTime, relTime } from "@/lib/utils";
import type { ForumComment, ForumMedia } from "@/types";

export default function ForumThreadPage() {
  const params = useParams<{ id: string }>();
  const threadId = Number(params?.id);
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [comment, setComment] = useState("");
  const [media, setMedia] = useState<ForumMedia[]>([]);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const thread = useMemo(() => store.forumThreads.find((t) => t.id === threadId), [store.forumThreads, threadId]);

  const isModerator = session?.role === "QUAN_TRI_TW";
  const isAuthor = !!session && thread?.authorAccountId === session.accountId;
  const hiddenPending = thread?.status === "HIDDEN" && thread.aiVerdict === "FLAGGED" && !thread.moderatedByAccountId;

  const comments = useMemo(() => {
    if (!thread) return [];
    return store.forumComments
      .filter((c) => c.threadId === thread.id)
      .filter((c) => c.status === "PUBLISHED" || (c.status === "PENDING_REVIEW" && c.authorAccountId === session?.accountId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [thread, store.forumComments, session]);

  if (!thread || (thread.status === "HIDDEN" && !isAuthor && !isModerator)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white py-16">
          <MessagesSquare className="h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Không tìm thấy bài viết</p>
          <p className="mt-1 text-xs text-slate-400">Bài viết có thể đã bị ẩn hoặc địa chỉ không đúng.</p>
          <Link href="/dien-dan" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90">
            <ArrowLeft className="h-3.5 w-3.5" /> Về diễn đàn
          </Link>
        </div>
      </div>
    );
  }

  const threadLiked = session ? thread.likedByAccountIds.includes(session.accountId) : false;

  const submitComment = async () => {
    if (!session) return;
    const c = comment.trim();
    if (c.length < 2) {
      toast("Bình luận cần tối thiểu 2 ký tự.", "warning");
      return;
    }
    setChecking(true);
    const mod = await moderateText(c);
    setChecking(false);
    store.createForumComment(session, { threadId: thread.id, content: c, media: media.length ? media : undefined }, mod);
    setComment("");
    setMedia([]);
    toast(
      mod.verdict === "CLEAN" ? "Đã đăng bình luận ẩn danh." : `Bình luận của bạn đang chờ kiểm duyệt: ${mod.reason ?? "nội dung đáng ngờ"}.`,
      mod.verdict === "CLEAN" ? "success" : "warning"
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dien-dan" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Về diễn đàn
      </Link>

      {/* Bài ẩn/chờ duyệt — tác giả & TW thấy banner vàng */}
      {thread.status === "HIDDEN" ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <ShieldAlert className="h-4 w-4" />
            {hiddenPending ? "Bài viết đang chờ kiểm duyệt" : "Bài viết đã bị ẩn"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            {hiddenPending
              ? `AI gắn cờ: ${thread.aiReason ?? "nội dung đáng ngờ"}. ${isModerator ? "Hãy xử lý trong trang Kiểm duyệt Diễn đàn." : "Ban biên tập sẽ xem xét trong 24 giờ — bạn vẫn thấy bài này vì là tác giả."}`
              : thread.rejectionReason
                ? `Bị từ chối: ${thread.rejectionReason}.`
                : "Bài viết chưa hiển thị công khai."}
          </p>
        </div>
      ) : null}

      {/* ===== Bài viết ===== */}
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-5 rounded-3xl border-[0.5px] border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgb(15,23,42,0.05)] sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ${avatarTone(thread.alias)}`}>
            {avatarInitials(thread.alias)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{thread.alias}</p>
            <p className="text-[11px] text-slate-400">{mounted ? relTime(thread.createdAt) : formatDateTime(thread.createdAt)}</p>
          </div>
          {thread.topic ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">{thread.topic}</span>
          ) : null}
        </div>
        <h1 className="mt-5 text-2xl font-bold leading-snug tracking-tight text-slate-900">{thread.title}</h1>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{thread.content}</p>
        <MediaGrid media={thread.media} />
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => (session ? store.toggleForumLike(session, "THREAD", thread.id) : toast("Đăng nhập để thả cảm xúc.", "warning"))}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              threadLiked ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-50 hover:text-rose-500"
            }`}
          >
            <Heart className={`h-4 w-4 ${threadLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            {thread.likedByAccountIds.length} cảm xúc
          </button>
        </div>
      </motion.article>

      {/* ===== Composer bình luận ===== */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] sm:p-6">
        {session ? (
          <>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold text-slate-800">Bình luận ẩn danh</p>
              <span className="text-[11px] text-slate-400">— bạn sẽ hiện với bí danh ngẫu nhiên mới</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Chia sẻ suy nghĩ của bạn…"
              className="mt-3 w-full resize-none rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
            />
            {media.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {media.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-slate-600">
                    {m.kind === "image" ? <span className="text-[10px] font-bold text-blue-500">ẢNH</span> : <span className="text-[10px] font-bold text-purple-500">VIDEO</span>}
                    <span className="max-w-40 truncate">{m.name ?? "Tệp đính kèm"}</span>
                    <button
                      type="button"
                      onClick={() => setMedia(media.filter((_, j) => j !== i))}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2.5 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const res = await readForumMediaFiles(e.target.files ?? [], media);
                  if ("error" in res) toast(res.error, "warning");
                  else setMedia(res.media);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-cyan-300 hover:text-cyan-600"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Ảnh / video
              </button>
              <span className="ml-auto text-[11px] text-slate-400">{comment.length}/1000</span>
              <button
                onClick={submitComment}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {checking ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI đang kiểm duyệt…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Gửi bình luận
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LogIn className="h-4.5 w-4.5" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">Đăng nhập để bình luận</span> — vẫn ẩn danh hoàn toàn.
            </p>
            <Link
              href="/dang-nhap"
              className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
            >
              Đăng nhập / Đăng ký
            </Link>
          </div>
        )}
      </div>

      {/* ===== Danh sách bình luận ===== */}
      <div className="mt-6 space-y-4">
        <p className="text-sm font-semibold text-slate-800">{comments.length} bình luận</p>
        {comments.map((c) => (
          <CommentRow key={c.id} c={c} mounted={mounted} />
        ))}
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
            <p className="text-sm text-slate-400">Chưa có bình luận nào — hãy mở đầu cuộc trò chuyện!</p>
          </div>
        ) : null}
      </div>

      {isModerator && thread.status === "HIDDEN" ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Bạn là Quản trị TW — xử lý bài này trong{" "}
            <Link href="/quan-tri/dien-dan" className="text-blue-600 hover:underline">
              Kiểm duyệt Diễn đàn →
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Lưới ảnh + video đính kèm (thread & comment dùng chung) */
function MediaGrid({ media }: { media?: ForumMedia[] }) {
  if (!media?.length) return null;
  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  return (
    <div className="mt-3 space-y-2.5">
      {images.length > 0 ? (
        <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
          {images.map((m, i) => (
            <a
              key={i}
              href={m.dataUrl}
              target="_blank"
              rel="noreferrer"
              title={m.name ?? "Xem ảnh gốc"}
              className="group/img block overflow-hidden rounded-xl border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.dataUrl}
                alt={m.name ?? "Ảnh đính kèm"}
                className="h-40 w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
              />
            </a>
          ))}
        </div>
      ) : null}
      {videos.map((m, i) => (
        <video key={i} src={m.dataUrl} controls preload="metadata" className="max-h-96 w-full rounded-xl border border-slate-200 bg-black" />
      ))}
    </div>
  );
}

function CommentRow({ c, mounted }: { c: ForumComment; mounted: boolean }) {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const liked = session ? c.likedByAccountIds.includes(session.accountId) : false;
  return (
    <div className={`rounded-2xl border p-5 ${c.status === "PENDING_REVIEW" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarTone(c.alias)}`}>
          {avatarInitials(c.alias)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{c.alias}</p>
          <p className="text-[11px] text-slate-400">{mounted ? relTime(c.createdAt) : formatDateTime(c.createdAt)}</p>
        </div>
        {c.status === "PENDING_REVIEW" ? (
          <span className="shrink-0 rounded-full bg-amber-200/70 px-2.5 py-1 text-[10px] font-bold text-amber-800">CHỜ DUYỆT</span>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{c.content}</p>
      <MediaGrid media={c.media} />
      <div className="mt-3">
        <button
          onClick={() => (session ? store.toggleForumLike(session, "COMMENT", c.id) : toast("Đăng nhập để thả cảm xúc.", "warning"))}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            liked ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-50 hover:text-rose-500"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          {c.likedByAccountIds.length}
        </button>
      </div>
    </div>
  );
}
