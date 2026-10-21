import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";
import {
  ENTITY_ORDER,
  ENTITY_SPECS,
  writeEntity,
} from "../src/lib/server/store-tables.ts";

import { activities } from "../src/data/activities.ts";
import { publishedPosts } from "../src/data/published-posts.ts";
import { feedbacks, feedbackMessages } from "../src/data/feedbacks.ts";
import { FORUM_THREADS, FORUM_COMMENTS } from "../src/data/forum.ts";
import { quizQuestions } from "../src/data/quiz-bank.ts";
import { quizExams } from "../src/data/quiz-exams.ts";
import { volunteerProjects } from "../src/data/volunteer-projects.ts";
import { criteriaSets, tasks, taskMetrics } from "../src/data/criteria-tasks.ts";
import { taskAssignments, assignmentTargets, taskResults, assignmentReviews } from "../src/data/task-assignments.ts";
import { scores } from "../src/data/scores.ts";
import { documents, documentRecipients } from "../src/data/documents.ts";
import { notifications as seedNotifications } from "../src/data/notifications.ts";
import { reports } from "../src/data/reports.ts";
import { resources, systemSettings } from "../src/data/resources.ts";
import { liveEvents } from "../src/data/live-events.ts";
import { orgDirectories } from "../src/data/directory.ts";
import { hs3tProfiles, hs3tAchievements, hs3tUnitStandards } from "../src/data/hs3t.ts";
import { rankingSnapshots, rankingEntries } from "../src/data/rankings.ts";

const envPath = new URL("../.env.local", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const url = process.env.DATABASE_URL;
if (!url || url.includes("<MAT-KHAU>")) {
  console.error("❌ DATABASE_URL chưa cấu hình trong .env.local");
  process.exit(1);
}

const attendances: unknown[] = [];

const entities: Record<string, unknown[]> = {
  criteriaSets,
  tasks,
  taskMetrics,
  taskAssignments,
  assignmentTargets,
  taskResults,
  assignmentReviews,
  scores,
  activities,
  activityCategories: activities.flatMap((a) => a.categoryIds.map((categoryId) => ({ activityId: a.id, categoryId }))),
  activityLinks: activities.flatMap((a) => a.links),
  publishedPosts,
  reports,
  documents,
  documentRecipients,
  notifications: seedNotifications,
  feedbacks,
  feedbackMessages,
  emailLogs: [],
  attendances,
  liveEvents,
  resources,
  settings: systemSettings,
  forumThreads: FORUM_THREADS,
  forumComments: FORUM_COMMENTS,
  hs3tProfiles,
  hs3tAchievements,
  hs3tUnitStandards,
  quizQuestions,
  quizExams,
  quizAttempts: [],
  volunteerProjects,
  orgDirectories,
  memberContributions: [],
  contributions: [],
};

const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });
await client.connect();

try {
  const rows = await client.query<{ org_unit_id: number; id: number }>(
    "SELECT DISTINCT ON (org_unit_id) org_unit_id, id FROM accounts WHERE deleted_at IS NULL ORDER BY org_unit_id, id"
  );
  const ctx = { accountIdByOrg: new Map(rows.rows.map((r) => [Number(r.org_unit_id), Number(r.id)])) };

  await client.query("BEGIN");

  // Xoá ngược ENTITY_ORDER
  await client.query("DELETE FROM ranking_entries");
  await client.query("DELETE FROM ranking_snapshots");
  for (const name of [...ENTITY_ORDER].reverse()) {
    if (!entities[name]) continue;
    await client.query(`DELETE FROM ${ENTITY_SPECS[name].table}`);
  }

  // Dọn tài khoản + phiên đăng nhập: CHỈ giữ tw.admin (id 1) nguyên trạng mật khẩu
  await client.query("DELETE FROM auth_sessions");
  const accGone = await client.query("DELETE FROM accounts WHERE id <> 1");

  // Quét các bảng ngoài ENTITY_ORDER còn sót dữ liệu (bảng vận hành: audit_logs, post_views…)
  // → xoá nốt. DANH MỤC + cây tổ chức được GIỮ NGUYÊN.
  const keepTables = new Set([
    ...ENTITY_ORDER.map((n) => ENTITY_SPECS[n].table),
    "ranking_entries", "ranking_snapshots",
    "org_units", "school_types", "accounts", "schema_migrations",
    "roles", "content_categories", "document_categories", "feedback_topics", "resource_types",
  ]);
  const leftovers = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> ALL($1)`,
    [[...keepTables]]
  );
  for (const { table_name } of leftovers.rows) {
    const n = await client.query(`DELETE FROM ${table_name}`);
    if (n.rowCount && n.rowCount > 0) console.log(`   + dọn bảng ngoài ${table_name}: ${n.rowCount} dòng`);
  }

  const counts: Record<string, number> = {};
  for (const name of ENTITY_ORDER) {
    const list = entities[name];
    if (!list) continue;
    const n = await writeEntity(client, name, list as Record<string, unknown>[], ctx);
    counts[name] = n;
  }

  // Insert ranking_snapshots
  for (const s of rankingSnapshots) {
    await client.query(
      `INSERT INTO ranking_snapshots (id, name, criteria_set_id, scope_org_unit_id, ranked_org_level, ranking_type, period_type, period_start, period_end, total_units, generated_by_account_id, status)
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [s.id, s.name, s.criteriaSetId, s.scopeOrgUnitId, s.rankedOrgLevel, s.rankingType, s.periodType, s.periodStart, s.periodEnd, s.totalUnits, s.generatedByAccountId, s.status]
    );
  }
  if (rankingSnapshots.length > 0) {
    await client.query("SELECT setval(pg_get_serial_sequence('ranking_snapshots', 'id'), (SELECT max(id) FROM ranking_snapshots))");
  }
  counts["rankingSnapshots"] = rankingSnapshots.length;

  // Insert ranking_entries
  for (const e of rankingEntries) {
    await client.query(
      `INSERT INTO ranking_entries (id, snapshot_id, org_unit_id, rank_position, total_score, completion_rate, completed_tasks, total_tasks, activity_count)
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [e.id, e.snapshotId, e.orgUnitId, e.rankPosition, e.totalScore, e.completionRate, e.completedTasks, e.totalTasks, e.activityCount]
    );
  }
  if (rankingEntries.length > 0) {
    await client.query("SELECT setval(pg_get_serial_sequence('ranking_entries', 'id'), (SELECT max(id) FROM ranking_entries))");
  }
  counts["rankingEntries"] = rankingEntries.length;

  await client.query("COMMIT");

  console.log("🎉 Reset tnth_dev về baseline sạch (chỉ còn dữ liệu gốc + 01 admin TW):");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k}: ${v} dòng`);
  }
  console.log(`   accounts: xoá ${accGone.rowCount ?? 0} tài khoản, chỉ còn tw.admin (id 1)`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("❌ Lỗi khi seed entities:", err);
  process.exit(1);
} finally {
  await client.end();
}
