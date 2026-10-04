/**
 * Kiểu dữ liệu mock — đặt tên khớp 43 bảng trong THIET-KE-SCHEMA (1).md.
 * Prototype: chỉ giữ các trường phục vụ giao diện, id khớp chéo giữa các file data.
 */

import type { Role } from "@/lib/auth-context";

/* ============ 3.1. Tổ chức & Tài khoản ============ */

export interface OrgUnit {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  shortName: string;
  orgLevel: 1 | 2 | 3 | 4; // 1=TW · 2=Tỉnh,Thành · 3=Phường,Xã · 4=Cơ sở
  adminUnitName: string;
  schoolTypeName?: string;
  address?: string;
  isActive: boolean;
}

export interface SchoolType {
  id: number;
  code: string;
  name: string;
}

export interface RoleDef {
  id: number;
  code: Role;
  name: string;
  description: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
}

/** role_permissions: ma trận phân quyền demo */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  QUAN_TRI_TW: ["*"],
  QUAN_TRI_TINH: [
    "activity.view", "activity.review", "task.assign", "task.review",
    "score.manage", "report.manage", "ranking.manage", "document.issue",
    "feedback.manage", "resource.manage", "system.orgtree.view", "system.account.manage",
  ],
  QUAN_TRI_CAP3: [
    "activity.view", "activity.review", "task.assign", "task.review",
    "score.view", "report.manage", "document.view", "feedback.view", "resource.view",
  ],
  DON_VI: [
    "activity.create", "activity.view", "task.update", "report.create",
    "document.view", "resource.view",
  ],
  BIEN_TAP_VIEN: [
    "activity.view", "post.manage", "post.publish", "document.view", "resource.manage",
  ],
  DOAN_VIEN: ["forum.interact"],
};

export interface Account {
  id: number;
  orgUnitId: number;
  username: string;
  email: string;
  phone?: string;
  contactPerson: string;
  contactPosition: string;
  role: Role;
  status: "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED";
  lastLoginAt?: string;
}

/* ============ 3.2. Hoạt động ============ */

export type ActivityStatus = "DRAFT" | "SUBMITTED" | "REVISED";
export type ActivityConfirmStatus =
  | "NOT_REQUIRED" | "PENDING" | "CONFIRMED" | "NEEDS_INFO" | "REJECTED";

export interface ActivityLink {
  id: number;
  activityId: number;
  platform: "FACEBOOK" | "WEBSITE" | "ZALO" | "TIKTOK" | "YOUTUBE" | "PRESS" | "OTHER";
  url: string;
  note?: string;
}

export interface Activity {
  id: number;
  orgUnitId: number;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  location?: string;
  participantCount?: number;
  activityType: "TASK_BASED" | "GENERAL";
  status: ActivityStatus;
  confirmStatus: ActivityConfirmStatus;
  categoryIds: number[];
  links: ActivityLink[];
  imageSeed: number;
  reviewNote?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ============ 3.3. Nhiệm vụ, Chỉ tiêu & Đánh giá ============ */

export interface CriteriaSet {
  id: number;
  code: string;
  name: string;
  year: number;
  ownerOrgUnitId: number;
  targetOrgLevel?: number;
  totalPoints: number;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
}

export interface TaskMetric {
  id: number;
  taskId: number;
  code: string;
  name: string;
  unitOfMeasure: string;
  aggregationType: "SUM" | "COUNT" | "AVG" | "MAX" | "PERCENT";
  /** Điểm tối đa của điều kiện chấm (BTS 2027 — trích cột Điểm trong Excel) */
  maxPoints?: number;
  /** Nguyên tắc chấm điểm — thang điểm chi tiết từng mức */
  scoringLadder?: string;
  /** Yêu cầu trong đánh giá kết quả thực hiện */
  requirement?: string;
  /** Yêu cầu minh chứng hình ảnh, đường link */
  evidence?: string;
  /** Thời gian thực hiện điều kiện chấm (Quý I–IV) */
  period?: string;
  /** Bộ phận phụ trách của TW */
  dept?: string;
}

export interface Task {
  id: number;
  criteriaSetId: number | null;
  parentTaskId: number | null;
  code: string;
  title: string;
  description?: string;
  taskKind: "TASK" | "CRITERION";
  maxPoints: number;
  requirement?: string;
  scoringMethod: "AUTO_AGGREGATE" | "MANUAL_CONFIRM" | "EXPERT_REVIEW" | "OTHER";
  dueDate?: string;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
}

export interface TaskAssignment {
  id: number;
  taskId: number;
  orgUnitId: number; // đơn vị nhận
  assignedByOrgUnitId: number; // đơn vị giao
  parentAssignmentId: number | null;
  dueDate: string;
  progressStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  confirmStatus: "PENDING" | "CONFIRMED" | "NEEDS_INFO" | "REJECTED";
  completionRate: number;
  note?: string;
  assignedAt: string;
  confirmedAt?: string;
}

export interface AssignmentTarget {
  id: number;
  taskAssignmentId: number;
  taskMetricId: number;
  targetValue: number;
  achievedValue: number;
}

export interface TaskResult {
  id: number;
  taskAssignmentId: number;
  assignmentTargetId: number | null;
  reportedValue: number;
  reportNote?: string;
  dataSource: "MANUAL" | "AUTO_AGGREGATE";
  reportedByAccountId: number;
  reportedAt: string;
}

export interface AssignmentReview {
  id: number;
  taskAssignmentId: number;
  reviewerAccountId: number;
  action: "CONFIRM" | "REQUEST_INFO" | "REJECT";
  note?: string;
  reviewedAt: string;
}

export interface Score {
  id: number;
  criteriaSetId: number;
  taskId: number;
  /** Chấm chi tiết theo điều kiện (TaskMetric) — null/undefined = chấm cả tiêu chí */
  metricId?: number | null;
  orgUnitId: number;
  points: number;
  maxPoints: number;
  scoringMethod: string;
  note?: string;
  scoredByAccountId: number | null; // null = hệ thống tự chấm
  scoredAt: string;
}

/* ============ 3.4. Xuất bản ============ */

export interface PublishedPost {
  id: number;
  activityId: number | null;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverSeed: number;
  /** Ảnh bìa thật do người dùng tải lên (data URL) — ưu tiên hơn coverSeed */
  coverDataUrl?: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "UNPUBLISHED";
  isFeatured: boolean;
  publishedAt?: string;
  viewCount: number;
  authorOrgUnitName: string;
  editorAccountId: number;
  /** Đóng góp từ cộng đồng (Đoàn viên) — id tài khoản người gửi bài */
  contributorAccountId?: number;
  categoryNames: string[];
  metaDescription?: string;
  createdAt: string;
}

/* ============ 3.5. Xếp hạng & Báo cáo ============ */

export interface RankingSnapshot {
  id: number;
  name: string;
  criteriaSetId: number | null;
  scopeOrgUnitId: number;
  rankedOrgLevel: number;
  rankingType: "BY_SCORE" | "BY_TASK_RESULT" | "BY_ACTIVITY_COUNT";
  periodType: "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  generatedAt: string;
  generatedByAccountId: number;
  status: "DRAFT" | "FINALIZED";
}

export interface RankingEntry {
  id: number;
  snapshotId: number;
  orgUnitId: number;
  rankPosition: number;
  totalScore: number;
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
  activityCount: number;
}

export interface Report {
  id: number;
  orgUnitId: number;
  title: string;
  reportType: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM";
  periodYear: number;
  periodNumber?: number;
  periodStart: string;
  periodEnd: string;
  content?: string;
  aiDraftContent?: string;
  aiModel?: string;
  aiGeneratedAt?: string;
  status: "DRAFT" | "FINALIZED";
  createdAt: string;
  exports: ReportExport[];
}

export interface ReportExport {
  id: number;
  reportId: number;
  exportFormat: "DOCX" | "PDF" | "XLSX";
  exportedAt: string;
}

/* ============ 3.6. Văn bản & Thông báo ============ */

export interface DocumentRecord {
  id: number;
  docNumber: string;
  title: string;
  summary: string;
  documentCategoryId: number;
  issuingOrgUnitId: number;
  issuedDate: string;
  effectiveDate?: string;
  recipientScope: "ALL_DESCENDANTS" | "DIRECT_CHILDREN" | "SELECTED";
  status: "DRAFT" | "ISSUED" | "REVOKED";
  createdAt: string;
}

export interface DocumentRecipient {
  documentId: number;
  orgUnitId: number;
  readAt: string | null;
}

export type NotificationType =
  | "TASK_ASSIGNED" | "TASK_DUE_SOON" | "TASK_OVERDUE"
  | "RESULT_CONFIRMED" | "RESULT_NEEDS_INFO" | "NEW_DOCUMENT"
  | "FEEDBACK_REPLIED" | "FEEDBACK_STATUS" | "POST_PUBLISHED" | "SYSTEM"
  | "FORUM_FLAGGED"
  | "CONTRIBUTION_APPROVED" | "CONTRIBUTION_REJECTED"
  | "PROJECT_APPROVED" | "HS3T_AWARDED";

export interface Notification {
  id: number;
  recipientAccountId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  refType?: string;
  refId?: number;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

/* ============ 3.7. Phản ánh ============ */

export interface FeedbackTopic {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface Feedback {
  id: number;
  trackingCode: string;
  senderName: string;
  senderEmail: string;
  /** Nếu người gửi đăng nhập — liên kết để hiển thị "Phản ánh của tôi" trong trang Tài khoản */
  senderAccountId?: number;
  senderPhone?: string;
  senderOrgText?: string;
  senderCommuneUnion?: string;
  senderProvinceUnion?: string;
  feedbackTopicId: number;
  title: string;
  content: string;
  evidenceNames?: string[];
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedAccountId?: number;
  submittedAt: string;
}

export interface FeedbackMessage {
  id: number;
  feedbackId: number;
  senderType: "CITIZEN" | "STAFF";
  senderName: string;
  content: string;
  isInternalNote: boolean;
  sentAt: string;
}

/** Email hệ thống đã gửi cho người gửi phản ánh (giả lập SMTP trong prototype) */
export interface EmailLog {
  id: number;
  feedbackId: number;
  to: string; // email người gửi
  subject: string;
  body: string;
  kind: "REPLY" | "RESULT"; // phản hồi trung gian / kết quả xử lý
  sentByAccountId: number;
  /** Trạng thái gửi SMTP thật — undefined = email mô phỏng/seed, chưa đi qua SMTP */
  delivery?: "PENDING" | "SENT" | "FAILED";
  sentAt: string;
}

/* ============ Điểm danh hoạt động ============ */

export interface Attendance {
  id: number;
  activityId: number;
  memberName: string;
  memberClass?: string;
  orgUnitId: number;
  checkedInAt: string;
}

/* ============ Sự kiện trực tiếp (mô phỏng realtime) ============ */

export type LiveEventType =
  | "ACTIVITY_SUBMITTED" | "ACTIVITY_CONFIRMED" | "TASK_RESULT"
  | "TASK_ASSIGNED" | "ATTENDANCE" | "REPORT_CREATED" | "FEEDBACK_NEW";

export interface LiveEvent {
  id: number;
  orgUnitId: number;
  eventType: LiveEventType;
  title: string;
  createdAt: string;
}

/* ============ 3.8. Tài nguyên & Hệ thống ============ */

export interface ResourceType {
  id: number;
  code: string;
  name: string;
}

export interface Resource {
  id: number;
  resourceTypeId: number;
  title: string;
  description: string;
  fileName: string;
  fileSizeKb: number;
  isPublic: boolean;
  downloadCount: number;
  publishedByOrgUnitId: number;
  publishedAt: string;
  /** Tài nguyên do Đoàn viên đóng góp — id tài khoản chờ Ban TNTH duyệt */
  submittedByAccountId?: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface SystemSetting {
  settingKey: string;
  value: string;
  valueType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  groupName: string;
  description: string;
}

export interface ContentCategory {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  description?: string;
}

export interface DocumentCategory {
  id: number;
  code: string;
  name: string;
}

/* ============ 3.9. Diễn đàn ẩn danh ============ */

/** Kết quả kiểm duyệt AI (API /api/ai/kiem-duyet hoặc fallback quy tắc cục bộ) */
export interface ModerationResult {
  verdict: "CLEAN" | "FLAGGED";
  reason?: string;
  model?: string;
}

/** Ảnh/video đính kèm diễn đàn — base64 dataUrl (ảnh ≤2MB × 4, video ≤15MB × 1) */
export interface ForumMedia {
  kind: "image" | "video";
  dataUrl: string;
  name?: string;
}

export interface ForumThread {
  id: number;
  alias: string; // "Bằng Lăng Tim Xanh #2481" — sinh cứng lúc tạo, KHÔNG random lúc render
  authorAccountId: number; // RIÊNG TƯ — không bao giờ hiển thị công khai
  title: string;
  content: string;
  topic?: string;
  media?: ForumMedia[];
  status: "PUBLISHED" | "HIDDEN"; // chờ duyệt = FLAGGED && !moderatedByAccountId
  likedByAccountIds: number[];
  aiVerdict: "CLEAN" | "FLAGGED";
  aiReason?: string;
  aiModel?: string;
  moderatedByAccountId?: number;
  moderatedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ForumComment {
  id: number;
  threadId: number;
  alias: string;
  authorAccountId: number;
  content: string;
  media?: ForumMedia[];
  status: "PUBLISHED" | "PENDING_REVIEW" | "REJECTED";
  likedByAccountIds: number[];
  aiVerdict: "CLEAN" | "FLAGGED";
  aiReason?: string;
  aiModel?: string;
  moderatedByAccountId?: number;
  moderatedAt?: string;
  createdAt: string;
}

/* ============ v12 — Đóng góp cộng đồng & chương trình ============ */

/** Loại đóng góp — quy đổi điểm thưởng cho Đoàn viên */
export type ContributionKind = "POST" | "RESOURCE" | "PROJECT" | "HS3T";

export const CONTRIBUTION_POINTS: Record<ContributionKind, number> = {
  POST: 15,
  RESOURCE: 10,
  PROJECT: 20,
  HS3T: 30,
};

/** Nhật ký cộng điểm đóng góp của Đoàn viên */
export interface ContributionLog {
  id: number;
  accountId: number;
  kind: ContributionKind;
  refId: number;
  refTitle: string;
  points: number;
  createdAt: string;
}

/** Bài viết chuyên mục do Đoàn viên đóng góp — qua AI kiểm duyệt rồi Ban TNTH duyệt đăng */
export interface MemberContribution {
  id: number;
  contributorAccountId: number;
  categoryTag: string;
  title: string;
  excerpt: string;
  content: string;
  coverDataUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  aiVerdict: "CLEAN" | "FLAGGED";
  aiReason?: string;
  aiModel?: string;
  moderatedByAccountId?: number;
  moderatedAt?: string;
  rejectionReason?: string;
  /** Slug bài PublishedPost sau khi được duyệt đăng */
  postSlug?: string;
  createdAt: string;
}

/** Nhà tài trợ đồng hành — hiển thị strip công khai + quản trị /quan-tri/tai-tro */
export interface Sponsor {
  id: number;
  name: string;
  tier: "GOLD" | "SILVER" | "BRONZE";
  websiteUrl?: string;
  note?: string;
  sinceYear?: number;
  isActive: boolean;
}

/** Danh bạ Đoàn trường — thông tin liên hệ + điểm mạnh từng đơn vị (upsert theo orgUnitId) */
export interface OrgDirectory {
  id: number;
  orgUnitId: number; // unique
  secretaryName: string;
  secretaryPhone: string;
  email: string;
  achievements: string;
  strengths: string;
  academicResources: string;
  clubs: string;
  updatedAt: string;
  updatedByAccountId: number;
}

/** Dự án tình nguyện "Mỗi trường THPT — 01 dự án" — hiển thị pin bản đồ 34 tỉnh */
export interface VolunteerProject {
  id: number;
  orgUnitId: number;
  schoolName: string;
  province: string;
  projectName: string;
  summary: string;
  beneficiaries: string;
  participants: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedByAccountId?: number;
  /** Vị trí pin trên ảnh bản đồ — % từ mép trái/trên */
  mapX: number;
  mapY: number;
  aiVerdict?: "CLEAN" | "FLAGGED";
  aiReason?: string;
  moderatedByAccountId?: number;
  moderatedAt?: string;
  rejectionReason?: string;
  /** File báo cáo phương pháp thực hiện đính kèm (≤5MB) */
  reportFile?: { name: string; dataUrl?: string };
  createdAt: string;
}

/* ============ v12 — Thi trực tuyến ============ */

export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

/** 7 dạng câu hỏi — MCQ 1/n đáp án, đúng-sai, điền khuyết, 2 loại tự luận, tải file */
export type QuizQuestionType =
  | "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "FILL"
  | "SHORT_ANSWER" | "LONG_ANSWER" | "FILE_UPLOAD";

export interface QuizQuestion {
  id: number;
  topic: string;
  difficulty: QuizDifficulty;
  type: QuizQuestionType;
  stem: string;
  options?: string[];
  /** Đáp án đúng (MCQ/Đúng-sai) — index vào options */
  correctIndexes?: number[];
  /** Đáp án đúng dạng chữ (FILL) */
  correctText?: string;
  points: number;
}

export interface QuizExam {
  id: number;
  code: string; // KT-2026-XXX
  title: string;
  description?: string;
  durationMinutes: number;
  questionIds: number[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** Adaptive: đúng → câu khó hơn, sai → câu dễ hơn */
  adaptive: boolean;
  /** Chuyên mục đề thi — rỗng/không có = tất cả chuyên mục trong ngân hàng */
  topics?: string[];
  status: "DRAFT" | "OPEN" | "CLOSED";
  createdByAccountId: number;
  createdAt: string;
}

export interface QuizAnswer {
  selected?: number[];
  text?: string;
  fileName?: string;
}

/** Lộ trình adaptive: từng bước thí sinh gặp câu nào, trả đúng/sai */
export interface AdaptiveStep {
  questionId: number;
  difficulty: QuizDifficulty;
  correct: boolean;
}

export interface QuizAttempt {
  id: number;
  examId: number;
  /** null/undefined = khách vãng lai không đăng nhập */
  accountId?: number;
  examineeName: string;
  examineeOrgText: string;
  answers: Record<number, QuizAnswer>;
  trail?: AdaptiveStep[];
  autoScore: number;
  maxScore: number;
  /** Điểm do giám khảo chấm phần tự luận */
  manualPoints?: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  gradedByAccountId?: number;
  startedAt: string;
  submittedAt?: string;
}

/* ============ v12 — Học sinh 3 tốt ============ */

export interface Hs3tProfile {
  id: number;
  code: string; // HS3T-2026-XXXX
  accountId: number;
  studentName: string;
  schoolOrgUnitId: number;
  className?: string;
  /** Cấp danh hiệu đã chốt: XA (xã/phường) | TINH (tỉnh) | TW (trung ương) */
  awardedLevel?: "XA" | "TINH" | "TW";
  awardedAt?: string;
  awardedByAccountId?: number;
  createdAt: string;
}

/**
 * Nhóm tiêu chuẩn HS3T theo Quy chế QĐ 317-QĐ/TWĐTN-TNTH (điều chỉnh TB 630 10/2025):
 * PHONG_TRAO = Đạo đức tốt · HOC_TAP = Học tập tốt · REN_LUYEN = Thể lực tốt · KHAC = Thành tích khác (bổ sung hồ sơ).
 */
export type Hs3tCategory = "HOC_TAP" | "REN_LUYEN" | "PHONG_TRAO" | "KHAC";

/**
 * Điều 5 Quy chế — đơn vị xây dựng tiêu chuẩn riêng phù hợp thực tiễn,
 * KHÔNG được cao hơn chuẩn Trung ương.
 */
export interface Hs3tUnitStandard {
  id: number;
  orgUnitId: number;
  /** true = áp dụng nguyên chuẩn TW; false = đã điều chỉnh theo thực tiễn */
  applyTw: boolean;
  daoDuc?: string;
  hocTap?: string;
  theLuc?: string;
  thanhTichKhac?: string;
  note?: string;
  confirmedByAccountId?: number;
  updatedAt?: string;
}

/** Thành tích hồ sơ 3 tốt — append-only, không xóa */
export interface Hs3tAchievement {
  id: number;
  profileId: number;
  title: string;
  category: Hs3tCategory;
  /** Tiêu chí phụ (1 trong 4 mục của nhóm) */
  sub?: string;
  evidenceNames?: string[];
  achievedAt: string;
  addedByRole: "STUDENT" | "SCHOOL";
  addedByAccountId: number;
  createdAt: string;
}
