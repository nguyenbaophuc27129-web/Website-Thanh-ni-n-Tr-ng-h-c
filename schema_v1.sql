create table admin_units ();
create table org_units (
    id bigint generated always as identity primary key,
    parent_id bigint references org_units(id),
    code varchar(50) unique not null,
    name varchar(255) not null,
    short_name varchar(100),
    org_level smallint not null check (org_level in (1, 2, 3, 4)),
    path varchar(255) not null   
);
create table accounts ();
create table roles ();
create table permissions ();
create table role_permissions ();
create table account_roles ();
create table school_types ();
create table files ();
create table activities ();
create table activity_links();
create table content_categories ();
create table activity_categories ();
create table activity_files ();
create table criteria_sets ();
create table tasks ();
create table task_metrics ();
create table task_assignments ();
create table assignment_targets ();
create table task_results ();
create table assignment_reviews ();
create table activity_task_links ();
create table scores ();
create table published_posts ();
create table post_views ();
create table post_views_daily ();
create table ranking_snapshots ();
create table ranking_entries ();
create table reports ();
create table report_activities ();
create table report_exports ();
create table document_categories ();
create table documents ();
create table document_files ();
create table document_recipients ();
create table notifications ();
create table feedback_topics ();
create table feedbacks ();
create table feedback_messages ();
create table resource_types ();
create table resources ();
create table audit_logs ();
create table system_settings ();