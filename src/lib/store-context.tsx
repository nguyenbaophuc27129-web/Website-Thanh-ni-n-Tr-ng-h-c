"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  Activity, Account, AssignmentReview, AssignmentTarget, Attendance,
  ContributionKind, ContributionLog, CriteriaSet,
  DocumentRecord, DocumentRecipient, EmailLog, Feedback, FeedbackMessage, ForumComment, ForumMedia, ForumThread,
  Hs3tAchievement, Hs3tCategory, Hs3tProfile, Hs3tUnitStandard, LiveEvent, MemberContribution, ModerationResult, Notification,
  OrgDirectory, PublishedPost, QuizAnswer, QuizAttempt, QuizExam, QuizQuestion,
  RankingEntry, RankingSnapshot, Report, Resource, Score,
  SystemSetting, Task, TaskAssignment, TaskMetric, TaskResult, VolunteerProject,
  VolunteerProjectField, VolunteerProjectPhase,
} from "@/types";
import { CONTRIBUTION_POINTS } from "@/types";
import { orgUnits as seedOrgUnits, descendantIds } from "@/data/org-units";
import { accounts as seedAccounts } from "@/data/accounts";
import { contentCategories, documentCategories, resourceTypes, feedbackTopics } from "@/data/categories";
import { activities as seedActivities } from "@/data/activities";
import { criteriaSets as seedCriteriaSets, tasks as seedTasks, taskMetrics as seedTaskMetrics } from "@/data/criteria-tasks";
import { taskAssignments as seedAssignments, assignmentTargets as seedTargets, taskResults as seedResults, assignmentReviews as seedReviews } from "@/data/task-assignments";
import { scores as seedScores } from "@/data/scores";
import { publishedPosts as seedPosts } from "@/data/published-posts";
import { rankingSnapshots as seedSnapshots, rankingEntries as seedEntries } from "@/data/rankings";
import { reports as seedReports } from "@/data/reports";
import { documents as seedDocuments, documentRecipients as seedRecipients } from "@/data/documents";
import { notifications as seedNotifications } from "@/data/notifications";
import { feedbacks as seedFeedbacks, feedbackMessages as seedMessages } from "@/data/feedbacks";
import { liveEvents as seedLiveEvents } from "@/data/live-events";
import { resources as seedResources, systemSettings as seedSettings } from "@/data/resources";
import { FORUM_THREADS as seedForumThreads, FORUM_COMMENTS as seedForumComments } from "@/data/forum";
import { orgDirectories as seedDirectories } from "@/data/directory";
import { volunteerProjects as seedVolunteerProjects } from "@/data/volunteer-projects";
import { quizQuestions as seedQuizQuestions } from "@/data/quiz-bank";
import { quizExams as seedQuizExams } from "@/data/quiz-exams";
import { hs3tProfiles as seedHs3tProfiles, hs3tAchievements as seedHs3tAchievements, hs3tUnitStandards as seedHs3tUnitStandards } from "@/data/hs3t";
import { callPublicApi, type ApiResult } from "@/lib/public-api-client";
import { useAuth, type Session } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

/* ---------------- Input types ---------------- */

/** Thông tin người gửi phản ánh — mã tra cứu, tài khoản, trạng thái do máy chủ quyết định */
export interface FeedbackSubmitInput {
  senderName: string; senderEmail: string; senderPhone?: string; senderOrgText?: string;
  senderCommuneUnion?: string; senderProvinceUnion?: string; evidenceNames?: string[];
  feedbackTopicId: number; title: string; content: string;
}

/** Kết quả bắt đầu lượt thi: lượt thi + mã bí mật của lượt (chỉ người giữ mã mới nộp được) */
export interface QuizStartResult {
  attempt: QuizAttempt;
  accessToken: string;
  /** Đề thích ứng: câu đầu tiên do máy chủ chọn */
  firstQuestionId: number | null;
}

/** Kết quả nộp bài — điểm do máy chủ chấm theo đáp án trong DB */
export interface QuizSubmitResult {
  attempt: QuizAttempt;
  perQuestion: { questionId: number; points: number; maxPoints: number; correct: boolean | null }[];
  /** Nộp quá giờ (kể cả thời gian bù) — đáp án gửi kèm bị bỏ qua */
  late: boolean;
}

export interface ActivityInput {
  title: string; summary: string; startDate: string; endDate: string;
  location?: string; participantCount?: number; categoryIds: number[];
  links: { platform: string; url: string; note?: string }[];
  imageSeed?: number;
  taskId?: number;
  taskMetricId?: number;
  metricContributionValue?: number;
}

export interface ScoreInput {
  criteriaSetId: number; taskId: number; orgUnitId: number;
  /** Chấm chi tiết theo điều kiện (BTS 2027) */
  metricId?: number | null;
  points: number; note?: string; method?: string;
}

/** Đầu vào của AI lượng hoá công văn → 1 nhiệm vụ mới kèm nhiều chỉ tiêu, giao nhiều đơn vị */
export interface DirectiveTaskInput {
  title: string;
  description?: string;
  dueDate: string;
  metrics: { name: string; unit: string; targetValue: number; aggregationType: "SUM" | "COUNT" | "AVG" | "MAX" | "PERCENT" }[];
  targetOrgUnitIds: number[];
  sourceDocNumber?: string;
}

let uid = 900000;
/**
 * Id do trình duyệt sinh: theo thời gian (µs giả lập) + ngẫu nhiên để 2 máy tạo
 * cùng lúc không trùng id (trùng id = UPSERT đè bản ghi của người khác).
 * Vẫn luôn lớn hơn id lớn nhất đã nạp từ DB.
 */
const nextId = () => (uid = Math.max(uid + 1, Date.now() * 1000 + Math.floor(Math.random() * 1000)));

const nowISO = () => new Date().toISOString();

/** Dựng 1 sự kiện trực tiếp ngẫu nhiên từ dữ liệu seed thật của đơn vị */
function buildRandomLiveEvent(unit: (typeof seedOrgUnits)[number]): Omit<LiveEvent, "id" | "createdAt" | "orgUnitId"> {
  const pool: { eventType: LiveEvent["eventType"]; title: string }[] = [];
  const acts = seedActivities.filter((a) => a.orgUnitId === unit.id);
  const asgs = seedAssignments.filter((a) => a.orgUnitId === unit.id);
  const reps = seedReports.filter((r) => r.orgUnitId === unit.id);
  for (const a of acts) {
    pool.push({
      eventType: Math.random() < 0.6 ? "ACTIVITY_SUBMITTED" : "ACTIVITY_CONFIRMED",
      title: `${unit.shortName} cập nhật hoạt động "${a.title}"`,
    });
  }
  for (const asg of asgs) {
    const t = seedTasks.find((x) => x.id === asg.taskId);
    pool.push({
      eventType: "TASK_RESULT",
      title: `${unit.shortName} báo cáo kết quả nhiệm vụ "${t?.title ?? asg.taskId}" (${Math.round(asg.completionRate)}%)`,
    });
  }
  for (const r of reps) {
    pool.push({ eventType: "REPORT_CREATED", title: `${unit.shortName} lập ${r.title.toLowerCase()}` });
  }
  if (pool.length === 0) {
    pool.push({ eventType: "ACTIVITY_SUBMITTED", title: `${unit.shortName} cập nhật hoạt động phong trào mới` });
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Seed điểm danh cho activity 101/102 */
const seedAttendances: Attendance[] = [];

/* ---------------- Đồng bộ PostgreSQL qua /api/store ----------------
 * Client chỉ gửi các dòng mới/đổi (xem StoreProvider). Server UPSERT từng dòng,
 * xoá theo tombstone; bảng con của Activity (categories/links) thay theo hoạt động. */

/** Khoá so khớp 1 dòng — bảng không có cột id dùng khoá tự nhiên */
function syncRowKey(entity: string, row: Record<string, unknown>): string {
  switch (entity) {
    case "settings":
      return String(row.settingKey);
    case "documentRecipients":
      return `${row.documentId}:${row.orgUnitId}`;
    default:
      return String(row.id);
  }
}

/**
 * Ghép dữ liệu mới nạp từ DB vào state hiện tại: dòng nào nội dung không đổi
 * thì giữ nguyên đối tượng cũ (không re-render, không bị coi là "đã sửa").
 * Không có gì đổi → trả lại đúng mảng cũ.
 */
function reconcileRows(
  entity: string,
  current: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  const byKey = new Map(current.map((r) => [syncRowKey(entity, r), r]));
  let same = current.length === incoming.length;
  const next = incoming.map((row, i) => {
    const old = byKey.get(syncRowKey(entity, row));
    if (old !== undefined && JSON.stringify(old) === JSON.stringify(row)) {
      if (current[i] !== old) same = false;
      return old;
    }
    same = false;
    return row;
  });
  return same ? current : next;
}

/* Phạm vi entity được GỬI SYNC theo phiên đăng nhập — phải khớp gate phía
 * server (src/lib/server/store-tables.ts). Phần entity ngoài phạm vi KHÔNG gửi
 * kèm mà giữ lại dirty, tránh server từ chối cả lô (401/403) làm kẹt dữ liệu
 * hợp lệ khác trong cùng POST.
 * Khách & đoàn viên KHÔNG ghi qua /api/store (tập rỗng = không gửi gì): thao tác của
 * họ đi qua API riêng rồi adoptServerRows. Cán bộ được server kiểm quyền từng dòng. */
const GUEST_WRITE_ENTITIES = new Set<string>();
const MEMBER_WRITE_ENTITIES = new Set<string>();
/** null = cán bộ (scope full) — gửi mọi entity; tập rỗng = không gửi entity nào */
const scopeAllowedEntities = (session: Session | null): Set<string> | null =>
  !session ? GUEST_WRITE_ENTITIES : session.role === "DOAN_VIEN" ? MEMBER_WRITE_ENTITIES : null;

/** Kết quả thao tác ghi qua API riêng (đoàn viên) — `mod` là kết quả kiểm duyệt do máy chủ tính */
export type MemberWriteResult =
  | { ok: true; id: number; mod?: ModerationResult; liked?: boolean; likeCount?: number }
  | { ok: false; error: string; busy?: boolean };

/** POST JSON tới API ghi riêng; lỗi mạng / bị từ chối → thông báo tiếng Việt */
async function postMemberApi<T>(url: string, body: unknown): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const j = (await r.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
    if (!r.ok || !j?.ok) return { ok: false, error: j?.error ?? `Máy chủ từ chối yêu cầu (HTTP ${r.status}).` };
    return { ...j, ok: true };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại." };
  }
}

/** Kết quả kiểm duyệt máy chủ trả về → ModerationResult phía client */
const modOf = (j: { verdict?: ModerationResult["verdict"]; reason?: string | null }): ModerationResult | undefined =>
  j.verdict ? { verdict: j.verdict, reason: j.reason ?? undefined } : undefined;

interface StoreValue {
  /* data */
  orgUnits: typeof seedOrgUnits;
  setOrgUnits: Dispatch<SetStateAction<typeof seedOrgUnits>>;
  accounts: Account[];
  contentCategories: typeof contentCategories;
  documentCategories: typeof documentCategories;
  resourceTypes: typeof resourceTypes;
  feedbackTopics: typeof feedbackTopics;
  activities: Activity[];
  publishedPosts: PublishedPost[];
  criteriaSets: CriteriaSet[];
  tasks: Task[];
  taskMetrics: TaskMetric[];
  taskAssignments: TaskAssignment[];
  assignmentTargets: AssignmentTarget[];
  taskResults: TaskResult[];
  assignmentReviews: AssignmentReview[];
  scores: Score[];
  rankingSnapshots: RankingSnapshot[];
  rankingEntries: RankingEntry[];
  reports: Report[];
  documents: DocumentRecord[];
  documentRecipients: DocumentRecipient[];
  notifications: Notification[];
  feedbacks: Feedback[];
  feedbackMessages: FeedbackMessage[];
  attendances: Attendance[];
  attendanceOpenIds: number[];
  liveEvents: LiveEvent[];
  liveEnabled: boolean;
  setLiveEnabled: (on: boolean) => void;
  resources: Resource[];
  settings: SystemSetting[];

  /* selectors */
  orgName: (id: number) => string;
  orgById: (id: number) => (typeof seedOrgUnits)[number] | undefined;
  accountByOrgUnit: (orgUnitId: number) => Account | undefined;
  scopeIds: (session: Session) => number[];
  taskMetricsOf: (taskId: number) => TaskMetric[];
  targetsOf: (assignmentId: number) => AssignmentTarget[];
  resultsOf: (assignmentId: number) => TaskResult[];
  reviewsOf: (assignmentId: number) => AssignmentReview[];
  descendantsOf: (id: number) => number[];
  activeCriteriaSet: () => CriteriaSet | undefined;
  docRecipientsOf: (documentId: number) => DocumentRecipient[];

  /* activities (R1) */
  createActivity: (session: Session, input: ActivityInput, submit: boolean) => number;
  updateActivity: (id: number, input: ActivityInput) => void;
  deleteActivity: (id: number) => void;
  submitActivity: (session: Session, id: number) => void;
  reviewActivity: (session: Session, id: number, action: "CONFIRM" | "NEEDS_INFO" | "REJECT", note?: string) => void;

  /* posts (R2) */
  savePost: (post: PublishedPost) => void;
  setPostStatus: (id: number, status: PublishedPost["status"]) => void;
  createPostFromActivity: (session: Session, activityId: number | null, title: string, excerpt: string, extras?: Partial<PublishedPost>) => number;

  /* tasks (R3) */
  distributeAssignment: (session: Session, taskId: number, parentAssignmentId: number | null, orgUnitId: number, dueDate: string, targets: { taskMetricId: number; targetValue: number }[], note?: string) => void;
  /** Tạo nhiệm vụ từ AI lượng hoá công văn — tạo Task + TaskMetrics + giao nhiều đơn vị + thông báo, trả về id */
  createDirectiveTask: (session: Session, input: DirectiveTaskInput) => { taskId: number; assignmentIds: number[] };
  updateResult: (session: Session, assignmentId: number, values: { assignmentTargetId: number; reportedValue: number }[], note?: string) => void;
  reviewAssignment: (session: Session, assignmentId: number, action: AssignmentReview["action"], note?: string) => void;
  /** Đánh dấu nhanh tiến độ (hoàn thành / đang làm / chưa bắt đầu) ngay từ danh sách nhiệm vụ */
  setAssignmentProgress: (session: Session, assignmentId: number, status: TaskAssignment["progressStatus"]) => void;
  revokeAssignment: (session: Session, assignmentId: number) => void;
  saveScore: (session: Session, input: ScoreInput) => void;

  /* reports (R4) */
  createReport: (session: Session, input: Omit<Report, "id" | "createdAt" | "exports" | "status">) => number;
  updateReport: (id: number, patch: Partial<Report>) => void;
  finalizeReport: (id: number) => void;
  exportReport: (id: number, format: Report["exports"][number]["exportFormat"]) => void;

  /* rankings (R6) */
  createRankingSnapshot: (session: Session, input: Omit<RankingSnapshot, "id" | "generatedAt" | "generatedByAccountId" | "status">) => number;
  finalizeRanking: (id: number) => void;

  /* documents (R7) */
  issueDocument: (session: Session, input: Omit<DocumentRecord, "id" | "createdAt" | "status" | "issuingOrgUnitId">, selectedIds?: number[]) => void;
  revokeDocument: (id: number) => void;
  markDocumentRead: (documentId: number, orgUnitId: number) => void;

  /* notifications */
  addNotification: (n: Omit<Notification, "id" | "isRead" | "createdAt">) => void;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: (accountId: number) => void;

  /* feedbacks (R8) */
  /** Gửi phản ánh qua POST /api/phan-anh — trả mã tra cứu do máy chủ sinh */
  submitFeedback: (input: FeedbackSubmitInput) => Promise<ApiResult<{ code: string }>>;
  replyFeedback: (session: Session, feedbackId: number, content: string, internal: boolean) => void;
  setFeedbackStatus: (session: Session, feedbackId: number, status: Feedback["status"]) => void;
  /** Gửi email kết quả/phản hồi cho người gửi (giả lập SMTP) — trả về false nếu thiếu email */
  sendFeedbackResultEmail: (session: Session, feedbackId: number, kind?: EmailLog["kind"]) => boolean;
  emailLogs: EmailLog[];

  /* attendance (công khai, không cần session) */
  toggleAttendance: (session: Session, activityId: number, open: boolean) => void;
  /** Điểm danh qua POST /api/diem-danh — trả tổng số lượt đã điểm danh của hoạt động */
  addAttendance: (input: { activityId: number; memberName: string; memberClass?: string }) => Promise<ApiResult<{ count: number }>>;

  /* resources (R9) */
  saveResource: (input: Omit<Resource, "id" | "downloadCount">, id?: number) => void;
  deleteResource: (id: number) => void;
  downloadResource: (id: number) => void;

  /* system */
  updateSetting: (key: string, value: string) => void;
  updateAccountStatus: (accountId: number, status: Account["status"]) => void;
  updateAccount: (id: number, patch: {
    contactPerson?: string; email?: string; phone?: string;
    contactPosition?: string; chucDanh?: string; className?: string; status?: Account["status"];
    password?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateAccountPermissions: (accountId: number, perms: string[]) => Promise<{ ok: boolean; error?: string }>;
  refreshAccounts: () => Promise<void>;
  refreshOrgUnits: () => Promise<void>;
  deleteAccount: (accountId: number) => Promise<{ ok: boolean; error?: string }>;
  createAccount: (input: {
    orgUnitId: number; username: string; email: string; phone?: string; contactPerson: string;
    contactPosition: string; chucDanh?: string; className?: string; role: Account["role"]; status?: Account["status"]; password?: string;
    perms?: string[];
  }) => Promise<{ ok: boolean; error?: string }>;

  /* forum ẩn danh */
  forumThreads: ForumThread[];
  forumComments: ForumComment[];
  /** Đăng bài qua /api/dien-dan/bai-viet — máy chủ kiểm duyệt, sinh bí danh */
  createForumThread: (input: { title: string; content: string; topic?: string; media?: ForumMedia[] }) => Promise<MemberWriteResult>;
  createForumComment: (input: { threadId: number; content: string; media?: ForumMedia[] }) => Promise<MemberWriteResult>;
  /** Bật/tắt thích nguyên tử ở máy chủ (/api/dien-dan/thich) */
  toggleForumLike: (kind: "THREAD" | "COMMENT", id: number) => Promise<MemberWriteResult>;
  moderateForumItem: (session: Session, kind: "THREAD" | "COMMENT", id: number, action: "APPROVE" | "REJECT" | "HIDE", reason?: string) => void;

  /* v12 — đóng góp cộng đồng & chương trình */
  contributions: ContributionLog[];
  memberContributions: MemberContribution[];
  createMemberContribution: (input: { categoryTag: string; title: string; excerpt: string; content: string; coverDataUrl?: string }) => Promise<MemberWriteResult>;
  moderateMemberContribution: (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string) => number | undefined;
  submitResourceDraft: (input: { resourceTypeId: number; title: string; description: string; fileName: string; fileSizeKb: number; fileDataUrl?: string }) => Promise<MemberWriteResult>;
  moderateResourceContribution: (session: Session, id: number, action: "APPROVE" | "REJECT") => void;
  orgDirectories: OrgDirectory[];
  saveDirectory: (session: Session, orgUnitId: number, input: { secretaryName: string; secretaryPhone: string; email: string; achievements: string; strengths: string; academicResources: string; clubs: string }) => void;
  volunteerProjects: VolunteerProject[];
  /** Đơn vị / tên trường do máy chủ lấy theo tài khoản đăng nhập */
  submitVolunteerProject: (input: { province: string; projectName: string; summary: string; beneficiaries: string; participants: number; field: VolunteerProjectField; phase: VolunteerProjectPhase; reportFile?: { name: string; dataUrl?: string } }) => Promise<MemberWriteResult>;
  moderateVolunteerProject: (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string) => void;
  quizQuestions: QuizQuestion[];
  quizExams: QuizExam[];
  saveQuizExam: (session: Session, input: { code: string; title: string; description?: string; durationMinutes: number; shuffleQuestions: boolean; shuffleOptions: boolean; adaptive: boolean; topics?: string[]; status?: QuizExam["status"] }, questionIds: number[]) => number;
  setQuizExamStatus: (id: number, status: QuizExam["status"]) => void;
  quizAttempts: QuizAttempt[];
  /** Bắt đầu lượt thi ở máy chủ (POST /api/thi/bat-dau) — tài khoản lấy từ phiên đăng nhập */
  startQuizAttempt: (examId: number, examinee: { name: string; orgText: string }) => Promise<ApiResult<QuizStartResult>>;
  /** Nộp bài (POST /api/thi/nop) — máy chủ chấm điểm, trình duyệt không gửi điểm */
  submitQuizAttempt: (attemptId: number, accessToken: string, answers: Record<number, QuizAnswer>) => Promise<ApiResult<QuizSubmitResult>>;
  gradeQuizAttempt: (session: Session, attemptId: number, manualPoints: number) => void;
  hs3tProfiles: Hs3tProfile[];
  hs3tAchievements: Hs3tAchievement[];
  hs3tUnitStandards: Hs3tUnitStandard[];
  /** Đoàn viên: lấy/tạo hồ sơ của chính mình qua /api/hs3t/ho-so; cán bộ: chỉ trả hồ sơ sẵn có */
  ensureHs3tProfile: (session: Session) => Promise<Hs3tProfile | null>;
  /** Đoàn viên → /api/hs3t/thanh-tich (chỉ hồ sơ của mình); cán bộ bổ sung hộ (asSchool) vẫn qua đồng bộ */
  addHs3tAchievement: (session: Session, profileId: number, input: { title: string; category: Hs3tCategory; sub?: string; evidenceNames?: string[]; achievedAt: string; asSchool?: boolean }) => Promise<MemberWriteResult>;
  awardHs3tLevel: (session: Session, profileId: number, level: "XA" | "TINH" | "TW") => void;
  /** Điều 5 — lưu tiêu chuẩn danh hiệu của đơn vị (không cao hơn chuẩn TW) */
  saveHs3tUnitStandard: (session: Session, input: { applyTw: boolean; daoDuc?: string; hocTap?: string; theLuc?: string; thanhTichKhac?: string; note?: string }) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  // Phiên mới nhất để flushSync đọc lúc bắn (tránh closure cũ)
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [orgUnits, setOrgUnits] = useState(seedOrgUnits);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [activities, setActivities] = useState(seedActivities);
  const [publishedPosts, setPublishedPosts] = useState(seedPosts);
  const [criteriaSets, setCriteriaSets] = useState(seedCriteriaSets);
  const [tasks, setTasks] = useState(seedTasks);
  const [taskMetrics, setTaskMetrics] = useState(seedTaskMetrics);
  const [taskAssignments, setTaskAssignments] = useState(seedAssignments);
  const [assignmentTargets, setAssignmentTargets] = useState(seedTargets);
  const [taskResults, setTaskResults] = useState(seedResults);
  const [assignmentReviews, setAssignmentReviews] = useState(seedReviews);
  const [scores, setScores] = useState(seedScores);
  const [rankingSnapshots, setRankingSnapshots] = useState(seedSnapshots);
  const [rankingEntries, setRankingEntries] = useState(seedEntries);
  const [reports, setReports] = useState(seedReports);
  const [documents, setDocuments] = useState(seedDocuments);
  const [documentRecipients, setDocumentRecipients] = useState(seedRecipients);
  const [notifications, setNotifications] = useState(seedNotifications);
  const [feedbacks, setFeedbacks] = useState(seedFeedbacks);
  const [feedbackMessages, setFeedbackMessages] = useState(seedMessages);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [attendances, setAttendances] = useState(seedAttendances);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(seedLiveEvents);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [resources, setResources] = useState(seedResources);
  const [settings, setSettings] = useState(seedSettings);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>(seedForumThreads);
  const [forumComments, setForumComments] = useState<ForumComment[]>(seedForumComments);
  const [contributions, setContributions] = useState<ContributionLog[]>([]);
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [orgDirectories, setOrgDirectories] = useState<OrgDirectory[]>(seedDirectories);
  const [volunteerProjects, setVolunteerProjects] = useState<VolunteerProject[]>(seedVolunteerProjects);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(seedQuizQuestions);
  const [quizExams, setQuizExams] = useState<QuizExam[]>(seedQuizExams);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [hs3tProfiles, setHs3tProfiles] = useState<Hs3tProfile[]>(seedHs3tProfiles);
  const [hs3tAchievements, setHs3tAchievements] = useState<Hs3tAchievement[]>(seedHs3tAchievements);
  const [hs3tUnitStandards, setHs3tUnitStandards] = useState<Hs3tUnitStandard[]>(seedHs3tUnitStandards);

  // Xóa toàn bộ tài khoản ảo còn sót trong localStorage trình duyệt
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("tnth_demo_created_accounts");
      } catch {}
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.accounts)) {
        setAccounts(data.accounts as Account[]);
      }
    } catch {
      // offline fallback
    }
  }, []);

  const refreshOrgUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/org-units");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.units)) {
        setOrgUnits(data.units as typeof seedOrgUnits);
      }
    } catch {
      // offline fallback
    }
  }, []);

  /* ============ Đồng bộ PostgreSQL: chỉ gửi DÒNG thay đổi ============
   * - baseRef: bản đã khớp với DB của từng dòng (theo tham chiếu đối tượng).
   *   Mọi cập nhật state đều bất biến (map/spread) nên dòng nào đổi là có đối
   *   tượng mới → so tham chiếu với baseRef là biết dòng nào cần gửi.
   * - Chỉ gửi dòng mới/đổi, không gửi cả bảng: lượt gửi nhỏ (kịp gửi khi F5/đóng tab,
   *   giới hạn keepalive ~64KB) và không đè thay đổi của người khác lên dòng mình không sửa.
   * - Nạp lại từ DB mỗi 4 giây chỉ áp khi máy không còn thay đổi chờ gửi.
   */

  // Ảnh state mới nhất để sync đọc lúc bắn (tránh closure cũ)
  const syncedStateRef = useRef<Record<string, unknown[]>>({});
  syncedStateRef.current = {
    criteriaSets, tasks, taskMetrics, taskAssignments, assignmentTargets, taskResults,
    assignmentReviews, scores, rankingSnapshots, rankingEntries,
    activities, publishedPosts, attendances, reports,
    documents, documentRecipients, notifications, feedbacks, feedbackMessages, emailLogs,
    liveEvents, resources, settings, forumThreads, forumComments,
    hs3tProfiles, hs3tAchievements, hs3tUnitStandards,
    quizQuestions, quizExams, quizAttempts, volunteerProjects,
    orgDirectories, memberContributions, contributions,
  };

  /** Dòng đã khớp DB, theo entity → khoá dòng → đối tượng */
  const baseRef = useRef<Record<string, Map<string, unknown>>>({});
  /** Dòng đổi ở máy, chờ gửi */
  const pendingRef = useRef<Record<string, Map<string, unknown>>>({});
  // Danh sách id đã xoá phía client chờ gửi DELETE lên server (tombstone)
  const deletedIdsRef = useRef<Record<string, number[]>>({});
  const prevArraysRef = useRef<Record<string, unknown[]>>({});
  /** Tăng mỗi khi có thay đổi cục bộ — kết quả nạp DB về trễ hơn thay đổi thì bỏ */
  const localVersionRef = useRef(0);
  const inFlightRef = useRef(false);
  const flushAgainRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(5000);
  const flushSyncRef = useRef<(immediate?: boolean) => Promise<void>>(async () => {});

  const hasPendingSync = () =>
    inFlightRef.current ||
    Object.values(pendingRef.current).some((m) => m.size > 0) ||
    Object.values(deletedIdsRef.current).some((ids) => ids.length > 0);

  const scheduleFlush = useCallback((delay = 1200) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void flushSyncRef.current();
    }, delay);
  }, []);

  // Theo dõi thay đổi state → ghi nhận dòng mới/đổi (chạy sau mỗi lần render)
  useEffect(() => {
    const allowed = scopeAllowedEntities(sessionRef.current);
    let found = false;
    for (const [entity, rows] of Object.entries(syncedStateRef.current)) {
      if (prevArraysRef.current[entity] === rows) continue;
      prevArraysRef.current[entity] = rows;
      const base = baseRef.current[entity];
      // Chưa nạp xong từ DB, hoặc phiên không được ghi entity này → không gửi
      if (!base || (allowed && !allowed.has(entity))) continue;
      for (const row of rows as Record<string, unknown>[]) {
        const key = syncRowKey(entity, row);
        if (base.get(key) === row) continue;
        (pendingRef.current[entity] ??= new Map()).set(key, row);
        found = true;
      }
    }
    if (found) {
      localVersionRef.current++;
      scheduleFlush();
    }
  });

  const flushSync = useCallback(async (immediate = false) => {
    if (inFlightRef.current) {
      flushAgainRef.current = true;
      return;
    }
    const entities: Record<string, unknown[]> = {};
    const sent: [string, string, unknown][] = [];
    for (const [entity, map] of Object.entries(pendingRef.current)) {
      if (map.size === 0) continue;
      const rows = [...map.values()];
      entities[entity] = rows;
      for (const [key, row] of map) sent.push([entity, key, row]);
      map.clear();
      if (entity === "activities") {
        // Bảng con lồng trong Activity — server thay toàn bộ con của các hoạt động này
        const acts = rows as Activity[];
        entities.activityCategories = acts.flatMap((a) => a.categoryIds.map((categoryId) => ({ activityId: a.id, categoryId })));
        entities.activityLinks = acts.flatMap((a) => a.links);
      }
    }
    const deletes: Record<string, number[]> = {};
    for (const [entity, ids] of Object.entries(deletedIdsRef.current)) {
      if (ids.length > 0) deletes[entity] = ids;
    }
    deletedIdsRef.current = {};
    if (sent.length === 0 && Object.keys(deletes).length === 0) return;

    const requeue = () => {
      for (const [entity, key, row] of sent) {
        const map = (pendingRef.current[entity] ??= new Map());
        if (!map.has(key)) map.set(key, row); // bản sửa mới hơn (nếu có) được ưu tiên
      }
      for (const [entity, ids] of Object.entries(deletes)) {
        deletedIdsRef.current[entity] = [...ids, ...(deletedIdsRef.current[entity] ?? [])];
      }
    };

    inFlightRef.current = true;
    try {
      const body = JSON.stringify({ entities, deletes });
      const r = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        // flush khi rời trang phải kịp gửi trước khi tab đóng (keepalive tối đa ~64KB)
        ...(immediate && body.length < 60_000 ? { keepalive: true } : {}),
      });
      if (r.ok) {
        for (const [entity, key, row] of sent) (baseRef.current[entity] ??= new Map()).set(key, row);
        retryDelayRef.current = 5000;
      } else if (r.status >= 400 && r.status < 500) {
        // Bị từ chối (quyền, dữ liệu sai) — thử lại cũng vô ích: báo rồi nạp lại bản thật từ DB
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        toast(`Không lưu được thay đổi: ${j?.error ?? `HTTP ${r.status}`}`, "warning");
        console.warn("[TNTH][STORE] Sync bị từ chối (HTTP", r.status, "):", j?.error);
        void loadStoreSnapshotRef.current(true);
      } else {
        requeue();
        console.warn("[TNTH][STORE] Sync lỗi máy chủ (HTTP", r.status, ") — giữ dữ liệu tại máy, tự thử lại.");
        scheduleFlush(retryDelayRef.current);
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 60_000);
      }
    } catch {
      requeue();
      console.warn("[TNTH][STORE] Không tới được máy chủ — giữ dữ liệu tại máy, tự thử lại.");
      scheduleFlush(retryDelayRef.current);
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, 60_000);
    } finally {
      inFlightRef.current = false;
      if (flushAgainRef.current) {
        flushAgainRef.current = false;
        scheduleFlush(0);
      }
    }
  }, [scheduleFlush, toast]);
  useEffect(() => {
    flushSyncRef.current = flushSync;
  }, [flushSync]);

  /** Giữ chữ ký cũ cho nơi gọi trực tiếp — việc phát hiện dòng đổi đã do bộ theo dõi lo */
  const markDirty = useCallback((_entities: string[]) => scheduleFlush(), [scheduleFlush]);

  /** Ghi nhận xoá phía client để server DELETE đúng dòng khi sync (tombstone) */
  const trackDelete = useCallback(
    (entity: string, ids: number[]) => {
      const clean = ids.filter((id) => Number.isFinite(id));
      if (clean.length === 0) return;
      deletedIdsRef.current[entity] = [...(deletedIdsRef.current[entity] ?? []), ...clean];
      for (const id of clean) {
        pendingRef.current[entity]?.delete(String(id));
        baseRef.current[entity]?.delete(String(id));
      }
      localVersionRef.current++;
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Rời trang / tab ẩn → flush NGAY (không chờ debounce), keepalive để fetch
  // sống đủ lâu — tránh mất dữ liệu khi thoát nhanh sau khi thao tác
  useEffect(() => {
    const flushNow = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      void flushSyncRef.current(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /** Setter state theo tên entity (setter của useState luôn ổn định) */
  const entitySetters = useMemo<Record<string, (rows: never[]) => void>>(() => ({
    criteriaSets: setCriteriaSets, tasks: setTasks, taskMetrics: setTaskMetrics,
    taskAssignments: setTaskAssignments, assignmentTargets: setAssignmentTargets,
    taskResults: setTaskResults, assignmentReviews: setAssignmentReviews, scores: setScores,
    rankingSnapshots: setRankingSnapshots, rankingEntries: setRankingEntries,
    activities: setActivities, publishedPosts: setPublishedPosts, attendances: setAttendances,
    reports: setReports, documents: setDocuments, documentRecipients: setDocumentRecipients,
    notifications: setNotifications, feedbacks: setFeedbacks, feedbackMessages: setFeedbackMessages,
    emailLogs: setEmailLogs, liveEvents: setLiveEvents, resources: setResources, settings: setSettings,
    forumThreads: setForumThreads, forumComments: setForumComments,
    hs3tProfiles: setHs3tProfiles, hs3tAchievements: setHs3tAchievements, hs3tUnitStandards: setHs3tUnitStandards,
    quizQuestions: setQuizQuestions, quizExams: setQuizExams, quizAttempts: setQuizAttempts,
    volunteerProjects: setVolunteerProjects, orgDirectories: setOrgDirectories,
    memberContributions: setMemberContributions, contributions: setContributions,
  }), []);

  /**
   * Đưa dòng do API riêng (phản ánh, diễn đàn, thi…) vừa ghi DB trả về vào state,
   * đánh dấu là đã khớp DB → bộ theo dõi KHÔNG gửi lại qua /api/store.
   * `rows` phải đúng dạng state phía client (cùng dạng readEntity/toObj trả về).
   */
  const adoptServerRows = useCallback((entity: string, rows: Record<string, unknown>[]) => {
    const setRows = entitySetters[entity];
    if (!setRows || rows.length === 0) return;
    const current = (syncedStateRef.current[entity] ?? []) as Record<string, unknown>[];
    const incoming = new Map(rows.map((r) => [syncRowKey(entity, r), r]));
    const replaced = current.map((r) => incoming.get(syncRowKey(entity, r)) ?? r);
    const existing = new Set(current.map((r) => syncRowKey(entity, r)));
    const next = [...rows.filter((r) => !existing.has(syncRowKey(entity, r))), ...replaced];
    const base = (baseRef.current[entity] ??= new Map());
    for (const r of rows) {
      const key = syncRowKey(entity, r);
      base.set(key, r);
      pendingRef.current[entity]?.delete(key);
    }
    setRows(next as never[]);
  }, [entitySetters]);

  // Nạp snapshot DB: cập nhật state đồng bộ 100% với PostgreSQL thực tế
  const loadStoreSnapshotRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const loadStoreSnapshot = useCallback(async (force = false) => {
    if (!force && hasPendingSync()) return;
    const versionAtStart = localVersionRef.current;
    try {
      const r = await fetch("/api/store");
      if (!r.ok) return;
      const j = (await r.json()) as
        | { ok?: boolean; scope?: string; data?: Record<string, unknown[]> }
        | null;
      if (!j?.ok || !j.data) return;
      // Trong lúc chờ, máy vừa có thay đổi mới → bỏ kết quả này để không đè lên
      if (localVersionRef.current !== versionAtStart || (!force && hasPendingSync())) return;
      if (force) {
        pendingRef.current = {};
        deletedIdsRef.current = {};
      }
      const d = j.data;
      const raw = (k: string): unknown[] => (Array.isArray(d[k]) ? d[k] : []);
      let maxId = 900000;

      // Dữ liệu DB → dạng state phía client (gộp bảng con, đổi tên trường)
      const fromDb: Record<string, () => unknown[]> = {
        activities: () => {
          const links = raw("activityLinks") as Activity["links"];
          const cats = raw("activityCategories") as { activityId: number; categoryId: number }[];
          return (raw("activities") as Activity[]).map((a) => ({
            ...a,
            links: links.filter((l) => l.activityId === a.id),
            categoryIds: cats.filter((c) => c.activityId === a.id).map((c) => c.categoryId),
          }));
        },
        reports: () => (raw("reports") as Report[]).map((rp) => ({ ...rp, exports: [] as Report["exports"] })),
        volunteerProjects: () =>
          raw("volunteerProjects").map((p0) => {
            const { reportFileName, reportFileData, ...p } = p0 as VolunteerProject & {
              reportFileName?: string | null; reportFileData?: string | null;
            };
            return {
              ...p,
              reportFile: reportFileName ? { name: reportFileName, dataUrl: reportFileData ?? undefined } : undefined,
            } as VolunteerProject;
          }),
      };

      for (const [entity, setRows] of Object.entries(entitySetters)) {
        // Entity phiên này không được đọc → để trống (vd. vừa đăng xuất khỏi quyền quản trị)
        const incoming = Array.isArray(d[entity]) ? (fromDb[entity]?.() ?? raw(entity)) : [];
        const current = (syncedStateRef.current[entity] ?? []) as Record<string, unknown>[];
        const next = reconcileRows(entity, current, incoming as Record<string, unknown>[]);
        const base = new Map<string, unknown>();
        for (const row of next) {
          base.set(syncRowKey(entity, row), row);
          const id = Number(row.id);
          if (Number.isFinite(id) && id > maxId) maxId = id;
        }
        baseRef.current[entity] = base;
        if (next !== current) {
          prevArraysRef.current[entity] = next;
          setRows(next as never[]);
        }
      }

      // Chống đụng id: bộ đếm nextId() phải vượt id lớn nhất vừa nạp từ DB
      if (maxId > uid) uid = maxId;
    } catch {
      /* DB chưa nối được — chế độ offline */
    }
  }, [entitySetters]);
  useEffect(() => {
    loadStoreSnapshotRef.current = loadStoreSnapshot;
  }, [loadStoreSnapshot]);

  // Nạp dữ liệu ngay khi ứng dụng khởi động và mỗi khi phiên đăng nhập thay đổi
  useEffect(() => {
    void loadStoreSnapshot(true);
    void refreshAccounts();
    void refreshOrgUnits();
  }, [session?.accountId, session?.role, loadStoreSnapshot, refreshAccounts, refreshOrgUnits]);

  // Tự động đồng bộ realtime mỗi 4 giây từ PostgreSQL thực tế (bỏ qua khi tab ẩn)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadStoreSnapshot();
      void refreshAccounts();
      void refreshOrgUnits();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadStoreSnapshot, refreshAccounts, refreshOrgUnits]);

  const orgById = useCallback((id: number) => orgUnits.find((u) => u.id === id), [orgUnits]);
  const orgName = useCallback((id: number) => orgUnits.find((u) => u.id === id)?.name ?? `Đơn vị #${id}`, [orgUnits]);
  const accountByOrgUnit = useCallback(
    (orgUnitId: number) => accounts.find((a) => a.orgUnitId === orgUnitId),
    [accounts]
  );
  const descendantsOf = useCallback((id: number) => descendantIds(id, orgUnits), [orgUnits]);
  const scopeIds = useCallback(
    (session: Session) => [session.orgUnitId, ...descendantIds(session.orgUnitId, orgUnits)],
    [descendantsOf, orgUnits]
  );
  const taskMetricsOf = useCallback((taskId: number) => taskMetrics.filter((m) => m.taskId === taskId), [taskMetrics]);
  const targetsOf = useCallback((id: number) => assignmentTargets.filter((t) => t.taskAssignmentId === id), [assignmentTargets]);
  const resultsOf = useCallback((id: number) => taskResults.filter((r) => r.taskAssignmentId === id), [taskResults]);
  const reviewsOf = useCallback((id: number) => assignmentReviews.filter((r) => r.taskAssignmentId === id), [assignmentReviews]);
  const activeCriteriaSet = useCallback(() => {
    const active = criteriaSets.filter((c) => c.status === "ACTIVE");
    if (active.length === 0) return criteriaSets[0];
    const set2027 = active.find((c) => c.year === 2027 || c.code === "BTS-TINH-2027");
    if (set2027) return set2027;
    return active[active.length - 1] ?? active[0];
  }, [criteriaSets]);
  const docRecipientsOf = useCallback((documentId: number) => documentRecipients.filter((r) => r.documentId === documentId), [documentRecipients]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "isRead" | "createdAt">) => {
    setNotifications((prev) => [{ ...n, id: nextId(), isRead: false, createdAt: nowISO() }, ...prev]);
  }, []);

  /* ============ Activities (R1) ============ */

  const createActivity = useCallback(
    (session: Session, input: ActivityInput, submit: boolean) => {
      const id = nextId();
      const requiresConfirm = orgById(session.orgUnitId)?.orgLevel !== 1;
      const activity: Activity = {
        id, orgUnitId: session.orgUnitId, ...input, imageSeed: input.imageSeed ?? Math.floor(Math.random() * 20) + 1,
        activityType: input.links.length > 0 || submit ? "GENERAL" : "GENERAL",
        status: submit ? "SUBMITTED" : "DRAFT",
        confirmStatus: submit ? (requiresConfirm ? "PENDING" : "NOT_REQUIRED") : "NOT_REQUIRED",
        links: input.links.map((l, i) => ({ id: nextId() + i, activityId: id, platform: l.platform as Activity["links"][number]["platform"], url: l.url, note: l.note })),
        createdAt: nowISO(),
      };
      setActivities((prev) => [activity, ...prev]);
      return id;
    },
    [orgById]
  );

  const updateActivity = useCallback((id: number, input: ActivityInput) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a, ...input, updatedAt: nowISO(),
              links: input.links.map((l, i) => ({ id: nextId() + i, activityId: id, platform: l.platform as Activity["links"][number]["platform"], url: l.url, note: l.note })),
            }
          : a
      )
    );
  }, []);

  const deleteActivity = useCallback((id: number) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    trackDelete("activities", [id]);
  }, [trackDelete]);

  const submitActivity = useCallback(
    (session: Session, id: number) => {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "SUBMITTED", confirmStatus: orgById(session.orgUnitId)?.orgLevel !== 1 ? "PENDING" : "NOT_REQUIRED", updatedAt: nowISO() }
            : a
        )
      );
    },
    [orgById]
  );

  const reviewActivity = useCallback(
    (session: Session, id: number, action: "CONFIRM" | "NEEDS_INFO" | "REJECT", note?: string) => {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, confirmStatus: action === "CONFIRM" ? "CONFIRMED" : action === "NEEDS_INFO" ? "NEEDS_INFO" : "REJECTED", reviewNote: note, updatedAt: nowISO() }
            : a
        )
      );
      const act = activities.find((a) => a.id === id);
      if (act) {
        if (action === "CONFIRM" && act.taskId && act.taskMetricId && act.metricContributionValue) {
          setAssignmentTargets((prevTargets) =>
            prevTargets.map((t) => {
              const asg = taskAssignments.find((a) => a.id === t.taskAssignmentId);
              if (asg && asg.orgUnitId === act.orgUnitId && asg.taskId === act.taskId && t.taskMetricId === act.taskMetricId) {
                return { ...t, achievedValue: t.achievedValue + (act.metricContributionValue ?? 0) };
              }
              return t;
            })
          );
        }
        const acc = accountByOrgUnit(act.orgUnitId);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id,
            notificationType: action === "CONFIRM" ? "RESULT_CONFIRMED" : "RESULT_NEEDS_INFO",
            title: action === "CONFIRM" ? "Hoạt động được xác nhận" : action === "NEEDS_INFO" ? "Hoạt động cần bổ sung" : "Hoạt động bị trả lại",
            message: `Hoạt động "${act.title}" ${action === "CONFIRM" ? "đã được xác nhận (số liệu đã cộng vào cây chỉ tiêu)" : "cần chỉnh sửa"}${note ? ` — ${note}` : ""}`,
            refType: "ACTIVITY", refId: id, linkUrl: `/quan-tri/hoat-dong/${id}`,
          });
        }
      }
    },
    [accountByOrgUnit, activities, addNotification, taskAssignments]
  );

  /* ============ Posts (R2) ============ */

  const savePost = useCallback((post: PublishedPost) => {
    setPublishedPosts((prev) => {
      const exists = prev.some((p) => p.id === post.id);
      return exists ? prev.map((p) => (p.id === post.id ? post : p)) : [post, ...prev];
    });
  }, []);

  const setPostStatus = useCallback((id: number, status: PublishedPost["status"]) => {
    setPublishedPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status, publishedAt: status === "PUBLISHED" ? nowISO() : p.publishedAt }
          : p
      )
    );
  }, []);

  const createPostFromActivity = useCallback(
    (session: Session, activityId: number | null, title: string, excerpt: string, extras?: Partial<PublishedPost>) => {
      const act = activityId ? activities.find((a) => a.id === activityId) : undefined;
      const slug = title
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
        .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70);
      const id = nextId();
      const post: PublishedPost = {
        id, activityId: activityId ?? null, slug: slug || `bai-viet-${id}`, title, excerpt,
        content: extras?.content ?? act?.summary ?? "",
        coverSeed: act?.imageSeed ?? 1,
        status: "DRAFT", isFeatured: false, viewCount: 0,
        authorOrgUnitName: act ? orgName(act.orgUnitId) : orgName(session.orgUnitId),
        editorAccountId: session.accountId,
        categoryNames: [],
        createdAt: nowISO(),
        ...extras,
      };
      setPublishedPosts((prev) => [post, ...prev]);
      return id;
    },
    [activities, orgName]
  );

  /* ============ Tasks (R3) ============ */

  const distributeAssignment = useCallback(
    (session: Session, taskId: number, parentAssignmentId: number | null, orgUnitId: number, dueDate: string, targets: { taskMetricId: number; targetValue: number }[], note?: string) => {
      const id = nextId();
      const assignment: TaskAssignment = {
        id, taskId, orgUnitId, assignedByOrgUnitId: session.orgUnitId,
        parentAssignmentId, dueDate, progressStatus: "NOT_STARTED",
        confirmStatus: "PENDING", completionRate: 0, note, assignedAt: nowISO(),
      };
      setTaskAssignments((prev) => [...prev, assignment]);
      setAssignmentTargets((prev) => [
        ...prev,
        ...targets.map((t, i) => ({ id: nextId() + i, taskAssignmentId: id, taskMetricId: t.taskMetricId, targetValue: t.targetValue, achievedValue: 0 })),
      ]);
      const acc = accountByOrgUnit(orgUnitId);
      if (acc) {
        addNotification({
          recipientAccountId: acc.id,
          notificationType: "TASK_ASSIGNED",
          title: "Nhiệm vụ mới được giao",
          message: `Bạn nhận nhiệm vụ "${tasks.find((t) => t.id === taskId)?.title ?? taskId}" với ${targets.length} chỉ tiêu, hạn ${dueDate}.`,
          refType: "ASSIGNMENT", refId: id, linkUrl: `/quan-tri/nhiem-vu/phan-cong/${id}`,
        });
      }
    },
    [accountByOrgUnit, addNotification, tasks]
  );

  /**
   * Tạo nhiệm vụ mới từ kết quả AI lượng hoá công văn:
   * Task + TaskMetrics + giao đồng loạt cho các đơn vị chọn + thông báo TASK_ASSIGNED.
   * Tự tạo assignment inline (không gọi distributeAssignment) để tránh stale closure khi đọc tasks.
   */
  const createDirectiveTask = useCallback(
    (session: Session, input: DirectiveTaskInput) => {
      const taskId = nextId();
      const codeSeq = tasks.filter((t) => t.code.startsWith("CV-")).length + 1;
      const task: Task = {
        id: taskId,
        criteriaSetId: null,
        parentTaskId: null,
        code: `CV-2026-${String(codeSeq).padStart(2, "0")}`,
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        taskKind: "TASK",
        maxPoints: 0,
        scoringMethod: "MANUAL_CONFIRM",
        dueDate: input.dueDate,
        displayOrder: 900 + tasks.length,
        status: "PUBLISHED",
      };
      // Pre-generate id cho metrics + assignments + targets để tránh trùng nextId()+i
      const metricIds = input.metrics.map((_, i) => nextId() + i);
      const assignmentIds = input.targetOrgUnitIds.map((_, i) => nextId() + 100 + i);
      let targetBase = nextId() + 200;
      const newMetrics: TaskMetric[] = input.metrics.map((m, i) => ({
        id: metricIds[i],
        taskId,
        code: `DIRECTIVE_${i + 1}`,
        name: m.name,
        unitOfMeasure: m.unit,
        aggregationType: m.aggregationType,
      }));
      const newAssignments: TaskAssignment[] = input.targetOrgUnitIds.map((orgUnitId, i) => ({
        id: assignmentIds[i],
        taskId,
        orgUnitId,
        assignedByOrgUnitId: session.orgUnitId,
        parentAssignmentId: null,
        dueDate: input.dueDate,
        progressStatus: "NOT_STARTED",
        confirmStatus: "PENDING",
        completionRate: 0,
        note: input.sourceDocNumber ? `Theo công văn ${input.sourceDocNumber}` : "Giao từ AI phân tích công văn",
        assignedAt: nowISO(),
      }));
      const newTargets: AssignmentTarget[] = [];
      assignmentIds.forEach((asgId) => {
        input.metrics.forEach((m, i) => {
          newTargets.push({ id: targetBase++, taskAssignmentId: asgId, taskMetricId: metricIds[i], targetValue: m.targetValue, achievedValue: 0 });
        });
      });
      setTasks((prev) => [...prev, task]);
      setTaskMetrics((prev) => [...prev, ...newMetrics]);
      setTaskAssignments((prev) => [...prev, ...newAssignments]);
      setAssignmentTargets((prev) => [...prev, ...newTargets]);
      for (let i = 0; i < input.targetOrgUnitIds.length; i++) {
        const acc = accountByOrgUnit(input.targetOrgUnitIds[i]);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id,
            notificationType: "TASK_ASSIGNED",
            title: "Nhiệm vụ mới được giao",
            message: `Bạn nhận nhiệm vụ "${task.title}" với ${input.metrics.length} chỉ tiêu, hạn ${input.dueDate}.`,
            refType: "ASSIGNMENT", refId: assignmentIds[i], linkUrl: `/quan-tri/nhiem-vu/phan-cong/${assignmentIds[i]}`,
          });
        }
      }
      return { taskId, assignmentIds };
    },
    [tasks, accountByOrgUnit, addNotification]
  );

  const updateResult = useCallback(
    (session: Session, assignmentId: number, values: { assignmentTargetId: number; reportedValue: number }[], note?: string) => {
      const ts = nowISO();
      setTaskResults((prev) => [
        ...prev,
        ...values.map((v, i) => ({ id: nextId() + i, taskAssignmentId: assignmentId, assignmentTargetId: v.assignmentTargetId, reportedValue: v.reportedValue, reportNote: note, dataSource: "MANUAL" as const, reportedByAccountId: session.accountId, reportedAt: ts })),
      ]);
      setAssignmentTargets((prev) =>
        prev.map((t) => {
          const v = values.find((x) => x.assignmentTargetId === t.id);
          return v ? { ...t, achievedValue: v.reportedValue } : t;
        })
      );
      setTaskAssignments((prev) =>
        prev.map((a) => {
          if (a.id !== assignmentId) return a;
          const targets = assignmentTargets.filter((t) => t.taskAssignmentId === a.id);
          const updated = targets.map((t) => {
            const v = values.find((x) => x.assignmentTargetId === t.id);
            return v ? { ...t, achievedValue: v.reportedValue } : t;
          });
          const rate = updated.length > 0
            ? updated.reduce((s, t) => s + Math.min(1, t.targetValue > 0 ? t.achievedValue / t.targetValue : 1), 0) / updated.length * 100
            : 100;
          const progress = rate >= 100 ? "COMPLETED" : rate > 0 ? "IN_PROGRESS" : a.dueDate < nowISO().slice(0, 10) ? "OVERDUE" : "NOT_STARTED";
          return {
            ...a, completionRate: Math.round(rate * 10) / 10,
            progressStatus: progress as TaskAssignment["progressStatus"],
            confirmStatus: a.confirmStatus === "NEEDS_INFO" ? "PENDING" : a.confirmStatus,
          };
        })
      );
    },
    [assignmentTargets]
  );

  const reviewAssignment = useCallback(
    (session: Session, assignmentId: number, action: AssignmentReview["action"], note?: string) => {
      const ts = nowISO();
      setAssignmentReviews((prev) => [
        ...prev,
        { id: nextId(), taskAssignmentId: assignmentId, reviewerAccountId: session.accountId, action, note, reviewedAt: ts },
      ]);
      setTaskAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                confirmStatus: action === "CONFIRM" ? "CONFIRMED" : action === "REQUEST_INFO" ? "NEEDS_INFO" : "REJECTED",
                confirmedAt: action === "CONFIRM" ? ts : a.confirmedAt,
              }
            : a
        )
      );
      const asg = taskAssignments.find((a) => a.id === assignmentId);
      if (asg) {
        const acc = accountByOrgUnit(asg.orgUnitId);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id,
            notificationType: action === "CONFIRM" ? "RESULT_CONFIRMED" : "RESULT_NEEDS_INFO",
            title: action === "CONFIRM" ? "Kết quả được xác nhận" : action === "REQUEST_INFO" ? "Cần bổ sung thông tin" : "Báo cáo bị trả lại",
            message: `Nhiệm vụ của đơn vị bạn ${action === "CONFIRM" ? "đã được xác nhận" : "cần hành động"}${note ? ` — ${note}` : ""}`,
            refType: "ASSIGNMENT", refId: assignmentId, linkUrl: `/quan-tri/nhiem-vu/phan-cong/${assignmentId}`,
          });
        }
      }
    },
    [accountByOrgUnit, addNotification, taskAssignments]
  );

  const setAssignmentProgress = useCallback(
    (session: Session, assignmentId: number, status: TaskAssignment["progressStatus"]) => {
      setTaskAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                progressStatus: status,
                completionRate: status === "COMPLETED" ? 100 : status === "NOT_STARTED" ? 0 : a.completionRate > 0 ? a.completionRate : 50,
              }
            : a
        )
      );
      const asg = taskAssignments.find((a) => a.id === assignmentId);
      if (asg) {
        const acc = accountByOrgUnit(asg.assignedByOrgUnitId);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id,
            notificationType: "SYSTEM",
            title: status === "COMPLETED" ? "Nhiệm vụ được đánh dấu hoàn thành" : "Cập nhật tiến độ nhiệm vụ",
            message: `${orgName(session.orgUnitId)} đã đánh dấu nhiệm vụ "${tasks.find((t) => t.id === asg.taskId)?.title ?? ""}" ở trạng thái ${status === "COMPLETED" ? "HOÀN THÀNH" : status === "IN_PROGRESS" ? "đang thực hiện" : "chưa bắt đầu"}.`,
            refType: "ASSIGNMENT", refId: assignmentId, linkUrl: `/quan-tri/nhiem-vu/phan-cong/${assignmentId}`,
          });
        }
      }
    },
    [taskAssignments, accountByOrgUnit, addNotification, tasks, orgName]
  );

  /** Thu hồi phân bổ: xoá assignment + chỉ tiêu + kết quả + kiểm định (đồng bộ DELETE lên DB) */
  const revokeAssignment = useCallback(
    (session: Session, assignmentId: number) => {
      const asg = taskAssignments.find((a) => a.id === assignmentId);
      if (!asg) return;
      const targetIds = assignmentTargets.filter((t) => t.taskAssignmentId === assignmentId).map((t) => t.id);
      const resultIds = taskResults.filter((r) => r.taskAssignmentId === assignmentId).map((r) => r.id);
      const reviewIds = assignmentReviews.filter((rv) => rv.taskAssignmentId === assignmentId).map((rv) => rv.id);
      setTaskAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      setAssignmentTargets((prev) => prev.filter((t) => t.taskAssignmentId !== assignmentId));
      setTaskResults((prev) => prev.filter((r) => r.taskAssignmentId !== assignmentId));
      setAssignmentReviews((prev) => prev.filter((rv) => rv.taskAssignmentId !== assignmentId));
      trackDelete("taskAssignments", [assignmentId]);
      if (targetIds.length > 0) trackDelete("assignmentTargets", targetIds);
      if (resultIds.length > 0) trackDelete("taskResults", resultIds);
      if (reviewIds.length > 0) trackDelete("assignmentReviews", reviewIds);
      const acc = accountByOrgUnit(asg.orgUnitId);
      if (acc) {
        addNotification({
          recipientAccountId: acc.id,
          notificationType: "SYSTEM",
          title: "Phân bổ đã được thu hồi",
          message: `Nhiệm vụ "${tasks.find((t) => t.id === asg.taskId)?.title ?? asg.taskId}" giao cho ${orgName(asg.orgUnitId)} đã bị thu hồi.`,
          refType: "ASSIGNMENT", refId: assignmentId, linkUrl: "/quan-tri/nhiem-vu",
        });
      }
    },
    [taskAssignments, assignmentTargets, taskResults, assignmentReviews, trackDelete, accountByOrgUnit, addNotification, tasks, orgName],
  );

  const saveScore = useCallback(
    (session: Session, input: ScoreInput) => {
      const task = tasks.find((t) => t.id === input.taskId);
      const metric = input.metricId != null ? taskMetrics.find((m) => m.id === input.metricId) : undefined;
      const maxPoints = metric?.maxPoints ?? task?.maxPoints ?? 0;
      setScores((prev) => {
        const exists = prev.find(
          (s) =>
            s.criteriaSetId === input.criteriaSetId &&
            s.taskId === input.taskId &&
            (s.metricId ?? null) === (input.metricId ?? null) &&
            s.orgUnitId === input.orgUnitId
        );
        const record: Score = {
          id: exists?.id ?? nextId(),
          criteriaSetId: input.criteriaSetId, taskId: input.taskId, orgUnitId: input.orgUnitId,
          metricId: input.metricId ?? null,
          points: Math.max(0, Math.min(input.points, maxPoints)), maxPoints,
          scoringMethod: input.method ?? task?.scoringMethod ?? "MANUAL_CONFIRM",
          note: input.note, scoredByAccountId: session.accountId, scoredAt: nowISO(),
        };
        return exists ? prev.map((s) => (s.id === exists.id ? record : s)) : [...prev, record];
      });
    },
    [tasks, taskMetrics]
  );

  /* ============ Reports (R4) ============ */

  const createReport = useCallback((session: Session, input: Omit<Report, "id" | "createdAt" | "exports" | "status">) => {
    const id = nextId();
    setReports((prev) => [{ ...input, id, status: "DRAFT", createdAt: nowISO(), exports: [] }, ...prev]);
    return id;
  }, []);

  const updateReport = useCallback((id: number, patch: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const finalizeReport = useCallback((id: number) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "FINALIZED", finalizedAt: nowISO() } : r)));
  }, []);

  const exportReport = useCallback((id: number, format: Report["exports"][number]["exportFormat"]) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, exports: [...r.exports, { id: nextId(), reportId: id, exportFormat: format, exportedAt: nowISO() }] }
          : r
      )
    );
  }, []);

  /* ============ Rankings (R6) ============ */

  const createRankingSnapshot = useCallback(
    (session: Session, input: Omit<RankingSnapshot, "id" | "generatedAt" | "generatedByAccountId" | "status">) => {
      const id = nextId();
      const candidates = orgUnits.filter(
        (u) => u.orgLevel === input.rankedOrgLevel && (u.id === input.scopeOrgUnitId || descendantIds(input.scopeOrgUnitId, orgUnits).includes(u.id))
      );
      const entries: RankingEntry[] = candidates
        .map((u, i) => {
          const unitScores = scores.filter((s) => s.orgUnitId === u.id && (!input.criteriaSetId || s.criteriaSetId === input.criteriaSetId));
          const totalScore = Math.round(unitScores.reduce((sum, s) => sum + s.points, 0) * 10) / 10;
          const unitTasks = taskAssignments.filter((a) => a.orgUnitId === u.id);
          const totalTasks = unitTasks.length;
          const completedTasks = unitTasks.filter((a) => a.completionRate >= 100).length;
          const completionRate = totalTasks > 0 ? Math.round(unitTasks.reduce((s, a) => s + a.completionRate, 0) / totalTasks * 10) / 10 : 0;
          const activityCount = activities.filter((a) => a.orgUnitId === u.id && a.confirmStatus === "CONFIRMED").length;
          return { id: nextId() + i, snapshotId: id, orgUnitId: u.id, rankPosition: 0, totalScore, completionRate, completedTasks, totalTasks, activityCount };
        })
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((e, i) => ({ ...e, id: e.id, rankPosition: i + 1 }));
      setRankingSnapshots((prev) => [{ ...input, id, generatedAt: nowISO(), generatedByAccountId: session.accountId, status: "DRAFT" }, ...prev]);
      setRankingEntries((prev) => [...prev, ...entries]);
      return id;
    },
    [activities, orgUnits, scores, taskAssignments]
  );

  const finalizeRanking = useCallback((id: number) => {
    setRankingSnapshots((prev) => prev.map((s) => (s.id === id ? { ...s, status: "FINALIZED" } : s)));
  }, []);

  /* ============ Documents (R7) ============ */

  const issueDocument = useCallback(
    (session: Session, input: Omit<DocumentRecord, "id" | "createdAt" | "status" | "issuingOrgUnitId">, selectedIds?: number[]) => {
      const id = nextId();
      const doc: DocumentRecord = { ...input, id, status: "ISSUED", issuingOrgUnitId: session.orgUnitId, createdAt: nowISO() };
      setDocuments((prev) => [doc, ...prev]);
      let recipients: number[] = [];
      if (input.recipientScope === "ALL_DESCENDANTS") recipients = descendantsOf(session.orgUnitId);
      else if (input.recipientScope === "DIRECT_CHILDREN") recipients = orgUnits.filter((u) => u.parentId === session.orgUnitId).map((u) => u.id);
      else recipients = selectedIds ?? [];
      setDocumentRecipients((prev) => [
        ...prev,
        ...recipients.map((orgUnitId) => ({ documentId: id, orgUnitId, readAt: null })),
      ]);
      for (const orgUnitId of recipients) {
        const acc = accountByOrgUnit(orgUnitId);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id, notificationType: "NEW_DOCUMENT",
            title: "Văn bản mới", message: `${input.docNumber ? input.docNumber + " — " : ""}${input.title}`,
            refType: "DOCUMENT", refId: id, linkUrl: "/quan-tri/van-ban",
          });
        }
      }
    },
    [accountByOrgUnit, addNotification, descendantsOf, orgUnits]
  );

  const revokeDocument = useCallback((id: number) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status: "REVOKED" } : d)));
  }, []);

  const markDocumentRead = useCallback((documentId: number, orgUnitId: number) => {
    setDocumentRecipients((prev) =>
      prev.map((r) => (r.documentId === documentId && r.orgUnitId === orgUnitId && !r.readAt ? { ...r, readAt: nowISO() } : r))
    );
  }, []);

  /* ============ Notifications ============ */

  const markNotificationRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback((accountId: number) => {
    setNotifications((prev) => prev.map((n) => (n.recipientAccountId === accountId ? { ...n, isRead: true } : n)));
  }, []);

  /** Gửi email thật qua SMTP (API route /api/send-email + Nodemailer) — cập nhật trạng thái delivery trên log */
  const deliverEmail = useCallback((logId: number, to: string, subject: string, body: string) => {
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (res.ok && data?.ok) {
          setEmailLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, delivery: "SENT" } : l)));
        } else if (res.status === 503) {
          // Chưa cấu hình SMTP — chạy chế độ mô phỏng, không đánh dấu thất bại
          setEmailLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, delivery: undefined } : l)));
        } else {
          console.warn("[TNTH][SMTP] Gửi email thật thất bại:", data?.error ?? `HTTP ${res.status}`);
          setEmailLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, delivery: "FAILED" } : l)));
        }
      })
      .catch(() => {
        console.warn("[TNTH][SMTP] Không gọi được API gửi email.");
        setEmailLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, delivery: "FAILED" } : l)));
      });
  }, []);

  /* ============ Feedbacks (R8) ============ */

  const submitFeedback = useCallback(
    async (input: FeedbackSubmitInput): Promise<ApiResult<{ code: string }>> => {
      // Máy chủ sinh mã tra cứu ngẫu nhiên, gắn tài khoản theo phiên, ghi tin nhắn đầu + sự kiện Trực tiếp
      const r = await callPublicApi<{ trackingCode: string; feedback: Feedback; messages: FeedbackMessage[] }>(
        "/api/phan-anh",
        input,
      );
      if (!r.ok) return r;
      adoptServerRows("feedbacks", [r.feedback as unknown as Record<string, unknown>]);
      adoptServerRows("feedbackMessages", r.messages as unknown as Record<string, unknown>[]);
      return { ok: true, code: r.trackingCode };
    },
    [adoptServerRows]
  );

  /** Soạn và "gửi" email cho người gửi phản ánh — nội dung ghép từ phản hồi chính thức mới nhất (giả lập SMTP) */
  const sendFeedbackResultEmail = useCallback(
    (session: Session, feedbackId: number, kind: EmailLog["kind"] = "RESULT") => {
      const fb = feedbacks.find((f) => f.id === feedbackId);
      if (!fb || !fb.senderEmail) return false;
      const latestReply = feedbackMessages
        .filter((m) => m.feedbackId === feedbackId && m.senderType === "STAFF" && !m.isInternalNote)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
      const isResult = kind === "RESULT";
      const subject = isResult
        ? `[TNTH] Kết quả xử lý phản ánh ${fb.trackingCode}`
        : `[TNTH] Phản hồi cho phản ánh ${fb.trackingCode}`;
      const body = [
        `Kính gửi: ${fb.senderName},`,
        `Phản ánh kiến nghị của anh/chị về nội dung "${fb.title}" (Mã theo dõi: ${fb.trackingCode}) đã được Cổng Thanh niên trường học tiếp nhận và ${isResult ? "giải quyết xong" : "đang được xem xét"}.`,
        latestReply
          ? `Nội dung phản hồi của cán bộ xử lý:\n${latestReply.content}`
          : `Kết quả chi tiết sẽ được cập nhật trên trang tra cứu theo mã phản ánh.`,
        `Anh/chị có thể tra cứu toàn bộ tiến trình xử lý bằng mã ${fb.trackingCode} tại mục "Phản ánh kiến nghị" trên Cổng TNTH.`,
        `Trân trọng cảm ơn anh/chị đã phản ánh và đồng hành cùng Đoàn.`,
        `— Email tự động từ hệ thống Thanh niên trường học, vui lòng không trả lời email này.`,
      ].join("\n\n");
      const logId = nextId();
      setEmailLogs((prev) => [
        { id: logId, feedbackId, to: fb.senderEmail, subject, body, kind, sentByAccountId: session.accountId, sentAt: nowISO(), delivery: "PENDING" },
        ...prev,
      ]);
      // Gửi email thật tới hộp thư người nhận qua SMTP (nếu đã cấu hình .env.local)
      deliverEmail(logId, fb.senderEmail, subject, body);
      return true;
    },
    [feedbacks, feedbackMessages, deliverEmail]
  );

  const replyFeedback = useCallback(
    (session: Session, feedbackId: number, content: string, internal: boolean) => {
      setFeedbackMessages((prev) => [
        ...prev,
        { id: nextId(), feedbackId, senderType: "STAFF", senderName: session.contactPerson, content, isInternalNote: internal, sentAt: nowISO() },
      ]);
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackId
            ? { ...f, status: f.status === "NEW" ? "IN_PROGRESS" : f.status, assignedAccountId: f.assignedAccountId ?? session.accountId }
            : f
        )
      );
      if (!internal) {
        const fb = feedbacks.find((f) => f.id === feedbackId);
        if (fb?.assignedAccountId) {
          addNotification({
            recipientAccountId: fb.assignedAccountId, notificationType: "FEEDBACK_REPLIED",
            title: "Phản ánh được trả lời", message: `Văn bản ${fb.trackingCode} đã có phản hồi chính thức.`,
            refType: "FEEDBACK", refId: feedbackId, linkUrl: `/quan-tri/phan-anh`,
          });
        }
        // Tự động gửi email phản hồi cho người gửi
        sendFeedbackResultEmail(session, feedbackId, "REPLY");
      }
    },
    [addNotification, feedbacks, sendFeedbackResultEmail]
  );

  const setFeedbackStatus = useCallback(
    (session: Session, feedbackId: number, status: Feedback["status"]) => {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status, assignedAccountId: f.assignedAccountId ?? session.accountId } : f))
      );
      const fb = feedbacks.find((f) => f.id === feedbackId);
      if (fb?.assignedAccountId) {
        addNotification({
          recipientAccountId: fb.assignedAccountId, notificationType: "FEEDBACK_STATUS",
          title: "Cập nhật trạng thái phản ánh", message: `${fb.trackingCode} chuyển sang trạng thái ${status}.`,
          refType: "FEEDBACK", refId: feedbackId, linkUrl: "/quan-tri/phan-anh",
        });
      }
      // Có kết quả → tự động gửi email kết quả về hộp thư người gửi
      if (status === "RESOLVED") sendFeedbackResultEmail(session, feedbackId, "RESULT");
    },
    [addNotification, feedbacks, sendFeedbackResultEmail]
  );

  /* ============ Attendance ============ */

  // Cửa sổ điểm danh đang mở — lưu trong settings entity (đồng bộ DB, khách
  // đọc được qua public read) thay vì state local vốn mất khi admin tải lại trang
  const attendanceOpenIds = useMemo<number[]>(() => {
    const raw = settings.find((s) => s.settingKey === "attendance_open_ids")?.value ?? "";
    return raw
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  }, [settings]);

  const toggleAttendance = useCallback(
    (session: Session, activityId: number, open: boolean) => {
      const cur = new Set(attendanceOpenIds);
      if (open) cur.add(activityId);
      else cur.delete(activityId);
      const value = [...cur].join(",");
      setSettings((prev) => {
        const exists = prev.some((s) => s.settingKey === "attendance_open_ids");
        if (exists) return prev.map((s) => (s.settingKey === "attendance_open_ids" ? { ...s, value } : s));
        return [
          ...prev,
          { settingKey: "attendance_open_ids", value, valueType: "STRING" as const, groupName: "Hoạt động", description: "Danh sách hoạt động đang mở điểm danh (id phân tách bằng dấu phẩy)" },
        ];
      });
    },
    [attendanceOpenIds],
  );

  const addAttendance = useCallback(
    async (input: { activityId: number; memberName: string; memberClass?: string }): Promise<ApiResult<{ count: number }>> => {
      // Máy chủ kiểm tra hoạt động đang mở điểm danh + chống trùng tên/lớp
      const r = await callPublicApi<{ attendance: Attendance; count: number }>("/api/diem-danh", input);
      if (!r.ok) return r;
      adoptServerRows("attendances", [r.attendance as unknown as Record<string, unknown>]);
      return { ok: true, count: r.count };
    },
    [adoptServerRows]
  );

  /* ============ Resources (R9) ============ */

  const saveResource = useCallback((input: Omit<Resource, "id" | "downloadCount">, id?: number) => {
    setResources((prev) => {
      if (id) return prev.map((r) => (r.id === id ? { ...r, ...input } : r));
      return [{ ...input, id: nextId(), downloadCount: 0 }, ...prev];
    });
    markDirty(["resources"]);
    void flushSync(true);
  }, [markDirty, flushSync]);

  const deleteResource = useCallback((id: number) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    trackDelete("resources", [id]);
    void flushSync(true);
  }, [trackDelete, flushSync]);

  const downloadResource = useCallback((id: number) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, downloadCount: r.downloadCount + 1 } : r)));
  }, []);

  /* ============ System ============ */

  const updateSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.settingKey === key ? { ...s, value } : s)));
  }, []);

  const deleteAccount = useCallback(async (accountId: number) => {
    try {
      const r = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      if (!r.ok) return { ok: false, error: j?.error ?? "Lỗi xóa tài khoản" };
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      return { ok: true };
    } catch {
      return { ok: false, error: "Lỗi kết nối cơ sở dữ liệu." };
    }
  }, []);

  const updateAccount = useCallback(
    async (
      id: number,
      patch: {
        contactPerson?: string; email?: string; phone?: string;
        contactPosition?: string; chucDanh?: string; className?: string; status?: Account["status"];
        password?: string;
      }
    ) => {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      try {
        const r = await fetch(`/api/accounts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const j = await r.json().catch(() => null);
        if (!r.ok) return { ok: false, error: j?.error ?? "Lỗi cập nhật tài khoản" };
        return { ok: true };
      } catch {
        return { ok: true };
      }
    },
    []
  );

  const updateAccountPermissions = useCallback(
    async (accountId: number, perms: string[]) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, grantedPerms: perms, permCount: perms.length } : a))
      );
      try {
        const r = await fetch(`/api/accounts/${accountId}/permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perms }),
        });
        const j = await r.json().catch(() => null);
        if (!r.ok) return { ok: false, error: j?.error ?? "Lỗi cập nhật quyền" };
        return { ok: true };
      } catch {
        return { ok: true };
      }
    },
    []
  );

  const updateAccountStatus = useCallback((accountId: number, status: Account["status"]) => {
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, status } : a)));
    // Đổi trạng thái ở DB — khoá/vô hiệu sẽ thu hồi phiên đăng nhập đang chạy
    void fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then(async (r) => {
        if (!r.ok) console.warn("[TNTH][AUTH] Đổi trạng thái tài khoản trên DB thất bại (HTTP", r.status, ")");
      })
      .catch(() => {});
  }, []);

  /* Tạo tài khoản mới (đơn lẻ hoặc từ import) — ghi DB qua /api/accounts, lỗi mạng thì lưu local */
  const createAccount = useCallback(
    async (input: {
      orgUnitId: number; username: string; email: string; phone?: string; contactPerson: string;
      contactPosition: string; chucDanh?: string; className?: string; role: Account["role"]; status?: Account["status"]; password?: string;
      perms?: string[];
    }) => {
      const username = input.username.trim();
      if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, error: "Tên đăng nhập đã tồn tại" };
      }
      /* Đơn vị cơ sở (cấp 2/3/4) = 01 tài khoản dùng chung — chỉ TW (cấp 1) được nhiều tài khoản */
      const unit = orgUnits.find((u) => u.id === input.orgUnitId);
      if (unit && unit.orgLevel >= 2 && accounts.some((a) => a.orgUnitId === input.orgUnitId && a.role !== "DOAN_VIEN")) {
        return { ok: false, error: "Đơn vị cơ sở chỉ có 01 tài khoản dùng chung — không thể cấp thêm" };
      }
      const password = input.password?.trim() || "";
      if (!password || password.length < 6) {
        return { ok: false, error: "Mật khẩu khởi tạo cần ít nhất 6 ký tự." };
      }
      try {
        const r = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accounts: [{
              orgUnitId: input.orgUnitId, username, email: input.email.trim(), phone: input.phone?.trim() || undefined,
              contactPerson: input.contactPerson.trim(), contactPosition: input.contactPosition.trim(),
              chucDanh: input.chucDanh?.trim() || undefined, perms: input.perms,
              className: input.className?.trim() || undefined, role: input.role, status: input.status ?? "ACTIVE",
              password,
            }],
          }),
        });
        const j = (await r.json().catch(() => null)) as
          | { ok?: boolean; created?: unknown[]; error?: string; errors?: { error: string }[] }
          | null;
        if (r.ok && j?.ok && Array.isArray(j.created) && j.created.length > 0) {
          const account: Account = {
            id: Number(j.created[0]),
            orgUnitId: input.orgUnitId,
            username,
            email: input.email.trim(),
            phone: input.phone?.trim() || undefined,
            contactPerson: input.contactPerson.trim(),
            contactPosition: input.contactPosition.trim() || "—",
            chucDanh: input.chucDanh?.trim() || undefined,
            grantedPerms: input.perms,
            permCount: input.perms?.length ?? 0,
            className: input.className?.trim() || undefined,
            role: input.role,
            status: input.status ?? "ACTIVE",
          };
          setAccounts((prev) => [...prev, account]);
          return { ok: true };
        }
        return { ok: false, error: j?.errors?.[0]?.error ?? j?.error ?? "Không tạo được tài khoản trên hệ thống." };
      } catch (err) {
        return { ok: false, error: "Lỗi kết nối cơ sở dữ liệu." };
      }
    },
    [accounts, orgUnits]
  );

  /* ============ Forum ẩn danh ============ */

  /* Đăng bài / bình luận / thích đều qua API riêng: máy chủ kiểm duyệt, sinh bí danh,
   * gửi thông báo. Dòng trả về đã "che" theo người xem → đưa thẳng vào state. */
  const createForumThread = useCallback(
    async (input: { title: string; content: string; topic?: string; media?: ForumMedia[] }): Promise<MemberWriteResult> => {
      const res = await postMemberApi<{ row: ForumThread; verdict?: ModerationResult["verdict"]; reason?: string | null }>(
        "/api/dien-dan/bai-viet",
        { title: input.title, content: input.content, topic: input.topic, media: input.media ?? [] },
      );
      if (!res.ok) return res;
      adoptServerRows("forumThreads", [res.row as unknown as Record<string, unknown>]);
      return { ok: true, id: res.row.id, mod: modOf(res) };
    },
    [adoptServerRows]
  );

  const createForumComment = useCallback(
    async (input: { threadId: number; content: string; media?: ForumMedia[] }): Promise<MemberWriteResult> => {
      const res = await postMemberApi<{ row: ForumComment; verdict?: ModerationResult["verdict"]; reason?: string | null }>(
        "/api/dien-dan/binh-luan",
        { threadId: input.threadId, content: input.content, media: input.media ?? [] },
      );
      if (!res.ok) return res;
      adoptServerRows("forumComments", [res.row as unknown as Record<string, unknown>]);
      return { ok: true, id: res.row.id, mod: modOf(res) };
    },
    [adoptServerRows]
  );

  /** Lượt thích đang gửi — bấm liên tục không bắn trùng yêu cầu */
  const likeInFlightRef = useRef(new Set<string>());
  const toggleForumLike = useCallback(
    async (kind: "THREAD" | "COMMENT", id: number): Promise<MemberWriteResult> => {
      const key = `${kind}:${id}`;
      if (likeInFlightRef.current.has(key)) return { ok: false, error: "Đang xử lý lượt thích trước.", busy: true };
      likeInFlightRef.current.add(key);
      try {
        const res = await postMemberApi<{ row: ForumThread | ForumComment; liked: boolean; likeCount: number }>(
          "/api/dien-dan/thich",
          { kind, id },
        );
        if (!res.ok) return res;
        adoptServerRows(kind === "THREAD" ? "forumThreads" : "forumComments", [res.row as unknown as Record<string, unknown>]);
        return { ok: true, id, liked: res.liked, likeCount: res.likeCount };
      } finally {
        likeInFlightRef.current.delete(key);
      }
    },
    [adoptServerRows]
  );

  const moderateForumItem = useCallback(
    (session: Session, kind: "THREAD" | "COMMENT", id: number, action: "APPROVE" | "REJECT" | "HIDE", reason?: string) => {
      const stamp = { moderatedByAccountId: session.accountId, moderatedAt: nowISO() };
      if (kind === "THREAD") {
        setForumThreads((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...stamp,
                  status: action === "APPROVE" ? "PUBLISHED" : "HIDDEN",
                  rejectionReason: action === "REJECT" ? (reason ?? "Không phù hợp với quy tắc diễn đàn") : undefined,
                }
              : t
          )
        );
      } else {
        setForumComments((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...stamp,
                  status: action === "APPROVE" ? "PUBLISHED" : "REJECTED",
                }
              : c
          )
        );
      }
    },
    []
  );

  /* ============ v12 — Đóng góp cộng đồng & chương trình ============ */

  /** Cộng điểm đóng góp cho đoàn viên (nội bộ — không đưa vào StoreValue) */
  const awardContribution = useCallback(
    (accountId: number, kind: ContributionKind, refId: number, refTitle: string) => {
      setContributions((prev) => [
        { id: nextId(), accountId, kind, refId, refTitle, points: CONTRIBUTION_POINTS[kind], createdAt: nowISO() },
        ...prev,
      ]);
    },
    []
  );

  /** Gửi bài đóng góp qua /api/dong-gop — máy chủ kiểm duyệt AI, luôn chờ Ban biên tập duyệt */
  const createMemberContribution = useCallback(
    async (input: { categoryTag: string; title: string; excerpt: string; content: string; coverDataUrl?: string }): Promise<MemberWriteResult> => {
      const res = await postMemberApi<{ row: MemberContribution; verdict?: ModerationResult["verdict"]; reason?: string | null }>(
        "/api/dong-gop",
        input,
      );
      if (!res.ok) return res;
      adoptServerRows("memberContributions", [res.row as unknown as Record<string, unknown>]);
      return { ok: true, id: res.row.id, mod: modOf(res) };
    },
    [adoptServerRows]
  );

  /** Duyệt bài đóng góp — APPROVE dựng PublishedPost công khai + cộng điểm; REJECT trả lý do */
  const moderateMemberContribution = useCallback(
    (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string): number | undefined => {
      const c = memberContributions.find((x) => x.id === id);
      if (!c) return undefined;
      const stamp = { moderatedByAccountId: session.accountId, moderatedAt: nowISO() };
      if (action === "REJECT") {
        const why = reason?.trim() || "Nội dung chưa phù hợp để đăng tải";
        setMemberContributions((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...stamp, status: "REJECTED", rejectionReason: why } : x))
        );
        addNotification({
          recipientAccountId: c.contributorAccountId,
          notificationType: "CONTRIBUTION_REJECTED",
          title: "Bài đóng góp chưa được duyệt",
          message: `Bài "${c.title}" chưa được duyệt đăng. Lý do: ${why}.`,
          refType: "MEMBER_CONTRIBUTION", refId: id, linkUrl: "/tai-khoan",
        });
        return undefined;
      }
      const postId = nextId();
      const slug = c.title
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
        .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70) || `bai-viet-${postId}`;
      const contributor = accounts.find((a) => a.id === c.contributorAccountId);
      const post: PublishedPost = {
        id: postId,
        activityId: null,
        slug,
        title: c.title,
        excerpt: c.excerpt,
        content: c.content,
        coverSeed: 1,
        coverDataUrl: c.coverDataUrl,
        status: "PUBLISHED",
        isFeatured: false,
        publishedAt: nowISO(),
        viewCount: 0,
        authorOrgUnitName: contributor ? orgName(contributor.orgUnitId) : "Cộng đồng đoàn viên",
        editorAccountId: session.accountId,
        contributorAccountId: c.contributorAccountId,
        categoryNames: [c.categoryTag],
        createdAt: nowISO(),
      };
      setPublishedPosts((prev) => [post, ...prev]);
      setMemberContributions((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...stamp, status: "APPROVED", postSlug: slug } : x))
      );
      awardContribution(c.contributorAccountId, "POST", postId, c.title);
      addNotification({
        recipientAccountId: c.contributorAccountId,
        notificationType: "CONTRIBUTION_APPROVED",
        title: `Bài đóng góp đã được đăng (+${CONTRIBUTION_POINTS.POST} điểm)`,
        message: `Bài "${c.title}" đã được duyệt đăng công khai. Bạn được cộng ${CONTRIBUTION_POINTS.POST} điểm đóng góp.`,
        refType: "POST", refId: postId, linkUrl: `/tin-tuc/${slug}`,
      });
      return postId;
    },
    [accounts, memberContributions, awardContribution, orgName, addNotification]
  );

  /** Đoàn viên gửi tài nguyên qua /api/tai-nguyen/dong-gop — luôn DRAFT + isPublic false, chờ Ban TNTH duyệt */
  const submitResourceDraft = useCallback(
    async (input: { resourceTypeId: number; title: string; description: string; fileName: string; fileSizeKb: number; fileDataUrl?: string }): Promise<MemberWriteResult> => {
      const res = await postMemberApi<{ row: Resource }>("/api/tai-nguyen/dong-gop", input);
      if (!res.ok) return res;
      adoptServerRows("resources", [res.row as unknown as Record<string, unknown>]);
      return { ok: true, id: res.row.id };
    },
    [adoptServerRows]
  );

  const moderateResourceContribution = useCallback(
    (session: Session, id: number, action: "APPROVE" | "REJECT") => {
      const r = resources.find((x) => x.id === id);
      if (!r?.submittedByAccountId) return;
      if (action === "APPROVE") {
        setResources((prev) => prev.map((x) => (x.id === id ? { ...x, status: "PUBLISHED", isPublic: true } : x)));
        awardContribution(r.submittedByAccountId, "RESOURCE", id, r.title);
        addNotification({
          recipientAccountId: r.submittedByAccountId,
          notificationType: "CONTRIBUTION_APPROVED",
          title: `Tài nguyên được duyệt (+${CONTRIBUTION_POINTS.RESOURCE} điểm)`,
          message: `Tài nguyên "${r.title}" đã được công khai trên kho tài nguyên dùng chung. Bạn được cộng ${CONTRIBUTION_POINTS.RESOURCE} điểm đóng góp.`,
          refType: "RESOURCE", refId: id, linkUrl: "/tai-nguyen",
        });
      } else {
        setResources((prev) => prev.filter((x) => x.id !== id));
        trackDelete("resources", [id]);
        addNotification({
          recipientAccountId: r.submittedByAccountId,
          notificationType: "CONTRIBUTION_REJECTED",
          title: "Tài nguyên đóng góp chưa được duyệt",
          message: `Tài nguyên "${r.title}" chưa phù hợp để công khai trên kho tài nguyên dùng chung.`,
          refType: "RESOURCE", refId: id, linkUrl: "/tai-khoan",
        });
      }
    },
    [resources, awardContribution, addNotification, trackDelete]
  );

  const saveDirectory = useCallback(
    (session: Session, orgUnitId: number, input: { secretaryName: string; secretaryPhone: string; email: string; achievements: string; strengths: string; academicResources: string; clubs: string }) => {
      setOrgDirectories((prev) => {
        const exists = prev.find((d) => d.orgUnitId === orgUnitId);
        if (exists) {
          return prev.map((d) => (d.orgUnitId === orgUnitId ? { ...d, ...input, updatedAt: nowISO(), updatedByAccountId: session.accountId } : d));
        }
        return [...prev, { ...input, id: nextId(), orgUnitId, updatedAt: nowISO(), updatedByAccountId: session.accountId }];
      });
    },
    []
  );

  /** Đăng ký dự án qua /api/du-an — máy chủ kiểm duyệt AI, luôn chờ cấp trên duyệt */
  const submitVolunteerProject = useCallback(
    async (input: { province: string; projectName: string; summary: string; beneficiaries: string; participants: number; field: VolunteerProjectField; phase: VolunteerProjectPhase; reportFile?: { name: string; dataUrl?: string } }): Promise<MemberWriteResult> => {
      const res = await postMemberApi<{ row: VolunteerProject; verdict?: ModerationResult["verdict"]; reason?: string | null }>(
        "/api/du-an",
        { ...input, reportFile: input.reportFile?.dataUrl ? input.reportFile : undefined },
      );
      if (!res.ok) return res;
      adoptServerRows("volunteerProjects", [res.row as unknown as Record<string, unknown>]);
      return { ok: true, id: res.row.id, mod: modOf(res) };
    },
    [adoptServerRows]
  );

  const moderateVolunteerProject = useCallback(
    (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string) => {
      const p = volunteerProjects.find((x) => x.id === id);
      if (!p) return;
      const stamp = { moderatedByAccountId: session.accountId, moderatedAt: nowISO() };
      setVolunteerProjects((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x, ...stamp,
                status: action === "APPROVE" ? "APPROVED" : "REJECTED",
                rejectionReason: action === "REJECT" ? (reason?.trim() || "Dự án chưa đạt yêu cầu") : undefined,
              }
            : x
        )
      );
      if (p.submittedByAccountId) {
        if (action === "APPROVE") {
          awardContribution(p.submittedByAccountId, "PROJECT", id, p.projectName);
          addNotification({
            recipientAccountId: p.submittedByAccountId,
            notificationType: "PROJECT_APPROVED",
            title: `Dự án tình nguyện được duyệt (+${CONTRIBUTION_POINTS.PROJECT} điểm)`,
            message: `Dự án "${p.projectName}" đã được duyệt và đăng vào ngân hàng dự án tình nguyện. Bạn được cộng ${CONTRIBUTION_POINTS.PROJECT} điểm đóng góp.`,
            refType: "VOLUNTEER_PROJECT", refId: id, linkUrl: "/du-an-tinh-nguyen",
          });
        } else {
          addNotification({
            recipientAccountId: p.submittedByAccountId,
            notificationType: "CONTRIBUTION_REJECTED",
            title: "Dự án tình nguyện chưa được duyệt",
            message: `Dự án "${p.projectName}" chưa được duyệt. Lý do: ${reason?.trim() || "Dự án chưa đạt yêu cầu"}.`,
            refType: "VOLUNTEER_PROJECT", refId: id, linkUrl: "/du-an-tinh-nguyen",
          });
        }
      }
    },
    [volunteerProjects, awardContribution, addNotification]
  );

  /* ============ v12 — Thi trực tuyến ============ */

  const saveQuizExam = useCallback(
    (session: Session, input: { code: string; title: string; description?: string; durationMinutes: number; shuffleQuestions: boolean; shuffleOptions: boolean; adaptive: boolean; topics?: string[]; status?: QuizExam["status"] }, questionIds: number[]) => {
      const id = nextId();
      const exam: QuizExam = {
        id,
        code: input.code.trim() || `KT-2026-${String(id % 1000).padStart(3, "0")}`,
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        durationMinutes: input.durationMinutes || 15,
        questionIds,
        shuffleQuestions: input.shuffleQuestions,
        shuffleOptions: input.shuffleOptions,
        adaptive: input.adaptive,
        topics: input.topics?.length ? input.topics : undefined,
        status: input.status ?? "OPEN",
        createdByAccountId: session.accountId,
        createdAt: nowISO(),
      };
      setQuizExams((prev) => [exam, ...prev]);
      return id;
    },
    []
  );

  const setQuizExamStatus = useCallback((id: number, status: QuizExam["status"]) => {
    setQuizExams((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }, []);

  const startQuizAttempt = useCallback(
    async (examId: number, examinee: { name: string; orgText: string }): Promise<ApiResult<QuizStartResult>> => {
      const r = await callPublicApi<QuizStartResult>("/api/thi/bat-dau", {
        examId,
        examineeName: examinee.name,
        examineeOrgText: examinee.orgText,
      });
      if (r.ok) adoptServerRows("quizAttempts", [r.attempt as unknown as Record<string, unknown>]);
      return r;
    },
    [adoptServerRows]
  );

  const submitQuizAttempt = useCallback(
    async (attemptId: number, accessToken: string, answers: Record<number, QuizAnswer>): Promise<ApiResult<QuizSubmitResult>> => {
      const r = await callPublicApi<QuizSubmitResult>("/api/thi/nop", { attemptId, accessToken, answers });
      if (r.ok) adoptServerRows("quizAttempts", [r.attempt as unknown as Record<string, unknown>]);
      return r;
    },
    [adoptServerRows]
  );

  const gradeQuizAttempt = useCallback(
    (session: Session, attemptId: number, manualPoints: number) => {
      const at = quizAttempts.find((x) => x.id === attemptId);
      if (!at) return;
      setQuizAttempts((prev) =>
        prev.map((x) => (x.id === attemptId ? { ...x, manualPoints, status: "GRADED", gradedByAccountId: session.accountId } : x))
      );
      if (at.accountId) {
        addNotification({
          recipientAccountId: at.accountId,
          notificationType: "SYSTEM",
          title: "Kết quả thi đã có điểm chính thức",
          message: `Lượt thi "${at.examineeName}" đã được chấm: ${at.autoScore} điểm tự động + ${manualPoints} điểm tự luận.`,
          refType: "QUIZ_ATTEMPT", refId: attemptId, linkUrl: "/thi-kien-thuc",
        });
      }
    },
    [quizAttempts, addNotification]
  );

  /* ============ v12 — Học sinh 3 tốt ============ */

  /** Lấy hoặc tạo hồ sơ 3 tốt của đoàn viên (máy chủ cấp mã, idempotent) — CHỈ gọi trong useEffect */
  const ensureHs3tProfile = useCallback(
    async (session: Session): Promise<Hs3tProfile | null> => {
      const existing = hs3tProfiles.find((p) => p.accountId === session.accountId);
      if (existing || session.role !== "DOAN_VIEN") return existing ?? null;
      const res = await postMemberApi<{ row: Hs3tProfile }>("/api/hs3t/ho-so", {});
      if (!res.ok) return null;
      adoptServerRows("hs3tProfiles", [res.row as unknown as Record<string, unknown>]);
      return res.row;
    },
    [hs3tProfiles, adoptServerRows]
  );

  const addHs3tAchievement = useCallback(
    async (session: Session, profileId: number, input: { title: string; category: Hs3tCategory; sub?: string; evidenceNames?: string[]; achievedAt: string; asSchool?: boolean }): Promise<MemberWriteResult> => {
      // Đoàn viên: chỉ thêm vào hồ sơ của chính mình — máy chủ kiểm tra chủ hồ sơ
      if (session.role === "DOAN_VIEN") {
        const res = await postMemberApi<{ row: Hs3tAchievement }>("/api/hs3t/thanh-tich", {
          profileId,
          title: input.title,
          category: input.category,
          sub: input.sub,
          evidenceNames: input.evidenceNames ?? [],
          achievedAt: input.achievedAt,
        });
        if (!res.ok) return res;
        adoptServerRows("hs3tAchievements", [res.row as unknown as Record<string, unknown>]);
        return { ok: true, id: res.row.id };
      }
      const profile = hs3tProfiles.find((p) => p.id === profileId);
      if (!profile) return { ok: false, error: "Không tìm thấy hồ sơ 3 tốt." };
      // Cán bộ trường chỉ được "bổ sung hộ" hồ sơ thuộc trường mình (kiểm tra 2 lớp)
      const asSchool = input.asSchool === true && session.orgUnitId === profile.schoolOrgUnitId;
      const id = nextId();
      setHs3tAchievements((prev) => [
        ...prev,
        {
          id,
          profileId,
          title: input.title.trim(),
          category: input.category,
          sub: input.sub?.trim() || undefined,
          evidenceNames: input.evidenceNames?.length ? input.evidenceNames : undefined,
          achievedAt: input.achievedAt || nowISO().slice(0, 10),
          addedByRole: asSchool ? "SCHOOL" : "STUDENT",
          addedByAccountId: session.accountId,
          createdAt: nowISO(),
        },
      ]);
      return { ok: true, id };
    },
    [hs3tProfiles, adoptServerRows]
  );

  const awardHs3tLevel = useCallback(
    (session: Session, profileId: number, level: "XA" | "TINH" | "TW") => {
      const profile = hs3tProfiles.find((p) => p.id === profileId);
      setHs3tProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, awardedLevel: level, awardedAt: nowISO(), awardedByAccountId: session.accountId } : p))
      );
      if (profile) {
        awardContribution(profile.accountId, "HS3T", profileId, `Hồ sơ 3 tốt ${profile.code}`);
        addNotification({
          recipientAccountId: profile.accountId,
          notificationType: "HS3T_AWARDED",
          title: `Hồ sơ 3 tốt đạt danh hiệu cấp ${level === "XA" ? "Xã/Phường" : level === "TINH" ? "Tỉnh/Thành phố" : "Trung ương"}`,
          message: `Hồ sơ Học sinh 3 tốt ${profile.code} đã được chốt danh hiệu. Bạn được cộng ${CONTRIBUTION_POINTS.HS3T} điểm đóng góp.`,
          refType: "HS3T_PROFILE", refId: profileId, linkUrl: "/hoc-sinh-3-tot",
        });
      }
    },
    [hs3tProfiles, awardContribution, addNotification]
  );

  /** Điều 5 Quy chế TW — đơn vị lưu tiêu chuẩn riêng (bắt buộc xác nhận không cao hơn chuẩn TW phía UI) */
  const saveHs3tUnitStandard = useCallback(
    (session: Session, input: { applyTw: boolean; daoDuc?: string; hocTap?: string; theLuc?: string; thanhTichKhac?: string; note?: string }) => {
      setHs3tUnitStandards((prev) => {
        const existing = prev.find((s) => s.orgUnitId === session.orgUnitId);
        const record: Hs3tUnitStandard = {
          id: existing?.id ?? nextId(),
          orgUnitId: session.orgUnitId,
          applyTw: input.applyTw,
          daoDuc: input.applyTw ? undefined : input.daoDuc?.trim() || undefined,
          hocTap: input.applyTw ? undefined : input.hocTap?.trim() || undefined,
          theLuc: input.applyTw ? undefined : input.theLuc?.trim() || undefined,
          thanhTichKhac: input.applyTw ? undefined : input.thanhTichKhac?.trim() || undefined,
          note: input.note?.trim() || undefined,
          confirmedByAccountId: session.accountId,
          updatedAt: nowISO(),
        };
        return existing
          ? prev.map((s) => (s.orgUnitId === session.orgUnitId ? record : s))
          : [record, ...prev];
      });
    },
    []
  );

  const value: StoreValue = useMemo(
    () => ({
      orgUnits, accounts, contentCategories, documentCategories, resourceTypes, feedbackTopics,
      activities, publishedPosts, criteriaSets, tasks, taskMetrics, taskAssignments,
      assignmentTargets, taskResults, assignmentReviews, scores, rankingSnapshots, rankingEntries,
      reports, documents, documentRecipients, notifications, feedbacks, feedbackMessages,
      attendances, attendanceOpenIds, liveEvents, liveEnabled, setLiveEnabled, resources, settings,
      orgName, orgById, accountByOrgUnit, scopeIds, taskMetricsOf, targetsOf, resultsOf,
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf, setOrgUnits,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, setAssignmentProgress, revokeAssignment, saveScore,
      createDirectiveTask,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus, sendFeedbackResultEmail, emailLogs,
      toggleAttendance, addAttendance,
      saveResource, deleteResource, downloadResource,
      updateSetting, updateAccountStatus, updateAccount, updateAccountPermissions, refreshAccounts, refreshOrgUnits, deleteAccount, createAccount,
      forumThreads, forumComments, createForumThread, createForumComment, toggleForumLike, moderateForumItem,
      contributions, memberContributions, createMemberContribution, moderateMemberContribution,
      submitResourceDraft, moderateResourceContribution,
      orgDirectories, saveDirectory,
      volunteerProjects, submitVolunteerProject, moderateVolunteerProject,
      quizQuestions, quizExams, saveQuizExam, setQuizExamStatus, quizAttempts,
      startQuizAttempt, submitQuizAttempt, gradeQuizAttempt,
      hs3tProfiles, hs3tAchievements, hs3tUnitStandards, ensureHs3tProfile, addHs3tAchievement, awardHs3tLevel, saveHs3tUnitStandard,
    }),
    [
      forumThreads, forumComments,
      createForumThread, createForumComment, toggleForumLike, moderateForumItem,
      contributions, memberContributions, createMemberContribution, moderateMemberContribution,
      submitResourceDraft, moderateResourceContribution,
      orgDirectories, saveDirectory,
      volunteerProjects, submitVolunteerProject, moderateVolunteerProject,
      quizQuestions, quizExams, saveQuizExam, setQuizExamStatus, quizAttempts,
      startQuizAttempt, submitQuizAttempt, gradeQuizAttempt,
      hs3tProfiles, hs3tAchievements, hs3tUnitStandards, ensureHs3tProfile, addHs3tAchievement, awardHs3tLevel, saveHs3tUnitStandard,
      orgUnits, accounts, activities, publishedPosts, criteriaSets, tasks, taskMetrics,
      taskAssignments, assignmentTargets, taskResults, assignmentReviews, scores,
      rankingSnapshots, rankingEntries, reports, documents, documentRecipients,
      notifications, feedbacks, feedbackMessages, attendances, attendanceOpenIds, liveEvents, liveEnabled, resources, settings,
      orgName, orgById, accountByOrgUnit, scopeIds, taskMetricsOf, targetsOf, resultsOf,
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf, setOrgUnits,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, setAssignmentProgress, revokeAssignment, saveScore,
      createDirectiveTask,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus, sendFeedbackResultEmail, emailLogs,
      toggleAttendance, addAttendance,
      saveResource, deleteResource, downloadResource,
      updateSetting, updateAccountStatus, updateAccount, updateAccountPermissions, refreshAccounts, refreshOrgUnits, deleteAccount, createAccount,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
