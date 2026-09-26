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
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "UNPUBLISHED";
  isFeatured: boolean;
  publishedAt?: string;
  viewCount: number;
  authorOrgUnitName: string;
  editorAccountId: number;
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
  | "FEEDBACK_REPLIED" | "FEEDBACK_STATUS" | "POST_PUBLISHED" | "SYSTEM";

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
}

export interface Feedback {
  id: number;
  trackingCode: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderOrgText?: string;
  feedbackTopicId: number;
  title: string;
  content: string;
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
