"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Activity, Account, AdaptiveStep, AssignmentReview, AssignmentTarget, Attendance,
  ContributionKind, ContributionLog, CriteriaSet,
  DocumentRecord, DocumentRecipient, EmailLog, Feedback, FeedbackMessage, ForumComment, ForumMedia, ForumThread,
  Hs3tAchievement, Hs3tCategory, Hs3tProfile, Hs3tUnitStandard, LiveEvent, MemberContribution, ModerationResult, Notification,
  OrgDirectory, PublishedPost, QuizAnswer, QuizAttempt, QuizExam, QuizQuestion,
  RankingEntry, RankingSnapshot, Report, Resource, Score,
  Sponsor, SystemSetting, Task, TaskAssignment, TaskMetric, TaskResult, VolunteerProject,
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
import { sponsors as seedSponsors } from "@/data/sponsors";
import { orgDirectories as seedDirectories } from "@/data/directory";
import { volunteerProjects as seedVolunteerProjects } from "@/data/volunteer-projects";
import { quizQuestions as seedQuizQuestions } from "@/data/quiz-bank";
import { quizExams as seedQuizExams } from "@/data/quiz-exams";
import { hs3tProfiles as seedHs3tProfiles, hs3tAchievements as seedHs3tAchievements, hs3tUnitStandards as seedHs3tUnitStandards } from "@/data/hs3t";
import { generateUniqueAlias } from "@/lib/forum-alias";
import type { Session } from "@/lib/auth-context";
import { appendCreatedAccount, loadCreatedAccounts } from "@/lib/created-accounts";

/* ---------------- Input types ---------------- */

export interface ActivityInput {
  title: string; summary: string; startDate: string; endDate: string;
  location?: string; participantCount?: number; categoryIds: number[];
  links: { platform: string; url: string; note?: string }[];
  imageSeed?: number;
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
const nextId = () => ++uid;

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
const seedAttendances: Attendance[] = [
  { id: 1, activityId: 101, memberName: "Nguyễn Thị Kim Ngân", memberClass: "12A1", orgUnitId: 31, checkedInAt: "2026-08-15T01:10:00Z" },
  { id: 2, activityId: 101, memberName: "Trần Hoàng Phú", memberClass: "11A3", orgUnitId: 31, checkedInAt: "2026-08-15T01:12:00Z" },
  { id: 3, activityId: 101, memberName: "Lê Thanh Trúc", memberClass: "10A2", orgUnitId: 31, checkedInAt: "2026-08-15T01:15:00Z" },
  { id: 4, activityId: 102, memberName: "Phạm Mỹ Duyên", memberClass: "12A5", orgUnitId: 31, checkedInAt: "2026-08-02T02:30:00Z" },
];

interface StoreValue {
  /* data */
  orgUnits: typeof seedOrgUnits;
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
  createPostFromActivity: (session: Session, activityId: number, title: string, excerpt: string, extras?: Partial<PublishedPost>) => number;

  /* tasks (R3) */
  distributeAssignment: (session: Session, taskId: number, parentAssignmentId: number | null, orgUnitId: number, dueDate: string, targets: { taskMetricId: number; targetValue: number }[], note?: string) => void;
  /** Tạo nhiệm vụ từ AI lượng hoá công văn — tạo Task + TaskMetrics + giao nhiều đơn vị + thông báo, trả về id */
  createDirectiveTask: (session: Session, input: DirectiveTaskInput) => { taskId: number; assignmentIds: number[] };
  updateResult: (session: Session, assignmentId: number, values: { assignmentTargetId: number; reportedValue: number }[], note?: string) => void;
  reviewAssignment: (session: Session, assignmentId: number, action: AssignmentReview["action"], note?: string) => void;
  /** Đánh dấu nhanh tiến độ (hoàn thành / đang làm / chưa bắt đầu) ngay từ danh sách nhiệm vụ */
  setAssignmentProgress: (session: Session, assignmentId: number, status: TaskAssignment["progressStatus"]) => void;
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
  submitFeedback: (input: { senderName: string; senderEmail: string; senderPhone?: string; senderOrgText?: string; senderCommuneUnion?: string; senderProvinceUnion?: string; evidenceNames?: string[]; feedbackTopicId: number; title: string; content: string; senderAccountId?: number }) => string;
  replyFeedback: (session: Session, feedbackId: number, content: string, internal: boolean) => void;
  setFeedbackStatus: (session: Session, feedbackId: number, status: Feedback["status"]) => void;
  /** Gửi email kết quả/phản hồi cho người gửi (giả lập SMTP) — trả về false nếu thiếu email */
  sendFeedbackResultEmail: (session: Session, feedbackId: number, kind?: EmailLog["kind"]) => boolean;
  emailLogs: EmailLog[];

  /* attendance (công khai, không cần session) */
  toggleAttendance: (session: Session, activityId: number, open: boolean) => void;
  addAttendance: (input: { activityId: number; memberName: string; memberClass?: string }) => boolean;

  /* resources (R9) */
  saveResource: (input: Omit<Resource, "id" | "downloadCount">, id?: number) => void;
  downloadResource: (id: number) => void;

  /* system */
  updateSetting: (key: string, value: string) => void;
  updateAccountStatus: (accountId: number, status: Account["status"]) => void;
  createAccount: (input: {
    orgUnitId: number; username: string; email: string; phone?: string; contactPerson: string;
    contactPosition: string; role: Account["role"]; status?: Account["status"]; password?: string;
  }) => { ok: boolean; error?: string };

  /* forum ẩn danh */
  forumThreads: ForumThread[];
  forumComments: ForumComment[];
  createForumThread: (session: Session, input: { title: string; content: string; topic?: string; media?: ForumMedia[] }, mod: ModerationResult) => number;
  createForumComment: (session: Session, input: { threadId: number; content: string; media?: ForumMedia[] }, mod: ModerationResult) => number;
  toggleForumLike: (session: Session, kind: "THREAD" | "COMMENT", id: number) => void;
  moderateForumItem: (session: Session, kind: "THREAD" | "COMMENT", id: number, action: "APPROVE" | "REJECT" | "HIDE", reason?: string) => void;

  /* v12 — đóng góp cộng đồng & chương trình */
  contributions: ContributionLog[];
  memberContributions: MemberContribution[];
  createMemberContribution: (session: Session, input: { categoryTag: string; title: string; excerpt: string; content: string; coverDataUrl?: string }, mod: ModerationResult) => number;
  moderateMemberContribution: (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string) => number | undefined;
  submitResourceDraft: (session: Session, input: { resourceTypeId: number; title: string; description: string; fileName: string; fileSizeKb: number }) => number;
  moderateResourceContribution: (session: Session, id: number, action: "APPROVE" | "REJECT") => void;
  sponsors: Sponsor[];
  saveSponsor: (input: Omit<Sponsor, "id">, id?: number) => void;
  orgDirectories: OrgDirectory[];
  saveDirectory: (session: Session, orgUnitId: number, input: { secretaryName: string; secretaryPhone: string; email: string; achievements: string; strengths: string; academicResources: string; clubs: string }) => void;
  volunteerProjects: VolunteerProject[];
  submitVolunteerProject: (session: Session, input: { orgUnitId: number; schoolName: string; province: string; projectName: string; summary: string; beneficiaries: string; participants: number; mapX: number; mapY: number; reportFile?: { name: string; dataUrl?: string } }, mod: ModerationResult) => number;
  moderateVolunteerProject: (session: Session, id: number, action: "APPROVE" | "REJECT", reason?: string) => void;
  quizQuestions: QuizQuestion[];
  quizExams: QuizExam[];
  saveQuizExam: (session: Session, input: { code: string; title: string; description?: string; durationMinutes: number; shuffleQuestions: boolean; shuffleOptions: boolean; adaptive: boolean; topics?: string[]; status?: QuizExam["status"] }, questionIds: number[]) => number;
  setQuizExamStatus: (id: number, status: QuizExam["status"]) => void;
  quizAttempts: QuizAttempt[];
  startQuizAttempt: (examId: number, examinee: { name: string; orgText: string; accountId?: number }) => number;
  submitQuizAttempt: (attemptId: number, answers: Record<number, QuizAnswer>, autoScore: number, maxScore: number, trail?: AdaptiveStep[]) => void;
  gradeQuizAttempt: (session: Session, attemptId: number, manualPoints: number) => void;
  hs3tProfiles: Hs3tProfile[];
  hs3tAchievements: Hs3tAchievement[];
  hs3tUnitStandards: Hs3tUnitStandard[];
  ensureHs3tProfile: (session: Session) => Hs3tProfile;
  addHs3tAchievement: (session: Session, profileId: number, input: { title: string; category: Hs3tCategory; sub?: string; evidenceNames?: string[]; achievedAt: string; asSchool?: boolean }) => void;
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
  const [orgUnits] = useState(seedOrgUnits);
  const [accounts, setAccounts] = useState(seedAccounts);
  const [activities, setActivities] = useState(seedActivities);
  const [publishedPosts, setPublishedPosts] = useState(seedPosts);
  const [criteriaSets] = useState(seedCriteriaSets);
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
  const [attendanceOpenIds, setAttendanceOpenIds] = useState<number[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(seedLiveEvents);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [resources, setResources] = useState(seedResources);
  const [settings, setSettings] = useState(seedSettings);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>(seedForumThreads);
  const [forumComments, setForumComments] = useState<ForumComment[]>(seedForumComments);
  const [contributions, setContributions] = useState<ContributionLog[]>([]);
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>(seedSponsors);
  const [orgDirectories, setOrgDirectories] = useState<OrgDirectory[]>(seedDirectories);
  const [volunteerProjects, setVolunteerProjects] = useState<VolunteerProject[]>(seedVolunteerProjects);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(seedQuizQuestions);
  const [quizExams, setQuizExams] = useState<QuizExam[]>(seedQuizExams);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [hs3tProfiles, setHs3tProfiles] = useState<Hs3tProfile[]>(seedHs3tProfiles);
  const [hs3tAchievements, setHs3tAchievements] = useState<Hs3tAchievement[]>(seedHs3tAchievements);
  const [hs3tUnitStandards, setHs3tUnitStandards] = useState<Hs3tUnitStandard[]>(seedHs3tUnitStandards);

  // Khôi phục tài khoản đã tạo từ localStorage (để khớp với đăng nhập) — chặn trùng username lẫn id,
  // kể cả trùng NỘI BỘ danh sách đã lưu (bản cũ từng sinh id nextId() đè lên id của /dang-ky)
  useEffect(() => {
    const created = loadCreatedAccounts();
    if (created.length > 0) {
      setAccounts((prev) => {
        const known = new Set(prev.map((a) => a.username.toLowerCase()));
        const knownIds = new Set(prev.map((a) => a.id));
        const restored: Account[] = [];
        for (const c of created) {
          if (known.has(c.username.toLowerCase()) || knownIds.has(c.id)) continue;
          known.add(c.username.toLowerCase());
          knownIds.add(c.id);
          const { password: _pw, displayName: _dn, orgUnitName: _on, ...acc } = c;
          restored.push(acc as Account);
        }
        return restored.length > 0 ? [...prev, ...restored] : prev;
      });
    }
  }, []);

  // Ticker mô phỏng realtime — mặc định TẮT, đệ quy setTimeout 8–15s, cap 40 sự kiện
  useEffect(() => {
    if (!liveEnabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const lvl34 = orgUnits.filter((u) => u.orgLevel === 3 || u.orgLevel === 4);
      const unit = lvl34[Math.floor(Math.random() * lvl34.length)];
      if (unit) {
        const draft = buildRandomLiveEvent(unit);
        setLiveEvents((prev) => [{ ...draft, orgUnitId: unit.id, id: nextId(), createdAt: nowISO() }, ...prev].slice(0, 40));
      }
      timer = setTimeout(spawn, 8000 + Math.random() * 7000);
    };
    timer = setTimeout(spawn, 4000);
    return () => clearTimeout(timer);
  }, [liveEnabled, orgUnits]);

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
  const activeCriteriaSet = useCallback(() => criteriaSets.find((c) => c.status === "ACTIVE"), [criteriaSets]);
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
  }, []);

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
        const acc = accountByOrgUnit(act.orgUnitId);
        if (acc) {
          addNotification({
            recipientAccountId: acc.id,
            notificationType: action === "CONFIRM" ? "RESULT_CONFIRMED" : "RESULT_NEEDS_INFO",
            title: action === "CONFIRM" ? "Hoạt động được xác nhận" : action === "NEEDS_INFO" ? "Hoạt động cần bổ sung" : "Hoạt động bị trả lại",
            message: `Hoạt động "${act.title}" ${action === "CONFIRM" ? "đã được xác nhận" : "cần chỉnh sửa"}${note ? ` — ${note}` : ""}`,
            refType: "ACTIVITY", refId: id, linkUrl: `/quan-tri/hoat-dong/${id}`,
          });
        }
      }
    },
    [accountByOrgUnit, activities, addNotification]
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
    (session: Session, activityId: number, title: string, excerpt: string, extras?: Partial<PublishedPost>) => {
      const act = activities.find((a) => a.id === activityId);
      const slug = title
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
        .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 70);
      const id = nextId();
      const post: PublishedPost = {
        id, activityId, slug: slug || `bai-viet-${id}`, title, excerpt,
        content: act?.summary ?? "",
        coverSeed: act?.imageSeed ?? 1,
        status: "DRAFT", isFeatured: false, viewCount: 0,
        authorOrgUnitName: act ? orgName(act.orgUnitId) : "Ban Biên tập",
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
    (input: { senderName: string; senderEmail: string; senderPhone?: string; senderOrgText?: string; senderCommuneUnion?: string; senderProvinceUnion?: string; evidenceNames?: string[]; feedbackTopicId: number; title: string; content: string }) => {
      const maxNum = feedbacks.reduce((m, f) => {
        const match = f.trackingCode.match(/PA-\d{4}-(\d+)/);
        return match ? Math.max(m, parseInt(match[1], 10)) : m;
      }, 100);
      const code = `PA-2026-${String(maxNum + 1).padStart(5, "0")}`;
      const id = nextId();
      setFeedbacks((prev) => [
        { ...input, id, trackingCode: code, status: "NEW", submittedAt: nowISO() },
        ...prev,
      ]);
      setFeedbackMessages((prev) => [
        ...prev,
        { id: nextId(), feedbackId: id, senderType: "CITIZEN", senderName: input.senderName, content: input.content, isInternalNote: false, sentAt: nowISO() },
      ]);
      return code;
    },
    [feedbacks]
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

  const toggleAttendance = useCallback((session: Session, activityId: number, open: boolean) => {
    setAttendanceOpenIds((prev) => (open ? [...new Set([...prev, activityId])] : prev.filter((id) => id !== activityId)));
  }, []);

  const addAttendance = useCallback(
    (input: { activityId: number; memberName: string; memberClass?: string }) => {
      if (!attendanceOpenIds.includes(input.activityId)) return false;
      const record: Attendance = {
        id: nextId(),
        activityId: input.activityId,
        memberName: input.memberName.trim(),
        memberClass: input.memberClass?.trim() || undefined,
        orgUnitId: activities.find((a) => a.id === input.activityId)?.orgUnitId ?? 0,
        checkedInAt: nowISO(),
      };
      setAttendances((prev) => [record, ...prev]);
      return true;
    },
    [activities, attendanceOpenIds]
  );

  /* ============ Resources (R9) ============ */

  const saveResource = useCallback((input: Omit<Resource, "id" | "downloadCount">, id?: number) => {
    setResources((prev) => {
      if (id) return prev.map((r) => (r.id === id ? { ...r, ...input } : r));
      return [{ ...input, id: nextId(), downloadCount: 0 }, ...prev];
    });
  }, []);

  const downloadResource = useCallback((id: number) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, downloadCount: r.downloadCount + 1 } : r)));
  }, []);

  /* ============ System ============ */

  const updateSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.settingKey === key ? { ...s, value } : s)));
  }, []);

  const updateAccountStatus = useCallback((accountId: number, status: Account["status"]) => {
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, status } : a)));
  }, []);

  /* Tạo tài khoản mới (đơn lẻ hoặc từ import) — lưu kèm mật khẩu vào localStorage để đăng nhập được */
  const createAccount = useCallback(
    (input: {
      orgUnitId: number; username: string; email: string; phone?: string; contactPerson: string;
      contactPosition: string; role: Account["role"]; status?: Account["status"]; password?: string;
    }) => {
      const username = input.username.trim();
      if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, error: "Tên đăng nhập đã tồn tại" };
      }
      /* Id phải vượt max của CẢ state lẫn localStorage (nơi nextId không biết tới)
         để không đâm trùng tài khoản đã tạo từ /dang-ky hoặc phiên trước */
      const storedMax = loadCreatedAccounts().reduce((m, c) => Math.max(m, c.id), 0);
      const memoryMax = accounts.reduce((m, a) => Math.max(m, a.id), 0);
      const id = Math.max(900000, storedMax, memoryMax) + 1;
      const account: Account = {
        id,
        orgUnitId: input.orgUnitId,
        username,
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        contactPerson: input.contactPerson.trim(),
        contactPosition: input.contactPosition.trim() || "—",
        role: input.role,
        status: input.status ?? "ACTIVE",
      };
      setAccounts((prev) => [...prev, account]);
      appendCreatedAccount({
        ...account,
        password: input.password?.trim() || "demo123",
        displayName: username,
        orgUnitName: orgName(input.orgUnitId),
      });
      return { ok: true };
    },
    [accounts, orgName]
  );

  /* ============ Forum ẩn danh ============ */

  const createForumThread = useCallback(
    (session: Session, input: { title: string; content: string; topic?: string; media?: ForumMedia[] }, mod: ModerationResult) => {
      const alias = generateUniqueAlias([
        ...forumThreads.map((t) => t.alias),
        ...forumComments.map((c) => c.alias),
      ]);
      const id = nextId();
      const thread: ForumThread = {
        id,
        alias,
        authorAccountId: session.accountId,
        title: input.title.trim(),
        content: input.content.trim(),
        topic: input.topic?.trim() || undefined,
        media: input.media?.length ? input.media : undefined,
        status: mod.verdict === "CLEAN" ? "PUBLISHED" : "HIDDEN",
        likedByAccountIds: [],
        aiVerdict: mod.verdict,
        aiReason: mod.reason,
        aiModel: mod.model,
        createdAt: nowISO(),
      };
      setForumThreads((prev) => [thread, ...prev]);
      if (mod.verdict === "FLAGGED") {
        addNotification({
          recipientAccountId: 1,
          notificationType: "FORUM_FLAGGED",
          title: "Diễn đàn: bài viết chờ kiểm duyệt",
          message: `Bài "${thread.title}" của ${alias} bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "FORUM_THREAD",
          refId: id,
          linkUrl: "/quan-tri/dien-dan",
        });
      }
      return id;
    },
    [forumThreads, forumComments, addNotification]
  );

  const createForumComment = useCallback(
    (session: Session, input: { threadId: number; content: string; media?: ForumMedia[] }, mod: ModerationResult) => {
      const alias = generateUniqueAlias([
        ...forumThreads.map((t) => t.alias),
        ...forumComments.map((c) => c.alias),
      ]);
      const id = nextId();
      const comment: ForumComment = {
        id,
        threadId: input.threadId,
        alias,
        authorAccountId: session.accountId,
        content: input.content.trim(),
        media: input.media?.length ? input.media : undefined,
        status: mod.verdict === "CLEAN" ? "PUBLISHED" : "PENDING_REVIEW",
        likedByAccountIds: [],
        aiVerdict: mod.verdict,
        aiReason: mod.reason,
        aiModel: mod.model,
        createdAt: nowISO(),
      };
      setForumComments((prev) => [...prev, comment]);
      if (mod.verdict === "FLAGGED") {
        addNotification({
          recipientAccountId: 1,
          notificationType: "FORUM_FLAGGED",
          title: "Diễn đàn: bình luận chờ kiểm duyệt",
          message: `Bình luận của ${alias} trong bài #${input.threadId} bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "FORUM_COMMENT",
          refId: id,
          linkUrl: "/quan-tri/dien-dan",
        });
      }
      return id;
    },
    [forumThreads, forumComments, addNotification]
  );

  const toggleForumLike = useCallback((session: Session, kind: "THREAD" | "COMMENT", id: number) => {
    const accountId = session.accountId;
    const flip = (ids: number[]) =>
      ids.includes(accountId) ? ids.filter((x) => x !== accountId) : [...ids, accountId];
    if (kind === "THREAD") {
      setForumThreads((prev) => prev.map((t) => (t.id === id ? { ...t, likedByAccountIds: flip(t.likedByAccountIds) } : t)));
    } else {
      setForumComments((prev) => prev.map((c) => (c.id === id ? { ...c, likedByAccountIds: flip(c.likedByAccountIds) } : c)));
    }
  }, []);

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

  const createMemberContribution = useCallback(
    (session: Session, input: { categoryTag: string; title: string; excerpt: string; content: string; coverDataUrl?: string }, mod: ModerationResult) => {
      void session;
      const id = nextId();
      const record: MemberContribution = {
        id,
        contributorAccountId: session.accountId,
        categoryTag: input.categoryTag,
        title: input.title.trim(),
        excerpt: input.excerpt.trim(),
        content: input.content.trim(),
        coverDataUrl: input.coverDataUrl,
        status: "PENDING",
        aiVerdict: mod.verdict,
        aiReason: mod.reason,
        aiModel: mod.model,
        createdAt: nowISO(),
      };
      setMemberContributions((prev) => [record, ...prev]);
      if (mod.verdict === "FLAGGED") {
        addNotification({
          recipientAccountId: 1,
          notificationType: "FORUM_FLAGGED",
          title: "Bài đóng góp chờ kiểm duyệt",
          message: `Bài "${record.title}" bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "MEMBER_CONTRIBUTION", refId: id, linkUrl: "/quan-tri/dong-gop",
        });
      }
      return id;
    },
    [addNotification]
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

  /** Đoàn viên gửi tài nguyên — luôn DRAFT + isPublic false, chờ Ban TNTH duyệt */
  const submitResourceDraft = useCallback(
    (session: Session, input: { resourceTypeId: number; title: string; description: string; fileName: string; fileSizeKb: number }) => {
      const id = nextId();
      const resource: Resource = {
        id,
        resourceTypeId: input.resourceTypeId,
        title: input.title.trim(),
        description: input.description.trim(),
        fileName: input.fileName || "tai-lieu.pdf",
        fileSizeKb: input.fileSizeKb || 1024,
        isPublic: false,
        downloadCount: 0,
        publishedByOrgUnitId: session.orgUnitId,
        publishedAt: nowISO(),
        submittedByAccountId: session.accountId,
        status: "DRAFT",
      };
      setResources((prev) => [resource, ...prev]);
      addNotification({
        recipientAccountId: 1,
        notificationType: "SYSTEM",
        title: "Tài nguyên chờ duyệt từ đoàn viên",
        message: `${session.contactPerson} đóng góp tài nguyên "${resource.title}" — chờ Ban TNTH duyệt.`,
        refType: "RESOURCE", refId: id, linkUrl: "/quan-tri/dong-gop",
      });
      return id;
    },
    [addNotification]
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
        addNotification({
          recipientAccountId: r.submittedByAccountId,
          notificationType: "CONTRIBUTION_REJECTED",
          title: "Tài nguyên đóng góp chưa được duyệt",
          message: `Tài nguyên "${r.title}" chưa phù hợp để công khai trên kho tài nguyên dùng chung.`,
          refType: "RESOURCE", refId: id, linkUrl: "/tai-khoan",
        });
      }
    },
    [resources, awardContribution, addNotification]
  );

  const saveSponsor = useCallback((input: Omit<Sponsor, "id">, id?: number) => {
    setSponsors((prev) => {
      if (id) return prev.map((s) => (s.id === id ? { ...s, ...input } : s));
      return [...prev, { ...input, id: nextId() }];
    });
  }, []);

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

  const submitVolunteerProject = useCallback(
    (session: Session, input: { orgUnitId: number; schoolName: string; province: string; projectName: string; summary: string; beneficiaries: string; participants: number; mapX: number; mapY: number; reportFile?: { name: string; dataUrl?: string } }, mod: ModerationResult) => {
      const id = nextId();
      const project: VolunteerProject = {
        id,
        orgUnitId: input.orgUnitId,
        schoolName: input.schoolName.trim(),
        province: input.province,
        projectName: input.projectName.trim(),
        summary: input.summary.trim(),
        beneficiaries: input.beneficiaries.trim(),
        participants: input.participants || 1,
        status: "PENDING",
        submittedByAccountId: session.accountId,
        mapX: input.mapX,
        mapY: input.mapY,
        aiVerdict: mod.verdict,
        aiReason: mod.reason,
        reportFile: input.reportFile?.name ? input.reportFile : undefined,
        createdAt: nowISO(),
      };
      setVolunteerProjects((prev) => [project, ...prev]);
      if (mod.verdict === "FLAGGED") {
        addNotification({
          recipientAccountId: 1,
          notificationType: "FORUM_FLAGGED",
          title: "Dự án tình nguyện chờ kiểm duyệt",
          message: `Dự án "${project.projectName}" bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "VOLUNTEER_PROJECT", refId: id, linkUrl: "/quan-tri/du-an",
        });
      }
      return id;
    },
    [addNotification]
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
            message: `Dự án "${p.projectName}" đã được duyệt và hiển thị trên bản đồ dự án toàn quốc. Bạn được cộng ${CONTRIBUTION_POINTS.PROJECT} điểm đóng góp.`,
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
    (examId: number, examinee: { name: string; orgText: string; accountId?: number }) => {
      const id = nextId();
      const attempt: QuizAttempt = {
        id,
        examId,
        accountId: examinee.accountId,
        examineeName: examinee.name.trim() || "Thí sinh ẩn danh",
        examineeOrgText: examinee.orgText.trim() || "—",
        answers: {},
        autoScore: 0,
        maxScore: 0,
        status: "IN_PROGRESS",
        startedAt: nowISO(),
      };
      setQuizAttempts((prev) => [attempt, ...prev]);
      return id;
    },
    []
  );

  const submitQuizAttempt = useCallback(
    (attemptId: number, answers: Record<number, QuizAnswer>, autoScore: number, maxScore: number, trail?: AdaptiveStep[]) => {
      setQuizAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? { ...a, answers, autoScore, maxScore, trail, status: "SUBMITTED", submittedAt: nowISO() }
            : a
        )
      );
    },
    []
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

  /** Lấy hoặc tạo hồ sơ 3 tốt cho tài khoản — idempotent, CHỈ gọi trong useEffect */
  const ensureHs3tProfile = useCallback(
    (session: Session): Hs3tProfile => {
      const existing = hs3tProfiles.find((p) => p.accountId === session.accountId);
      if (existing) return existing;
      const maxNum = hs3tProfiles.reduce((m, p) => {
        const match = p.code.match(/HS3T-\d{4}-(\d+)/);
        return match ? Math.max(m, parseInt(match[1], 10)) : m;
      }, 1000);
      const profile: Hs3tProfile = {
        id: nextId(),
        code: `HS3T-2026-${maxNum + 1}`,
        accountId: session.accountId,
        studentName: session.contactPerson,
        schoolOrgUnitId: session.orgUnitId,
        createdAt: nowISO(),
      };
      // idempotent trong strict mode — chỉ thêm khi chưa có
      setHs3tProfiles((prev) => (prev.some((p) => p.accountId === session.accountId) ? prev : [profile, ...prev]));
      return profile;
    },
    [hs3tProfiles]
  );

  const addHs3tAchievement = useCallback(
    (session: Session, profileId: number, input: { title: string; category: Hs3tCategory; sub?: string; evidenceNames?: string[]; achievedAt: string; asSchool?: boolean }) => {
      const profile = hs3tProfiles.find((p) => p.id === profileId);
      if (!profile) return;
      // Cán bộ trường chỉ được "bổ sung hộ" hồ sơ thuộc trường mình (kiểm tra 2 lớp)
      const asSchool = input.asSchool === true && session.orgUnitId === profile.schoolOrgUnitId;
      setHs3tAchievements((prev) => [
        ...prev,
        {
          id: nextId(),
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
    },
    [hs3tProfiles]
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
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, setAssignmentProgress, saveScore,
      createDirectiveTask,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus, sendFeedbackResultEmail, emailLogs,
      toggleAttendance, addAttendance,
      saveResource, downloadResource,
      updateSetting, updateAccountStatus, createAccount,
      forumThreads, forumComments, createForumThread, createForumComment, toggleForumLike, moderateForumItem,
      contributions, memberContributions, createMemberContribution, moderateMemberContribution,
      submitResourceDraft, moderateResourceContribution,
      sponsors, saveSponsor, orgDirectories, saveDirectory,
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
      sponsors, saveSponsor, orgDirectories, saveDirectory,
      volunteerProjects, submitVolunteerProject, moderateVolunteerProject,
      quizQuestions, quizExams, saveQuizExam, setQuizExamStatus, quizAttempts,
      startQuizAttempt, submitQuizAttempt, gradeQuizAttempt,
      hs3tProfiles, hs3tAchievements, hs3tUnitStandards, ensureHs3tProfile, addHs3tAchievement, awardHs3tLevel, saveHs3tUnitStandard,
      orgUnits, accounts, activities, publishedPosts, criteriaSets, tasks, taskMetrics,
      taskAssignments, assignmentTargets, taskResults, assignmentReviews, scores,
      rankingSnapshots, rankingEntries, reports, documents, documentRecipients,
      notifications, feedbacks, feedbackMessages, attendances, attendanceOpenIds, liveEvents, liveEnabled, resources, settings,
      orgName, orgById, accountByOrgUnit, scopeIds, taskMetricsOf, targetsOf, resultsOf,
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, setAssignmentProgress, saveScore,
      createDirectiveTask,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus, sendFeedbackResultEmail, emailLogs,
      toggleAttendance, addAttendance,
      saveResource, downloadResource,
      updateSetting, updateAccountStatus, createAccount,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
