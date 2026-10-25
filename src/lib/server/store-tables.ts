import { query } from "../db.ts";

/**
 * Lớp truy cập dữ liệu store ↔ PostgreSQL (bước chuyển localStorage → DB).
 *
 * Mỗi entity của client store khai báo 1 spec: bảng đích + danh sách cột
 * (tên field client ↔ cột DB + kiểu). Từ spec sinh tự động:
 *   - toRow(obj, ctx): object client → dòng INSERT (điền cột phái sinh qua ctx)
 *   - toObj(row): dòng DB → object client (ép bigint→number, Date→ISO…)
 *
 * Ghi chú đã nắm (đúng theo introspect DB thật):
 * - Mọi bảng có cột id dùng IDENTITY GENERATED ALWAYS → INSERT id tường minh
 *   phải kèm OVERRIDING SYSTEM VALUE, sau insert cần setval về max(id).
 * - pg trả bigint/numeric dạng string → toObj ép số theo type khai báo.
 * - Một ít cột NOT NULL không có trong object client (created_by_account_id,
 *   access_token…) → hàm derive điền giá trị hợp lệ.
 * - Report.exports (report_exports) cần files.id NOT NULL → KHÔNG đồng bộ,
 *   giữ phía client (chỉ là nhật ký bấm xuất file).
 */

export type FieldType =
  | "int" | "num" | "str" | "bool" | "date" | "ts"
  | "json" | "strarr" | "intarr" | "bigintarr";

export interface FieldSpec {
  col: string;
  type: FieldType;
  /** Lấy giá trị từ object client (mặc định obj[field]) — dùng cho field gộp */
  get?: (obj: Record<string, unknown>) => unknown;
}

export interface EntitySpec {
  table: string;
  fields: Record<string, FieldSpec>;
  /** Bảng không có cột id identity (join / natural key) */
  noIdentity?: boolean;
  /** Cột phái sinh NOT NULL không có phía client */
  derive?: (obj: Record<string, unknown>, ctx: DeriveCtx) => Record<string, unknown>;
  /** PK để ORDER BY khi đọc (mặc định id) */
  orderBy?: string;
}

/** Ngữ cảnh điền cột phái sinh — dựng 1 lần cho mỗi request sync */
export interface DeriveCtx {
  accountIdByOrg: Map<number, number>;
}

const f = (col: string, type: FieldType, get?: FieldSpec["get"]): FieldSpec => ({ col, type, get });

export const ENTITY_SPECS: Record<string, EntitySpec> = {
  criteriaSets: {
    table: "criteria_sets",
    fields: {
      id: f("id", "int"), code: f("code", "str"), name: f("name", "str"),
      year: f("year", "int"), ownerOrgUnitId: f("owner_org_unit_id", "int"),
      targetOrgLevel: f("target_org_level", "int"), totalPoints: f("total_points", "num"),
      status: f("status", "str"),
    },
  },
  tasks: {
    table: "tasks",
    fields: {
      id: f("id", "int"), criteriaSetId: f("criteria_set_id", "int"),
      parentTaskId: f("parent_task_id", "int"), code: f("code", "str"),
      title: f("title", "str"), description: f("description", "str"),
      taskKind: f("task_kind", "str"), maxPoints: f("max_points", "num"),
      requirement: f("requirement", "str"), scoringMethod: f("scoring_method", "str"),
      dueDate: f("due_date", "date"), displayOrder: f("display_order", "int"),
      status: f("status", "str"),
    },
    derive: () => ({
      // tasks.created_by_org_unit_id NOT NULL — prototype không lưu, mặc định TW (đơn vị 1)
      created_by_org_unit_id: 1,
    }),
  },
  taskMetrics: {
    table: "task_metrics",
    fields: {
      id: f("id", "int"), taskId: f("task_id", "int"), code: f("code", "str"),
      name: f("name", "str"), unitOfMeasure: f("unit_of_measure", "str"),
      aggregationType: f("aggregation_type", "str"), maxPoints: f("max_points", "num"),
      scoringLadder: f("scoring_ladder", "str"), requirement: f("requirement", "str"),
      evidence: f("evidence", "str"), period: f("period", "str"), dept: f("dept", "str"),
    },
  },
  taskAssignments: {
    table: "task_assignments",
    fields: {
      id: f("id", "int"), taskId: f("task_id", "int"), orgUnitId: f("org_unit_id", "int"),
      assignedByOrgUnitId: f("assigned_by_org_unit_id", "int"),
      parentAssignmentId: f("parent_assignment_id", "int"), dueDate: f("due_date", "date"),
      progressStatus: f("progress_status", "str"), confirmStatus: f("confirm_status", "str"),
      completionRate: f("completion_rate", "num"), note: f("note", "str"),
      assignedAt: f("assigned_at", "ts"), confirmedAt: f("confirmed_at", "ts"),
    },
  },
  assignmentTargets: {
    table: "assignment_targets",
    fields: {
      id: f("id", "int"), taskAssignmentId: f("task_assignment_id", "int"),
      taskMetricId: f("task_metric_id", "int"), targetValue: f("target_value", "num"),
      achievedValue: f("achieved_value", "num"),
    },
  },
  taskResults: {
    table: "task_results",
    fields: {
      id: f("id", "int"), taskAssignmentId: f("task_assignment_id", "int"),
      assignmentTargetId: f("assignment_target_id", "int"),
      reportedValue: f("reported_value", "num"), reportNote: f("report_note", "str"),
      dataSource: f("data_source", "str"),
      reportedByAccountId: f("reported_by_account_id", "int"),
      reportedAt: f("reported_at", "ts"),
    },
  },
  assignmentReviews: {
    table: "assignment_reviews",
    fields: {
      id: f("id", "int"), taskAssignmentId: f("task_assignment_id", "int"),
      reviewerAccountId: f("reviewer_account_id", "int"), action: f("action", "str"),
      note: f("note", "str"), reviewedAt: f("reviewed_at", "ts"),
    },
  },
  scores: {
    table: "scores",
    fields: {
      id: f("id", "int"), criteriaSetId: f("criteria_set_id", "int"),
      taskId: f("task_id", "int"), metricId: f("metric_id", "int"),
      orgUnitId: f("org_unit_id", "int"), points: f("points", "num"),
      maxPoints: f("max_points", "num"), scoringMethod: f("scoring_method", "str"),
      note: f("note", "str"), scoredByAccountId: f("scored_by_account_id", "int"),
      scoredAt: f("scored_at", "ts"),
    },
  },
  rankingSnapshots: {
    table: "ranking_snapshots",
    fields: {
      id: f("id", "int"), name: f("name", "str"), criteriaSetId: f("criteria_set_id", "int"),
      scopeOrgUnitId: f("scope_org_unit_id", "int"), rankedOrgLevel: f("ranked_org_level", "int"),
      rankingType: f("ranking_type", "str"), periodType: f("period_type", "str"),
      periodStart: f("period_start", "date"), periodEnd: f("period_end", "date"),
      totalUnits: f("total_units", "int"), generatedAt: f("created_at", "ts"),
      generatedByAccountId: f("generated_by_account_id", "int"), status: f("status", "str"),
    },
    derive: () => ({ updated_at: new Date().toISOString() }),
  },
  rankingEntries: {
    table: "ranking_entries",
    fields: {
      id: f("id", "int"), snapshotId: f("snapshot_id", "int"), orgUnitId: f("org_unit_id", "int"),
      rankPosition: f("rank_position", "int"), totalScore: f("total_score", "num"),
      completionRate: f("completion_rate", "num"), completedTasks: f("completed_tasks", "int"),
      totalTasks: f("total_tasks", "int"), activityCount: f("activity_count", "int"),
    },
  },
  activities: {
    table: "activities",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"), title: f("title", "str"),
      summary: f("summary", "str"), startDate: f("start_date", "date"),
      endDate: f("end_date", "date"), location: f("location", "str"),
      participantCount: f("participant_count", "int"),
      activityType: f("activity_type", "str"), status: f("status", "str"),
      confirmStatus: f("confirm_status", "str"), imageSeed: f("image_seed", "int"),
      reviewNote: f("review_note", "str"), createdAt: f("created_at", "ts"),
      updatedAt: f("updated_at", "ts"),
    },
    derive: (o, ctx) => ({
      created_by_account_id: ctx.accountIdByOrg.get(Number(o.orgUnitId)) ?? 1,
    }),
  },
  // Join activity ↔ chuyên mục (client Activity.categoryIds)
  activityCategories: {
    table: "activity_categories",
    noIdentity: true,
    orderBy: "activity_id, content_category_id",
    fields: { activityId: f("activity_id", "int"), categoryId: f("content_category_id", "int") },
  },
  activityLinks: {
    table: "activity_links",
    fields: {
      id: f("id", "int"), activityId: f("activity_id", "int"),
      platform: f("platform", "str"), url: f("url", "str"), note: f("note", "str"),
    },
  },
  publishedPosts: {
    table: "published_posts",
    fields: {
      id: f("id", "int"), activityId: f("activity_id", "int"), slug: f("slug", "str"),
      title: f("title", "str"), excerpt: f("excerpt", "str"), content: f("content", "str"),
      coverSeed: f("cover_seed", "int"), coverDataUrl: f("cover_data_url", "str"),
      status: f("status", "str"), isFeatured: f("is_featured", "bool"),
      // published_at bắt buộc khi status PUBLISHED (CHECK của DB) — neo vào now() nếu thiếu
      publishedAt: f("published_at", "ts", (o) =>
        o.publishedAt ?? (String(o.status ?? "DRAFT") === "PUBLISHED" ? new Date().toISOString() : null)),
      viewCount: f("view_count", "int"),
      authorOrgUnitName: f("author_org_unit_name", "str"),
      // editor_account_id NOT NULL — bài hệ thống gán cho quản trị TW (id 1)
      editorAccountId: f("editor_account_id", "int", (o) => Number(o.editorAccountId) || 1),
      contributorAccountId: f("contributor_account_id", "int"),
      categoryNames: f("category_names", "strarr"),
      metaDescription: f("meta_description", "str"), subtitle: f("subtitle", "str"), seoTitle: f("seo_title", "str"), seoKeywords: f("seo_keywords", "str"), imageCaption: f("image_caption", "str"), coverUrl: f("cover_url", "str"), postAttributes: f("post_attributes", "strarr"), relatedPosts: f("related_posts", "strarr"), relatedTopics: f("related_topics", "strarr"), internalNotes: f("internal_notes", "str"), createdAt: f("created_at", "ts"),
    },
  },
  reports: {
    table: "reports",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"), title: f("title", "str"),
      reportType: f("report_type", "str"), periodYear: f("period_year", "int"),
      periodNumber: f("period_number", "int"), periodStart: f("period_start", "date"),
      periodEnd: f("period_end", "date"), content: f("content", "str"),
      aiDraftContent: f("ai_draft_content", "str"), aiModel: f("ai_model", "str"),
      aiGeneratedAt: f("ai_generated_at", "ts"), status: f("status", "str"),
      createdAt: f("created_at", "ts"),
    },
    derive: () => ({ created_by_account_id: 1, finalized_at: null }),
  },
  documents: {
    table: "documents",
    fields: {
      id: f("id", "int"), docNumber: f("doc_number", "str"), title: f("title", "str"),
      summary: f("summary", "str"), documentCategoryId: f("document_category_id", "int"),
      issuingOrgUnitId: f("issuing_org_unit_id", "int"), issuedDate: f("issued_date", "date"),
      effectiveDate: f("effective_date", "date"), recipientScope: f("recipient_scope", "str"),
      status: f("status", "str"), createdAt: f("created_at", "ts"),
      fileName: f("file_name", "str"), fileDataUrl: f("file_data_url", "str"),
    },
    derive: () => ({ created_by_account_id: 1 }),
  },
  documentRecipients: {
    table: "document_recipients",
    noIdentity: true,
    orderBy: "document_id, org_unit_id",
    fields: {
      documentId: f("document_id", "int"), orgUnitId: f("org_unit_id", "int"),
      readAt: f("read_at", "ts"),
    },
  },
  notifications: {
    table: "notifications",
    fields: {
      id: f("id", "int"), recipientAccountId: f("recipient_account_id", "int"),
      notificationType: f("notification_type", "str"), title: f("title", "str"),
      message: f("message", "str"), refType: f("ref_type", "str"),
      refId: f("ref_id", "int"), linkUrl: f("link_url", "str"),
      isRead: f("is_read", "bool"), createdAt: f("created_at", "ts"),
    },
  },
  feedbacks: {
    table: "feedbacks",
    fields: {
      id: f("id", "int"), trackingCode: f("tracking_code", "str"),
      senderName: f("sender_name", "str"), senderEmail: f("sender_email", "str"),
      senderPhone: f("sender_phone", "str"), senderOrgText: f("sender_org_text", "str"),
      senderAccountId: f("sender_account_id", "int"),
      senderCommuneUnion: f("sender_commune_union", "str"),
      senderProvinceUnion: f("sender_province_union", "str"),
      feedbackTopicId: f("feedback_topic_id", "int"), title: f("title", "str"),
      content: f("content", "str"), evidenceNames: f("evidence_names", "strarr"),
      status: f("status", "str"), assignedAccountId: f("assigned_account_id", "int"),
      submittedAt: f("submitted_at", "ts"),
    },
    derive: (o) => ({
      // access_token NOT NULL — prototype truy cập qua tracking_code nên token là cột phụ
      access_token: `seed-${Number(o.id)}-${o.trackingCode ?? ""}`,
      is_spam: false,
    }),
  },
  feedbackMessages: {
    table: "feedback_messages",
    fields: {
      id: f("id", "int"), feedbackId: f("feedback_id", "int"),
      senderType: f("sender_type", "str"), senderName: f("sender_name", "str"),
      // CHECK DB: STAFF bắt buộc có account, CITIZEN bắt buộc NULL
      senderAccountId: f("sender_account_id", "int", (o) =>
        o.senderType === "STAFF" ? Number(o.senderAccountId) || 1 : null),
      content: f("content", "str"),
      isInternalNote: f("is_internal_note", "bool"), sentAt: f("sent_at", "ts"),
    },
  },
  emailLogs: {
    table: "email_logs",
    fields: {
      id: f("id", "int"), feedbackId: f("feedback_id", "int"), to: f("to_email", "str"),
      subject: f("subject", "str"), body: f("body", "str"), kind: f("email_kind", "str"),
      sentByAccountId: f("sent_by_account_id", "int"), delivery: f("delivery", "str"),
      sentAt: f("sent_at", "ts"),
    },
  },
  attendances: {
    table: "attendances",
    fields: {
      id: f("id", "int"), activityId: f("activity_id", "int"),
      orgUnitId: f("org_unit_id", "int"), memberName: f("member_name", "str"),
      memberClass: f("member_class", "str"), checkedInAt: f("checked_in_at", "ts"),
    },
  },
  liveEvents: {
    table: "live_events",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"),
      eventType: f("event_type", "str"), title: f("title", "str"), createdAt: f("created_at", "ts"),
    },
  },
  resources: {
    table: "resources",
    fields: {
      id: f("id", "int"), resourceTypeId: f("resource_type_id", "int"),
      title: f("title", "str"), description: f("description", "str"),
      fileName: f("file_name", "str"), fileSizeKb: f("file_size_kb", "int"),
      isPublic: f("is_public", "bool"), downloadCount: f("download_count", "int"),
      publishedByOrgUnitId: f("published_by_org_unit_id", "int"),
      publishedAt: f("published_at", "ts"),
      submittedByAccountId: f("submitted_by_account_id", "int"),
      videoUrl: f("video_url", "str"), fileDataUrl: f("file_data_url", "str"),
      status: f("status", "str"),
    },
    derive: () => ({ file_id: null }),
  },
  settings: {
    table: "system_settings",
    noIdentity: true,
    orderBy: "setting_key",
    fields: {
      settingKey: f("setting_key", "str"), value: f("value", "str"),
      valueType: f("value_type", "str"), groupName: f("group_name", "str"),
      description: f("description", "str"),
    },
  },
  forumThreads: {
    table: "forum_threads",
    fields: {
      id: f("id", "int"), alias: f("alias", "str"), title: f("title", "str"),
      authorAccountId: f("author_account_id", "int"), content: f("content", "str"),
      topic: f("topic", "str"), media: f("media", "json"), status: f("status", "str"),
      likedByAccountIds: f("liked_account_ids", "bigintarr"),
      aiVerdict: f("ai_verdict", "str"), aiReason: f("ai_reason", "str"),
      aiModel: f("ai_model", "str"), moderatedByAccountId: f("moderated_by_account_id", "int"),
      moderatedAt: f("moderated_at", "ts"), rejectionReason: f("rejection_reason", "str"),
      createdAt: f("created_at", "ts"),
    },
  },
  forumComments: {
    table: "forum_comments",
    fields: {
      id: f("id", "int"), threadId: f("thread_id", "int"), alias: f("alias", "str"),
      authorAccountId: f("author_account_id", "int"), content: f("content", "str"),
      media: f("media", "json"), status: f("status", "str"),
      likedByAccountIds: f("liked_account_ids", "bigintarr"),
      aiVerdict: f("ai_verdict", "str"), aiReason: f("ai_reason", "str"),
      aiModel: f("ai_model", "str"), moderatedByAccountId: f("moderated_by_account_id", "int"),
      moderatedAt: f("moderated_at", "ts"), createdAt: f("created_at", "ts"),
    },
  },
  hs3tProfiles: {
    table: "hs3t_profiles",
    fields: {
      id: f("id", "int"), code: f("code", "str"), accountId: f("account_id", "int"),
      studentName: f("student_name", "str"), schoolOrgUnitId: f("school_org_unit_id", "int"),
      className: f("class_name", "str"), awardedLevel: f("awarded_level", "str"),
      awardedAt: f("awarded_at", "ts"), awardedByAccountId: f("awarded_by_account_id", "int"),
      createdAt: f("created_at", "ts"),
    },
  },
  hs3tAchievements: {
    table: "hs3t_achievements",
    fields: {
      id: f("id", "int"), profileId: f("profile_id", "int"), title: f("title", "str"),
      category: f("category", "str"), sub: f("sub", "str"),
      evidenceNames: f("evidence_names", "strarr"), achievedAt: f("achieved_at", "date"),
      addedByRole: f("added_by_role", "str"), addedByAccountId: f("added_by_account_id", "int"),
      createdAt: f("created_at", "ts"),
    },
  },
  hs3tUnitStandards: {
    table: "hs3t_unit_standards",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"), applyTw: f("apply_tw", "bool"),
      daoDuc: f("dao_duc", "str"), hocTap: f("hoc_tap", "str"), theLuc: f("the_luc", "str"),
      thanhTichKhac: f("thanh_tich_khac", "str"), note: f("note", "str"),
      confirmedByAccountId: f("confirmed_by_account_id", "int"), updatedAt: f("updated_at", "ts"),
    },
  },
  quizQuestions: {
    table: "quiz_questions",
    fields: {
      id: f("id", "int"), topic: f("topic", "str"), difficulty: f("difficulty", "str"),
      type: f("question_type", "str"), stem: f("stem", "str"), options: f("options", "json"),
      correctIndexes: f("correct_indexes", "intarr"), correctText: f("correct_text", "str"),
      points: f("points", "num"),
    },
  },
  quizExams: {
    table: "quiz_exams",
    fields: {
      id: f("id", "int"), code: f("code", "str"), title: f("title", "str"),
      description: f("description", "str"), durationMinutes: f("duration_minutes", "int"),
      questionIds: f("question_ids", "bigintarr"),
      shuffleQuestions: f("shuffle_questions", "bool"),
      shuffleOptions: f("shuffle_options", "bool"), adaptive: f("adaptive", "bool"),
      topics: f("topics", "strarr"), status: f("status", "str"),
      createdByAccountId: f("created_by_account_id", "int"), createdAt: f("created_at", "ts"),
    },
  },
  quizAttempts: {
    table: "quiz_attempts",
    fields: {
      id: f("id", "int"), examId: f("exam_id", "int"), accountId: f("account_id", "int"),
      examineeName: f("examinee_name", "str"), examineeOrgText: f("examinee_org_text", "str"),
      answers: f("answers", "json"), trail: f("trail", "json"),
      autoScore: f("auto_score", "num"), maxScore: f("max_score", "num"),
      manualPoints: f("manual_points", "num"), status: f("status", "str"),
      gradedByAccountId: f("graded_by_account_id", "int"), startedAt: f("started_at", "ts"),
      submittedAt: f("submitted_at", "ts"),
    },
  },
  volunteerProjects: {
    table: "volunteer_projects",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"),
      schoolName: f("school_name", "str"), province: f("province", "str"),
      projectName: f("project_name", "str"), summary: f("summary", "str"),
      beneficiaries: f("beneficiaries", "str"), participants: f("participants", "int"),
      status: f("status", "str"), submittedByAccountId: f("submitted_by_account_id", "int"),
      field: f("field", "str"), phase: f("phase", "str"),
      aiVerdict: f("ai_verdict", "str"), aiReason: f("ai_reason", "str"),
      moderatedByAccountId: f("moderated_by_account_id", "int"),
      moderatedAt: f("moderated_at", "ts"), rejectionReason: f("rejection_reason", "str"),
      reportFileName: f("report_file_name", "str", (o) => {
        const rf = o.reportFile as { name?: string; dataUrl?: string } | undefined;
        return rf?.name ?? null;
      }),
      reportFileData: f("report_file_data", "str", (o) => {
        const rf = o.reportFile as { name?: string; dataUrl?: string } | undefined;
        return rf?.dataUrl ?? null;
      }),
      createdAt: f("created_at", "ts"),
    },
  },
  orgDirectories: {
    table: "org_directory",
    fields: {
      id: f("id", "int"), orgUnitId: f("org_unit_id", "int"),
      secretaryName: f("secretary_name", "str"), secretaryPhone: f("secretary_phone", "str"),
      email: f("email", "str"), achievements: f("achievements", "str"),
      strengths: f("strengths", "str"), academicResources: f("academic_resources", "str"),
      clubs: f("clubs", "str"), updatedAt: f("updated_at", "ts"),
      updatedByAccountId: f("updated_by_account_id", "int"),
    },
  },
  memberContributions: {
    table: "member_contributions",
    fields: {
      id: f("id", "int"), contributorAccountId: f("contributor_account_id", "int"),
      categoryTag: f("category_tag", "str"), title: f("title", "str"),
      excerpt: f("excerpt", "str"), content: f("content", "str"),
      coverDataUrl: f("cover_data_url", "str"), status: f("status", "str"),
      aiVerdict: f("ai_verdict", "str"), aiReason: f("ai_reason", "str"),
      aiModel: f("ai_model", "str"), moderatedByAccountId: f("moderated_by_account_id", "int"),
      moderatedAt: f("moderated_at", "ts"), rejectionReason: f("rejection_reason", "str"),
      postSlug: f("post_slug", "str"), createdAt: f("created_at", "ts"),
    },
  },
  contributions: {
    table: "contribution_logs",
    fields: {
      id: f("id", "int"), accountId: f("account_id", "int"), kind: f("contribution_kind", "str"),
      refId: f("ref_id", "int"), refTitle: f("ref_title", "str"), points: f("points", "int"),
      createdAt: f("created_at", "ts"),
    },
  },
};

/** Thứ tự phụ thuộc FK — insert xuôi, xoá ngược thứ tự này */
export const ENTITY_ORDER: string[] = [
  "criteriaSets", "tasks", "taskMetrics", "taskAssignments", "assignmentTargets",
  "taskResults", "assignmentReviews", "scores", "rankingSnapshots", "rankingEntries",
  "activities", "activityCategories", "activityLinks", "publishedPosts",
  "reports", "documents", "documentRecipients", "notifications",
  "feedbacks", "feedbackMessages", "emailLogs",
  "attendances", "liveEvents", "resources", "settings",
  "forumThreads", "forumComments",
  "hs3tProfiles", "hs3tAchievements", "hs3tUnitStandards",
  "quizQuestions", "quizExams", "quizAttempts",
  "volunteerProjects", "orgDirectories", "memberContributions", "contributions",
];

/** Entity khách vãng lai (chưa đăng nhập) được phép ghi qua sync */
export const PUBLIC_WRITE_ENTITIES = new Set([
  "feedbacks", "feedbackMessages", "attendances", "liveEvents", "quizAttempts",
]);

/** Entity đoàn viên (DOAN_VIEN) được phép đọc thêm (ngoài public) */
export const MEMBER_READ_ENTITIES = new Set([
  "contributions", "memberContributions", "hs3tProfiles", "hs3tAchievements",
  "hs3tUnitStandards", "notifications", "quizAttempts",
]);

/** Entity đoàn viên (DOAN_VIEN) được phép ghi qua sync */
export const MEMBER_ALLOWED_WRITE_ENTITIES = new Set([
  "feedbacks", "feedbackMessages", "attendances", "liveEvents", "quizAttempts",
  "contributions", "memberContributions", "hs3tProfiles", "hs3tAchievements",
  "forumThreads", "forumComments", "volunteerProjects", "resources",
]);

/** Entity khách vãng lai được đọc — còn lại chỉ khi có phiên đăng nhập */
export const PUBLIC_READ_ENTITIES = new Set([
  "orgUnits", "publishedPosts", "activities", "activityCategories", "activityLinks",
  "documents", "documentRecipients", "resources", "settings",
  "forumThreads", "forumComments", "orgDirectories", "volunteerProjects",
  "quizQuestions", "quizExams", "liveEvents", "hs3tUnitStandards",
  "criteriaSets", "tasks", "taskMetrics", "taskAssignments", "assignmentTargets",
  "taskResults", "assignmentReviews", "scores", "rankingSnapshots", "rankingEntries",
]);

function coerceIn(value: unknown, type: FieldType): unknown {
  if (value === undefined) return null;
  switch (type) {
    case "int":
    case "num":
      return value === null || value === "" ? null : Number(value);
    case "bool":
      return value === null ? null : Boolean(value);
    case "date":
      return value === null ? null : String(value).slice(0, 10);
    case "ts":
      return value === null ? null : new Date(value as string).toISOString();
    case "json":
      return value === null ? null : JSON.stringify(value);
    default:
      return value;
  }
}

function coerceOut(value: unknown, type: FieldType): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "int":
    case "num":
      return Number(value);
    case "ts":
      return value instanceof Date ? value.toISOString() : String(value);
    case "date":
      // pg trả DATE (date-only) là Date lúc 00:00 giờ địa phương — lấy theo
      // lịch địa phương, KHÔNG toISOString (dồn về ngày trước với +07:00)
      return value instanceof Date
        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
        : String(value).slice(0, 10);
    case "bigintarr":
      // pg trả bigint[] về string[] — client cần number[]
      return Array.isArray(value) ? value.map((v) => Number(v)) : value;
    default:
      return value;
  }
}

/**
 * Object client → mảng giá trị theo cột (kèm cột phái sinh).
 * `nullCols`: cột client GỬI RÕ null (người dùng xoá giá trị) — khi UPDATE sẽ đặt
 * NULL nếu cột cho phép; khi INSERT vẫn bỏ qua để DEFAULT phía DB hoạt động.
 */
export function toRow(
  entity: string,
  obj: Record<string, unknown>,
  ctx: DeriveCtx,
): { cols: string[]; values: unknown[]; nullCols: string[] } {
  const spec = ENTITY_SPECS[entity];
  const cols: string[] = [];
  const values: unknown[] = [];
  const nullCols: string[] = [];
  for (const [field, fs] of Object.entries(spec.fields)) {
    const raw = fs.get ? fs.get(obj) : obj[field];
    const value = coerceIn(raw, fs.type);
    // Bỏ qua cột giá trị rỗng — DEFAULT phía DB lo các cột NOT NULL (updated_at, evidence_names…)
    if (value === null) {
      if (!fs.get && raw === null) nullCols.push(fs.col);
      continue;
    }
    cols.push(fs.col);
    values.push(value);
  }
  if (spec.derive) {
    for (const [col, value] of Object.entries(spec.derive(obj, ctx))) {
      cols.push(col);
      values.push(value);
    }
  }
  return { cols, values, nullCols: nullCols.filter((c) => !cols.includes(c)) };
}

/** Cột cho phép NULL của từng bảng (đọc information_schema 1 lần mỗi tiến trình) */
let nullableColsCache: Map<string, Set<string>> | null = null;
async function nullableColsOf(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  table: string,
): Promise<Set<string>> {
  if (!nullableColsCache) {
    const r = (await client.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND is_nullable = 'YES'",
    )) as { rows: { table_name: string; column_name: string }[] };
    nullableColsCache = new Map();
    for (const row of r.rows) {
      if (!nullableColsCache.has(row.table_name)) nullableColsCache.set(row.table_name, new Set());
      nullableColsCache.get(row.table_name)!.add(row.column_name);
    }
  }
  return nullableColsCache.get(table) ?? new Set();
}

/** Dòng DB → object client */
export function toObj(entity: string, row: Record<string, unknown>): Record<string, unknown> {
  const spec = ENTITY_SPECS[entity];
  const obj: Record<string, unknown> = {};
  for (const [field, fs] of Object.entries(spec.fields)) {
    obj[field] = coerceOut(row[fs.col], fs.type);
  }
  return obj;
}

/** Đọc toàn bộ 1 bảng, trả về mảng object theo field client */
export async function readEntity(
  entity: string,
  filterSql?: { where: string; params: unknown[] },
): Promise<Record<string, unknown>[]> {
  const spec = ENTITY_SPECS[entity];
  const whereClause = filterSql?.where ? ` WHERE ${filterSql.where}` : "";
  const params = filterSql?.params ?? [];
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM ${spec.table}${whereClause} ORDER BY ${spec.orderBy ?? "id"}`,
    params,
  );
  return rows.map((r) => toObj(entity, r));
}


/** Điền account đại diện theo đơn vị (cho cột created_by NOT NULL) */
export async function buildDeriveCtx(): Promise<DeriveCtx> {
  const rows = await query<{ org_unit_id: number; id: number }>(
    "SELECT DISTINCT ON (org_unit_id) org_unit_id, id FROM accounts WHERE deleted_at IS NULL ORDER BY org_unit_id, id",
  );
  return { accountIdByOrg: new Map(rows.map((r) => [Number(r.org_unit_id), Number(r.id)])) };
}

/**
 * Ghi đè toàn bộ 1 entity bằng mảng object client (xoá hết → insert lại,
 * trong transaction của caller). Trả về số dòng đã insert.
 */
export async function writeEntity(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  entity: string,
  objs: Record<string, unknown>[],
  ctx: DeriveCtx,
): Promise<number> {
  const spec = ENTITY_SPECS[entity];
  if (!spec || objs.length === 0) return 0;

  const overriding = spec.noIdentity ? "" : " OVERRIDING SYSTEM VALUE";
  const nullable = await nullableColsOf(client, spec.table);
  for (const obj of objs) {
    const { cols, values, nullCols } = toRow(entity, obj, ctx);
    if (cols.length === 0) continue;
    const clearCols = nullCols.filter((c) => nullable.has(c));
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = cols.map((c) => `"${c}"`).join(", ");

    let conflictClause = "";
    if (entity === "settings") {
      const updateCols = cols.filter((c) => c !== "setting_key");
      conflictClause = updateCols.length > 0
        ? ` ON CONFLICT (setting_key) DO UPDATE SET ${updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ")}`
        : " ON CONFLICT (setting_key) DO NOTHING";
    } else if (entity === "activityCategories") {
      conflictClause = " ON CONFLICT (activity_id, content_category_id) DO NOTHING";
    } else if (entity === "documentRecipients") {
      conflictClause = " ON CONFLICT (document_id, org_unit_id) DO NOTHING";
    } else if (cols.includes("id")) {
      const sets = [
        ...cols.filter((c) => c !== "id").map((c) => `"${c}" = EXCLUDED."${c}"`),
        ...clearCols.map((c) => `"${c}" = NULL`),
      ];
      conflictClause = sets.length > 0
        ? ` ON CONFLICT (id) DO UPDATE SET ${sets.join(", ")}`
        : " ON CONFLICT (id) DO NOTHING";
    }

    await client.query(
      `INSERT INTO ${spec.table} (${colList})${overriding} VALUES (${placeholders})${conflictClause}`,
      values,
    );
  }
  if (!spec.noIdentity && objs.length > 0) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${spec.table}', 'id'), COALESCE((SELECT max(id) FROM ${spec.table}), 1))`,
    );
  }
  return objs.length;
}


/**
 * Xoá dòng theo id do client gửi kèm (tombstone) — server luôn gọi theo
 * THỨ TỰ NGƯỢC ENTITY_ORDER để xoá bảng con trước bảng cha (an toàn FK).
 * Bảng con có ON DELETE CASCADE sẽ tự dọn khi xoá bảng cha.
 */
export async function deleteEntityIds(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  entity: string,
  ids: number[],
): Promise<number> {
  const spec = ENTITY_SPECS[entity];
  const clean = Array.from(new Set(ids.map(Number).filter(Number.isFinite)));
  if (!spec || clean.length === 0) return 0;
  const r = (await client.query(`DELETE FROM ${spec.table} WHERE id = ANY($1::bigint[])`, [clean])) as {
    rowCount?: number;
  };
  return r.rowCount ?? 0;
}
