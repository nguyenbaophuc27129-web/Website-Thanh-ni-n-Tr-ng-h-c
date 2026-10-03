"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Ban, Heart, ImagePlus, ImageIcon, LogIn, MessagesSquare, MessageSquareText, PenLine, Send, ShieldCheck, Sparkles, UserPlus, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { moderateText } from "@/lib/ai-moderation";
import { readForumMediaFiles } from "@/lib/forum-media";
import { avatarInitials, avatarTone } from "@/lib/forum-alias";
import { formatDateTime, relTime } from "@/lib/utils";
import type { ForumMedia, ForumThread } from "@/types";

const TOPICS = ["Học tập", "Hoạt động Đoàn", "Góp ý", "Khoa học", "Làm quen"];

export default function DienDanPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [media, setMedia] = useState<ForumMedia[]>([]);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const threads = useMemo(() => {
    const visible = store.forumThreads.filter((t) => t.status === "PUBLISHED");
    const lastActivity = (t: ForumThread) => {
      const comments = store.forumComments.filter((c) => c.threadId === t.id && c.status === "PUBLISHED");
      return comments.map((c) => c.createdAt).reduce((acc, v) => (v > acc ? v : acc), t.createdAt);
    };
    return visible.sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  }, [store.forumThreads, store.forumComments]);

  const commentCount = (threadId: number) =>
    store.forumComments.filter((c) => c.threadId === threadId && c.status === "PUBLISHED").length;

  const myPending = useMemo(() => {
    if (!session) return [];
    return store.forumThreads.filter(
      (t) => t.status === "HIDDEN" && t.aiVerdict === "FLAGGED" && !t.moderatedByAccountId && t.authorAccountId === session.accountId
    );
  }, [store.forumThreads, session]);

  // Bài của mình bị Ban biên tập từ chối — chỉ tác giả thấy để biết lý do
  const myRejected = useMemo(() => {
    if (!session) return [];
    return store.forumThreads.filter(
      (t) => t.status === "HIDDEN" && !!t.rejectionReason && t.authorAccountId === session.accountId
    );
  }, [store.forumThreads, session]);

  const onPickMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const res = await readForumMediaFiles(e.target.files ?? [], media);
    if ("error" in res) toast(res.error, "warning");
    else setMedia(res.media);
    e.target.value = "";
  };

  const submitThread = async () => {
    if (!session) return;
    const t = title.trim();
    const c = content.trim();
    if (t.length < 5 || c.length < 10) {
      toast("Tiêu đề cần tối thiểu 5 ký tự, nội dung tối thiểu 10 ký tự.", "warning");
      return;
    }
    setChecking(true);
    const mod = await moderateText(`${t}\n${c}`);
    setChecking(false);
    store.createForumThread(session, { title: t, content: c, topic: topic || undefined, media: media.length ? media : undefined }, mod);
    setTitle("");
    setContent("");
    setTopic("");
    setMedia([]);
    toast(
      mod.verdict === "CLEAN"
        ? "Đã đăng bài ẩn danh — cảm ơn bạn đã chia sẻ!"
        : `Bài của bạn đang chờ kiểm duyệt: ${mod.reason ?? "nội dung đáng ngờ"}.`,
      mod.verdict === "CLEAN" ? "success" : "warning"
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Diễn đàn Đoàn viên</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Nơi đoàn viên, học sinh - sinh viên chia sẻ thẳng thắn — không cần lộ danh tính.
          </p>
        </div>
      </div>

      {/* ===== Strip ẩn danh ===== */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 to-cyan-50/60 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Hoàn toàn ẩn danh.</span> Mỗi bài đăng dùng một bí danh ngẫu nhiên
          (VD: “Bằng Lăng Tim Xanh #2481”) — kể cả Ban biên tập cũng không thấy danh tính thật.
        </p>
      </div>

      {/* ===== Composer ===== */}
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.05)] sm:p-7">
        {session ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <PenLine className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Chia sẻ điều bạn muốn nói…</p>
                <p className="text-[11px] text-slate-400">Bài đăng sẽ hiện với bí danh ngẫu nhiên mới</p>
              </div>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề (tối thiểu 5 ký tự)"
              maxLength={150}
              className="mt-4 w-full rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung chia sẻ (tối thiểu 10 ký tự)…"
              rows={4}
              maxLength={2000}
              className="mt-3 w-full resize-none rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
            />
            {media.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {media.map((m, i) => (
                  <span key={i} className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-slate-600">
                    {m.kind === "image" ? <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> : <span className="text-[10px] font-bold text-purple-500">VIDEO</span>}
                    <span className="max-w-40 truncate">{m.name ?? (m.kind === "image" ? "Ảnh" : "Video")}</span>
                    <button
                      type="button"
                      onClick={() => setMedia(media.filter((_, j) => j !== i))}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="self-center text-[10px] text-slate-400">Ảnh ≤2MB × 4 · video ≤15MB × 1</span>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(topic === t ? "" : t)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      topic === t
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[11px] text-slate-400">{content.length}/2000</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={onPickMedia}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-cyan-300 hover:text-cyan-600"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Ảnh / video
                </button>
                <button
                  onClick={submitThread}
                  disabled={checking}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {checking ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" /> AI đang kiểm duyệt…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Đăng ẩn danh
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MessagesSquare className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Đăng nhập để tham gia thảo luận</p>
              <p className="text-xs text-slate-500">Bạn vẫn ẩn danh hoàn toàn khi đăng bài — chỉ cần tài khoản Đoàn viên.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/dang-nhap"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
              >
                <LogIn className="h-3.5 w-3.5" /> Đăng nhập
              </Link>
              <Link
                href="/dang-ky"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:brightness-110"
              >
                <UserPlus className="h-3.5 w-3.5" /> Đăng ký Đoàn viên
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ===== Bài của tôi đang chờ duyệt ===== */}
      {myPending.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-sm font-semibold text-amber-800">Bài của bạn đang chờ duyệt ({myPending.length})</p>
          <ul className="mt-3 space-y-2">
            {myPending.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs text-amber-900">
                <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">CHỜ DUYỆT</span>
                <span className="font-semibold">{t.title}</span>
                <span className="text-amber-700/80">— {t.aiReason ?? "AI đang chờ Ban biên tập xác nhận"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ===== Bài của tôi bị từ chối ===== */}
      {myRejected.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
            <Ban className="h-4 w-4" /> Bài của bạn bị từ chối ({myRejected.length})
          </p>
          <ul className="mt-3 space-y-2">
            {myRejected.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs text-rose-900">
                <span className="rounded-full bg-rose-200/70 px-2 py-0.5 text-[10px] font-bold text-rose-800">BỊ TỪ CHỐI</span>
                <span className="font-semibold">{t.title}</span>
                <span className="text-rose-700/80">— Lý do: {t.rejectionReason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] text-rose-500/80">Bạn có thể đăng lại bài mới với nội dung phù hợp hơn.</p>
        </div>
      ) : null}

      {/* ===== Feed ===== */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {threads.map((t, i) => {
          const liked = session ? t.likedByAccountIds.includes(session.accountId) : false;
          const lastAt = store.forumComments
            .filter((c) => c.threadId === t.id && c.status === "PUBLISHED")
            .map((c) => c.createdAt)
            .reduce((acc, v) => (v > acc ? v : acc), t.createdAt);
          return (
            <motion.article
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
              className="group flex flex-col rounded-3xl border-[0.5px] border-slate-200 bg-white/80 p-6 shadow-[0_8px_30px_rgb(15,23,42,0.04)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-2xl hover:shadow-blue-500/10"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarTone(t.alias)}`}>
                  {avatarInitials(t.alias)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{t.alias}</p>
                  <p className="text-[11px] text-slate-400" title={formatDateTime(t.createdAt)}>
                    {mounted ? relTime(lastAt) : formatDateTime(lastAt)}
                  </p>
                </div>
                {t.topic ? (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">{t.topic}</span>
                ) : null}
                {t.media?.length ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                    <ImageIcon className="h-3 w-3" /> {t.media.length}
                  </span>
                ) : null}
              </div>
              <Link href={`/dien-dan/${t.id}`} className="mt-4">
                <h2 className="text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-700">
                  {t.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{t.content}</p>
              </Link>
              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3.5">
                <button
                  onClick={() => (session ? store.toggleForumLike(session, "THREAD", t.id) : toast("Đăng nhập để thả cảm xúc.", "warning"))}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    liked ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-50 hover:text-rose-500"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                  {t.likedByAccountIds.length}
                </button>
                <Link
                  href={`/dien-dan/${t.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-blue-600"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {commentCount(t.id)} bình luận
                </Link>
              </div>
            </motion.article>
          );
        })}
        {threads.length === 0 ? (
          <div className="col-span-full flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white py-16">
            <MessagesSquare className="h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">Chưa có bài viết nào — hãy là người đầu tiên chia sẻ!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
