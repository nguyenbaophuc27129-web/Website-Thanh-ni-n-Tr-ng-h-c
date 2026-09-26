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
  Activity, Account, AssignmentReview, AssignmentTarget, CriteriaSet,
  DocumentRecord, DocumentRecipient, Feedback, FeedbackMessage, Notification,
  PublishedPost, RankingEntry, RankingSnapshot, Report, Resource, Score,
  SystemSetting, Task, TaskAssignment, TaskMetric, TaskResult,
} from "@/types";
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
import { resources as seedResources, systemSettings as seedSettings } from "@/data/resources";
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
  points: number; note?: string; method?: string;
}

let uid = 900000;
const nextId = () => ++uid;

const nowISO = () => new Date().toISOString();

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
  createPostFromActivity: (session: Session, activityId: number, title: string, excerpt: string) => number;

  /* tasks (R3) */
  distributeAssignment: (session: Session, taskId: number, parentAssignmentId: number | null, orgUnitId: number, dueDate: string, targets: { taskMetricId: number; targetValue: number }[], note?: string) => void;
  updateResult: (session: Session, assignmentId: number, values: { assignmentTargetId: number; reportedValue: number }[], note?: string) => void;
  reviewAssignment: (session: Session, assignmentId: number, action: AssignmentReview["action"], note?: string) => void;
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
  submitFeedback: (input: { senderName: string; senderEmail: string; senderPhone?: string; senderOrgText?: string; feedbackTopicId: number; title: string; content: string }) => string;
  replyFeedback: (session: Session, feedbackId: number, content: string, internal: boolean) => void;
  setFeedbackStatus: (session: Session, feedbackId: number, status: Feedback["status"]) => void;

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
  const [tasks] = useState(seedTasks);
  const [taskMetrics] = useState(seedTaskMetrics);
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
  const [resources, setResources] = useState(seedResources);
  const [settings, setSettings] = useState(seedSettings);

  // Khôi phục tài khoản đã tạo từ localStorage (để khớp với đăng nhập)
  useEffect(() => {
    const created = loadCreatedAccounts();
    if (created.length > 0) {
      setAccounts((prev) => {
        const known = new Set(prev.map((a) => a.username.toLowerCase()));
        const restored = created
          .filter((c) => !known.has(c.username.toLowerCase()))
          .map(({ password: _pw, displayName: _dn, orgUnitName: _on, ...acc }) => acc as Account);
        return [...prev, ...restored];
      });
    }
  }, []);

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
    (session: Session, activityId: number, title: string, excerpt: string) => {
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

  const saveScore = useCallback(
    (session: Session, input: ScoreInput) => {
      const task = tasks.find((t) => t.id === input.taskId);
      const maxPoints = task?.maxPoints ?? 0;
      setScores((prev) => {
        const exists = prev.find((s) => s.criteriaSetId === input.criteriaSetId && s.taskId === input.taskId && s.orgUnitId === input.orgUnitId);
        const record: Score = {
          id: exists?.id ?? nextId(),
          criteriaSetId: input.criteriaSetId, taskId: input.taskId, orgUnitId: input.orgUnitId,
          points: Math.min(input.points, maxPoints), maxPoints,
          scoringMethod: input.method ?? task?.scoringMethod ?? "MANUAL_CONFIRM",
          note: input.note, scoredByAccountId: session.accountId, scoredAt: nowISO(),
        };
        return exists ? prev.map((s) => (s.id === exists.id ? record : s)) : [...prev, record];
      });
    },
    [tasks]
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

  /* ============ Feedbacks (R8) ============ */

  const submitFeedback = useCallback(
    (input: { senderName: string; senderEmail: string; senderPhone?: string; senderOrgText?: string; feedbackTopicId: number; title: string; content: string }) => {
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
      }
    },
    [addNotification, feedbacks]
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
    },
    [addNotification, feedbacks]
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
      const id = nextId();
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

  const value: StoreValue = useMemo(
    () => ({
      orgUnits, accounts, contentCategories, documentCategories, resourceTypes, feedbackTopics,
      activities, publishedPosts, criteriaSets, tasks, taskMetrics, taskAssignments,
      assignmentTargets, taskResults, assignmentReviews, scores, rankingSnapshots, rankingEntries,
      reports, documents, documentRecipients, notifications, feedbacks, feedbackMessages,
      resources, settings,
      orgName, orgById, accountByOrgUnit, scopeIds, taskMetricsOf, targetsOf, resultsOf,
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, saveScore,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus,
      saveResource, downloadResource,
      updateSetting, updateAccountStatus, createAccount,
    }),
    [
      orgUnits, accounts, activities, publishedPosts, criteriaSets, tasks, taskMetrics,
      taskAssignments, assignmentTargets, taskResults, assignmentReviews, scores,
      rankingSnapshots, rankingEntries, reports, documents, documentRecipients,
      notifications, feedbacks, feedbackMessages, resources, settings,
      orgName, orgById, accountByOrgUnit, scopeIds, taskMetricsOf, targetsOf, resultsOf,
      reviewsOf, descendantsOf, activeCriteriaSet, docRecipientsOf,
      createActivity, updateActivity, deleteActivity, submitActivity, reviewActivity,
      savePost, setPostStatus, createPostFromActivity,
      distributeAssignment, updateResult, reviewAssignment, saveScore,
      createReport, updateReport, finalizeReport, exportReport,
      createRankingSnapshot, finalizeRanking,
      issueDocument, revokeDocument, markDocumentRead,
      addNotification, markNotificationRead, markAllNotificationsRead,
      submitFeedback, replyFeedback, setFeedbackStatus,
      saveResource, downloadResource,
      updateSetting, updateAccountStatus, createAccount,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
