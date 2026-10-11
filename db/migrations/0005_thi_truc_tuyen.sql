-- 0005: Thi kiến thức trực tuyến (v12) — ngân hàng câu hỏi, đề thi, lượt làm
-- 7 dạng câu: MCQ 1/n đáp án, đúng-sai, điền khuyết, 2 loại tự luận, tải file.
-- answers: { "<questionId>": {selected?, text?, fileName?} }
-- trail:   [{questionId, difficulty, correct}] — lộ trình adaptive.

create table if not exists quiz_questions (
    id bigint generated always as identity primary key,
    topic varchar(100) not null,
    difficulty varchar(10) not null check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
    question_type varchar(20) not null check (question_type in (
        'MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE', 'FILL',
        'SHORT_ANSWER', 'LONG_ANSWER', 'FILE_UPLOAD'
    )),
    stem text not null,
    options jsonb,
    correct_indexes integer[] not null default '{}',
    correct_text varchar(500),
    points numeric(5, 2) not null default 1 check (points >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists quiz_questions_topic_idx on quiz_questions(topic);
create index if not exists quiz_questions_difficulty_idx on quiz_questions(difficulty);

create table if not exists quiz_exams (
    id bigint generated always as identity primary key,
    code varchar(50) not null unique,
    title varchar(255) not null,
    description text,
    duration_minutes smallint not null check (duration_minutes > 0),
    question_ids bigint[] not null default '{}',
    shuffle_questions boolean not null default true,
    shuffle_options boolean not null default false,
    adaptive boolean not null default false,
    topics text[] not null default '{}',
    status varchar(10) not null default 'DRAFT' check (status in ('DRAFT', 'OPEN', 'CLOSED')),
    created_by_account_id bigint not null references accounts(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists quiz_attempts (
    id bigint generated always as identity primary key,
    exam_id bigint not null references quiz_exams(id) on delete cascade,
    account_id bigint references accounts(id),
    examinee_name varchar(150) not null,
    examinee_org_text varchar(255),
    answers jsonb not null default '{}'::jsonb,
    trail jsonb not null default '[]'::jsonb,
    auto_score numeric(6, 2) not null default 0 check (auto_score >= 0),
    max_score numeric(6, 2) not null default 0,
    manual_points numeric(6, 2),
    status varchar(15) not null default 'IN_PROGRESS'
        check (status in ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    graded_by_account_id bigint references accounts(id),
    started_at timestamptz not null default now(),
    submitted_at timestamptz
);

create index if not exists quiz_attempts_exam_idx on quiz_attempts(exam_id);
create index if not exists quiz_attempts_account_idx on quiz_attempts(account_id);
