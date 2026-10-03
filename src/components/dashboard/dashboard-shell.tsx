"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Activity, ClipboardList, CheckSquare, Calculator, Megaphone,
  FileBarChart, BarChart3, Trophy, FileText, BellRing, LifeBuoy, FolderOpen,
  Network, Users, ShieldCheck, Database, Settings, LogOut, Globe, Menu, X, ChevronDown,
  Radio, Sparkles, Flag, MessagesSquare, PenLine, MonitorPlay, BookMarked, MapPinned,
  GraduationCap, Handshake, UserCircle,
} from "lucide-react";
import { useAuth, ROLE_LABELS } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { useAssignmentReminders } from "@/lib/use-assignment-reminders";
import { cn, formatDateTime } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, ready, logout } = useAuth();
  const store = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // Nhắc việc tự động — phải đứng TRƯỚC early return (quy tắc hooks)
  useAssignmentReminders();

  useEffect(() => {
    if (ready && !session) router.replace("/dang-nhap");
  }, [ready, session, router]);

  useEffect(() => {
    setMobileOpen(false);
    setBellOpen(false);
    setUserOpen(false);
  }, [pathname]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-stone-500">Đang kiểm tra phiên đăng nhập…</p>
      </div>
    );
  }

  // Đoàn viên không vào khu quản trị — chỉ tương tác diễn đàn công khai
  if (session.role === "DOAN_VIEN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-md rounded-3xl bg-white p-9 text-center shadow-[0_24px_80px_rgb(15,23,42,0.10)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Users className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Khu quản trị dành cho cán bộ Đoàn</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Tài khoản Đoàn viên của bạn dùng để tham gia Diễn đàn ẩn danh. Nhấn bên dưới để vào diễn đàn nhé!
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/dien-dan"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110"
            >
              <MessagesSquare className="h-4 w-4" /> Vào Diễn đàn
            </Link>
            <Link
              href="/tai-khoan"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <UserCircle className="h-4 w-4" /> Tài khoản của tôi
            </Link>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  const role = session.role;
  const myNotifications = store.notifications
    .filter((n) => n.recipientAccountId === session.accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = myNotifications.filter((n) => !n.isRead).length;

  const pendingReviews = store.taskAssignments.filter(
    (a) =>
      store.scopeIds(session).includes(a.orgUnitId) &&
      a.orgUnitId !== session.orgUnitId &&
      (a.confirmStatus === "PENDING" || a.confirmStatus === "NEEDS_INFO")
  ).length;

  // Diễn đàn: bình luận chờ duyệt + bài bị AI gắn cờ chưa xử lý
  const pendingForum =
    store.forumComments.filter((c) => c.status === "PENDING_REVIEW").length +
    store.forumThreads.filter((t) => t.aiVerdict === "FLAGGED" && !t.moderatedByAccountId).length;

  // Đóng góp cộng đồng: bài viết chờ duyệt + tài nguyên đoàn viên gửi (nháp)
  const pendingContributions =
    store.memberContributions.filter((c) => c.status === "PENDING").length +
    store.resources.filter((r) => r.submittedByAccountId && r.status === "DRAFT").length;
  // Dự án tình nguyện chờ ghim bản đồ
  const pendingProjects = store.volunteerProjects.filter((p) => p.status === "PENDING").length;

  const groups: NavGroup[] = [];
  const overviewItems: NavItem[] = [
    { href: "/quan-tri", label: "Bảng điều khiển", icon: LayoutDashboard },
    { href: "/quan-tri/chuong-trinh", label: "Chương trình", icon: Flag },
  ];
  if (role === "QUAN_TRI_TW" || role === "QUAN_TRI_TINH" || role === "QUAN_TRI_CAP3") {
    overviewItems.push({ href: "/quan-tri/truc-tiep", label: "Trực tiếp & cảnh báo", icon: Radio });
  }
  groups.push({ title: "Tổng quan", items: overviewItems });

  groups.push({
    title: "Hoạt động",
    items: [{ href: "/quan-tri/hoat-dong", label: "Quản lý hoạt động", icon: Activity }],
  });

  const taskItems: NavItem[] = [{ href: "/quan-tri/nhiem-vu", label: "Nhiệm vụ & chỉ tiêu", icon: ClipboardList }];
  if (role === "QUAN_TRI_TW" || role === "QUAN_TRI_TINH" || role === "QUAN_TRI_CAP3") {
    taskItems.push({ href: "/quan-tri/nhiem-vu/ai-phan-tich", label: "AI phân tích công văn", icon: Sparkles });
    taskItems.push({ href: "/quan-tri/nhiem-vu/xac-nhan", label: "Xác nhận báo cáo", icon: CheckSquare, badge: pendingReviews || undefined });
  }
  if (role !== "BIEN_TAP_VIEN") {
    taskItems.push({ href: "/quan-tri/nhiem-vu/cham-diem", label: "Chấm điểm thi đua", icon: Calculator });
  }
  groups.push({ title: "Nhiệm vụ & thi đua", items: taskItems });

  // Mở cho mọi cấp — đơn vị tự đăng tin từ hoạt động của mình, Ban TNTH giám sát và gỡ nếu vi phạm
  const mediaItems: NavItem[] = [{ href: "/quan-tri/xuat-ban", label: "Xuất bản tin bài", icon: Megaphone }];
  if (role === "QUAN_TRI_TW" || role === "BIEN_TAP_VIEN") {
    mediaItems.push({ href: "/quan-tri/dong-gop", label: "Duyệt đóng góp", icon: PenLine, badge: pendingContributions || undefined });
  }
  mediaItems.push({ href: "/quan-tri/thi", label: "Thi trực tuyến", icon: MonitorPlay });
  groups.push({ title: "Truyền thông", items: mediaItems });

  const reportItems: NavItem[] = [{ href: "/quan-tri/bao-cao", label: "Báo cáo", icon: FileBarChart }];
  if (role !== "DON_VI" && role !== "BIEN_TAP_VIEN") {
    reportItems.push({ href: "/quan-tri/thong-ke", label: "Thống kê tổng hợp", icon: BarChart3 });
  }
  if (role !== "BIEN_TAP_VIEN") {
    reportItems.push({ href: "/quan-tri/bang-xep-hang", label: "Bảng xếp hạng", icon: Trophy });
  }
  groups.push({ title: "Báo cáo & xếp hạng", items: reportItems });

  const docItems: NavItem[] = [
    { href: "/quan-tri/van-ban", label: "Văn bản", icon: FileText },
    { href: "/quan-tri/thong-bao", label: "Thông báo", icon: BellRing, badge: unreadCount || undefined },
  ];
  groups.push({ title: "Văn bản & thông báo", items: docItems });

  const fbResItems: NavItem[] = [];
  if (role === "QUAN_TRI_TW" || role === "QUAN_TRI_TINH" || role === "QUAN_TRI_CAP3") {
    fbResItems.push({ href: "/quan-tri/phan-anh", label: "Phản ánh", icon: LifeBuoy });
  }
  fbResItems.push({ href: "/quan-tri/tai-nguyen", label: "Tài nguyên", icon: FolderOpen });
  groups.push({ title: "Phản ánh & tài nguyên", items: fbResItems });

  const communityItems: NavItem[] = [];
  if (role === "QUAN_TRI_TW") {
    communityItems.push({ href: "/quan-tri/dien-dan", label: "Kiểm duyệt Diễn đàn", icon: MessagesSquare, badge: pendingForum || undefined });
  }
  communityItems.push(
    { href: "/quan-tri/danh-ba", label: "Danh bạ Đoàn trường", icon: BookMarked },
    { href: "/quan-tri/du-an", label: "Dự án tình nguyện", icon: MapPinned, badge: pendingProjects || undefined },
    { href: "/quan-tri/hs3t", label: "Hồ sơ HS3T", icon: GraduationCap }
  );
  if (role === "QUAN_TRI_TW") {
    communityItems.push({ href: "/quan-tri/tai-tro", label: "Nhà tài trợ", icon: Handshake });
  }
  groups.push({ title: "Cộng đồng & chương trình", items: communityItems });

  if (role === "QUAN_TRI_TW" || role === "QUAN_TRI_TINH" || role === "QUAN_TRI_CAP3") {
    groups.push({
      title: "Hệ thống",
      items: [
        { href: "/quan-tri/he-thong/don-vi", label: "Cây đơn vị", icon: Network },
        { href: "/quan-tri/he-thong/tai-khoan", label: "Tài khoản", icon: Users },
        { href: "/quan-tri/he-thong/phan-quyen", label: "Phân quyền", icon: ShieldCheck },
        { href: "/quan-tri/he-thong/danh-muc", label: "Danh mục", icon: Database },
        ...(role === "QUAN_TRI_TW" ? [{ href: "/quan-tri/he-thong/cai-dat", label: "Cài đặt", icon: Settings }] : []),
      ],
    });
  }

  const isActive = (href: string) =>
    href === "/quan-tri" ? pathname === "/quan-tri" : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/quan-tri" className="flex items-center gap-2.5 border-b border-stone-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-doan-600">
          <span className="text-lg text-vang-300">★</span>
        </div>
        <div>
          <p className="font-serif-display text-sm font-bold leading-tight text-stone-900">Khu quản trị</p>
          <p className="text-[10px] text-stone-400">Thanh niên Trường học</p>
        </div>
      </Link>

      <nav className="thin-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-doan-600 text-white shadow-sm"
                        : "text-stone-600 hover:bg-slate-50 hover:text-stone-900"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        isActive(item.href) ? "bg-white/25 text-white" : "bg-doan-100 text-doan-700"
                      )}>
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-200 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-600 hover:bg-slate-50"
        >
          <Globe className="h-4 w-4" /> Xem website công khai
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200/80 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur px-4 lg:px-6">
          <button className="rounded-md p-2 text-stone-500 hover:bg-slate-50 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 items-center gap-2 text-sm text-stone-500 hidden md:flex">
            <span className="font-medium text-stone-900">{session.orgUnitName}</span>
            <span className="rounded-full bg-doan-50 px-2 py-0.5 text-[10px] font-semibold text-doan-700">
              {ROLE_LABELS[role]}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-lg p-2 text-stone-500 hover:bg-slate-50"
                aria-label="Thông báo"
              >
                <BellRing className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-doan-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {bellOpen ? (
                <div className="absolute right-0 top-11 z-40 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-stone-900">Thông báo</p>
                    <button
                      onClick={() => store.markAllNotificationsRead(session.accountId)}
                      className="text-[11px] font-medium text-doan-600 hover:underline"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>
                  <div className="thin-scrollbar max-h-96 overflow-y-auto">
                    {myNotifications.slice(0, 8).map((n) => (
                      <Link
                        key={n.id}
                        href={n.linkUrl ?? "/quan-tri/thong-bao"}
                        onClick={() => store.markNotificationRead(n.id)}
                        className={cn(
                          "block border-b border-stone-50 px-4 py-3 hover:bg-stone-50",
                          !n.isRead && "bg-doan-50/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-xs", !n.isRead ? "font-semibold text-stone-900" : "font-medium text-stone-600")}>
                            {n.title}
                          </p>
                          {!n.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-doan-600" /> : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500">{n.message}</p>
                        <p className="mt-1 text-[10px] text-stone-400">{formatDateTime(n.createdAt)}</p>
                      </Link>
                    ))}
                    {myNotifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-stone-400">Chưa có thông báo</p>
                    ) : null}
                  </div>
                  <Link href="/quan-tri/thong-bao" className="block bg-stone-50 px-4 py-2.5 text-center text-[11px] font-semibold text-doan-700 hover:bg-slate-50">
                    Xem tất cả thông báo
                  </Link>
                </div>
              ) : null}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-doan-600 text-xs font-bold text-white">
                  {session.contactPerson.split(" ").map((w) => w[0]).slice(-2).join("")}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold text-stone-900">{session.contactPerson}</p>
                  <p className="text-[10px] text-stone-400">{session.username}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
              </button>
              {userOpen ? (
                <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                  <div className="border-b border-stone-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-stone-900">{session.contactPerson}</p>
                    <p className="text-[10px] text-stone-500">{session.contactPosition}</p>
                    <p className="mt-1 text-[10px] text-stone-400">{session.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); router.push("/"); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-doan-700 hover:bg-doan-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
