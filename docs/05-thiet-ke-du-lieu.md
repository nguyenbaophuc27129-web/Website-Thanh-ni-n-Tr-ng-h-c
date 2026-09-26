# 5. Thiết kế dữ liệu — 43 bảng, 8 phân hệ

> Nguồn sự thật: `THIET-KE-SCHEMA (1).md` (đặc tả đầy đủ cột, ràng buộc, CHECK, index).
> Tài liệu này tóm tắt để định hướng; prototype (`src/types/index.ts` + `src/data/`) đặt tên entity khớp 1-1.

## 5.1. Tổng quan 8 phân hệ

| # | Phân hệ | Bảng | Điểm nhấn thiết kế |
|---|---|---|---|
| 1 | Tổ chức & Tài khoản | `admin_units`, `org_units`, `accounts`, `roles`, `permissions`, `role_permissions`, `account_roles`, `school_types`, `files` | Cây đơn vị **materialized path** `/1/12/25/31/`; 1 đơn vị = 1 tài khoản (UQ `org_unit_id`) |
| 2 | Hoạt động | `activities`, `activity_links`, `content_categories`, `activity_categories`, `activity_files` | Trạng thái DRAFT/SUBMITTED/CONFIRMED/NEEDS_INFO/REJECTED; nhật ký xác nhận |
| 3 | Nhiệm vụ & Chỉ tiêu | `criteria_sets`, `tasks`, `task_metrics`, `task_assignments`, `assignment_targets` | Phân bổ nhiều cấp: cha giao con, tổng con ≤ cha; cây nhiệm vụ I → I.1 → I.1.a |
| 4 | Đánh giá | `task_results`, `assignment_reviews`, `scores` | `task_results` **append-only**; 3 phương thức chấm AUTO_AGGREGATE / MANUAL_CONFIRM / EXPERT_REVIEW |
| 5 | Xuất bản | `published_posts`, `post_views`, `post_view_daily` | `post_views` phân vùng theo tháng; `post_view_daily` là bảng tổng hợp `[D]` denormalize |
| 6 | Xếp hạng & Báo cáo | `ranking_snapshots`, `ranking_entries`, `reports`, `report_activities`, `report_exports` | Xếp hạng là **snapshot** chốt kỳ; báo cáo gắn kỳ + lịch sử xuất file |
| 7 | Văn bản & Thông báo | `document_categories`, `documents`, `document_files`, `document_recipients`, `notifications` | Gửi theo phạm vi ALL_DESCENDANTS / DIRECT_CHILDREN / SELECTED; theo dõi đã đọc từng đơn vị |
| 8 | Phản ánh & Tài nguyên | `feedback_topics`, `feedbacks`, `feedback_messages`, `resource_types`, `resources`, `audit_logs`, `system_settings` | Phản ánh **không cần đăng nhập**, có mã tra cứu; `audit_logs` phân vùng theo tháng |

## 5.2. Các bảng gốc và quan hệ trọng yếu

```
org_units (path) ─┬─< accounts ─< account_roles >─ roles ─< role_permissions >─ permissions
                  ├─< activities ─┬─< activity_links
                  │               ├─< activity_categories >─ content_categories
                  │               └─< activity_files >─ files
                  ├─< task_assignments ─┬─< assignment_targets
                  │                     ├─< task_results   (append-only)
                  │                     └─< assignment_reviews
                  │        tasks >─── task_metrics
                  │        criteria_sets ─< tasks (parent_id tạo cây)
                  ├─< scores
                  ├─< ranking_entries >─ ranking_snapshots
                  ├─< reports ─< report_activities / report_exports
                  ├─< document_recipients >─ documents ─< document_files
                  └─< feedbacks ─< feedback_messages
notifications:.actor ↔ accounts · resources · audit_logs · system_settings
```

## 5.3. Trạng thái & enum chuẩn (giữ y chang để map 1-1)

| Trường | Giá trị CHECK |
|---|---|
| `accounts.status` | PENDING / ACTIVE / LOCKED / DISABLED |
| `activities.status` | DRAFT / SUBMITTED / CONFIRMED / NEEDS_INFO / REJECTED |
| `activity_reviews.action` | SUBMIT / CONFIRM / NEEDS_INFO / REJECT / REVISE |
| `task_assignments.progress_status` | NOT_STARTED / IN_PROGRESS / COMPLETED / OVERDUE |
| `assignment_reviews.action` | CONFIRM / NEEDS_INFO / REJECT |
| `tasks.scoring_method` | AUTO_AGGREGATE / MANUAL_CONFIRM / EXPERT_REVIEW |
| `published_posts.status` | DRAFT / PUBLISHED / UNPUBLISHED / SCHEDULED |
| `ranking_snapshots.status` | DRAFT / FINALIZED |
| `ranking_snapshots.ranking_type` | BY_SCORE / BY_TASK_RESULT / BY_ACTIVITY_COUNT |
| `reports.period_type` | MONTHLY / QUARTERLY / YEARLY / AD_HOC · status DRAFT / FINALIZED |
| `documents.recipient_scope` | ALL_DESCENDANTS / DIRECT_CHILDREN / SELECTED |
| `feedbacks.status` | NEW / IN_PROGRESS / RESOLVED / CLOSED |
| `feedback_messages.kind` | PUBLIC / INTERNAL |

## 5.4. Ánh xạ prototype ↔ schema

| Schema | Trong prototype |
|---|---|
| Bảng 43 bảng | `src/types/index.ts` — interface trùng tên (OrgUnit, Activity, TaskAssignment, AssignmentTarget, Score, PublishedPost, RankingSnapshot, Report, Document, Feedback…) |
| Dữ liệu mẫu | `src/data/*.ts` (~25 file) — id khớp chéo giữa các bảng, kịch bản demo đầy đủ |
| Materialized path | `scopeIds()` trong `store-context.tsx` — duyệt `parentId` thay `LIKE '/1/12/%'` |
| Trigger tự sinh `path` | Hàm `buildPath(parentId)` khi tạo đơn vị |
| `accounts` + `account_roles` | `Account` gộp trường `role` (prototype 1 tài khoản 1 vai trò) |
| `post_views` + `post_view_daily` | Đếm trực tiếp `published_posts.view_count` + dữ liệu mẫu `post-view-daily.ts` cho biểu đồ |
| `report_exports` | Lịch sử xuất ghi vào store (toast demo, chưa có file thật) |

## 5.5. Chi tiết đầy đủ

- Cột, kiểu dữ liệu, ràng buộc UQ/NN, CHECK, index trọng yếu, ghi chú denormalize `[D]`:
  xem `THIET-KE-SCHEMA (1).md` mục **5. Từ điển dữ liệu** (5.1 `org_units` → 5.23 bảng hệ thống).
- Các điểm cần Ban TNTH chốt: mục **8. Vấn đề cần chốt** của file schema.
