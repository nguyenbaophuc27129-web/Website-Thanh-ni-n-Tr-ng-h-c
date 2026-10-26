-- Cấu trúc DB hiện tại (pg_dump --schema-only từ tnth_dev, đã gồm migration tới 0029, 27/10/2026).
-- Dùng để CÀI MỚI; không chứa dữ liệu. Sau khi nạp, ghi các migration đã áp vào schema_migrations.
-- Lịch sử thay đổi vẫn nằm ở db/migrations/ (không sửa). Khi thêm migration mới, xuất lại tệp này.

--
-- PostgreSQL database dump
--

\restrict BQXH4iV3932KCPxj5aDbxfgYgE5v3ay1fEzFfQTxqRcceCwkyycfyOtRSghFJEM

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: ensure_month_partitions(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_month_partitions(months_ahead integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  base_month DATE := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  month_start DATE;
  parent TEXT;
  part_name TEXT;
  created INTEGER := 0;
BEGIN
  FOREACH parent IN ARRAY ARRAY['post_views', 'audit_logs'] LOOP
    FOR i IN -1 .. months_ahead LOOP
      month_start := (base_month + make_interval(months => i))::date;
      part_name   := format('%s_y%sm%s', parent, to_char(month_start, 'YYYY'), to_char(month_start, 'MM'));
      IF to_regclass(part_name) IS NULL THEN
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
          part_name, parent,
          to_char(month_start, 'YYYY-MM-DD') || ' 00:00:00+00',
          to_char((month_start + interval '1 month')::date, 'YYYY-MM-DD') || ' 00:00:00+00');
        created := created + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN created;
END $$;


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $_$;


--
-- Name: org_units_cascade_path(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_units_cascade_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.path IS DISTINCT FROM OLD.path THEN
    UPDATE org_units
       SET path  = NEW.path || substr(path, length(OLD.path) + 1),
           depth = depth + (NEW.depth - OLD.depth)
     WHERE path LIKE OLD.path || '%'
       AND id <> NEW.id;
  END IF;
  RETURN NULL;
END $$;


--
-- Name: org_units_set_path(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_units_set_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_path  VARCHAR(255);
  parent_depth SMALLINT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path  := '/' || NEW.id || '/';
    NEW.depth := 0;
    RETURN NEW;
  END IF;

  SELECT path, depth INTO parent_path, parent_depth FROM org_units WHERE id = NEW.parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn vị cha % không tồn tại', NEW.parent_id;
  END IF;
  IF TG_OP = 'UPDATE' AND parent_path LIKE OLD.path || '%' THEN
    RAISE EXCEPTION 'Không thể chuyển đơn vị % vào chính nó hoặc đơn vị cấp dưới của nó', NEW.id;
  END IF;

  NEW.path  := parent_path || NEW.id || '/';
  NEW.depth := parent_depth + 1;
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: task_results_forbid_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.task_results_forbid_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'task_results là bảng append-only: không được sửa, hãy ghi dòng mới';
END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_permissions (
    account_id bigint NOT NULL,
    perm_code character varying(50) NOT NULL,
    granted_by_account_id bigint,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_roles (
    account_id bigint NOT NULL,
    role_id bigint NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by_account_id bigint
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    username public.citext NOT NULL,
    email public.citext NOT NULL,
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    contact_person character varying(150),
    contact_position character varying(150),
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    must_change_password boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    failed_login_count smallint DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    role_code character varying(30),
    class_name character varying(100),
    chuc_danh character varying(200),
    CONSTRAINT accounts_failed_login_count_ck CHECK ((failed_login_count >= 0)),
    CONSTRAINT accounts_role_code_ck CHECK (((role_code IS NULL) OR ((role_code)::text = ANY ((ARRAY['QUAN_TRI_TW'::character varying, 'QUAN_TRI_TINH'::character varying, 'QUAN_TRI_CAP3'::character varying, 'DON_VI'::character varying, 'BIEN_TAP_VIEN'::character varying, 'DOAN_VIEN'::character varying])::text[])))),
    CONSTRAINT accounts_status_ck CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('ACTIVE'::character varying)::text, ('LOCKED'::character varying)::text, ('DISABLED'::character varying)::text])))
);


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    summary text,
    start_date date NOT NULL,
    end_date date,
    location character varying(255),
    participant_count integer,
    activity_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    confirm_status character varying(20) DEFAULT 'NOT_REQUIRED'::character varying NOT NULL,
    created_by_account_id bigint NOT NULL,
    updated_by_account_id bigint,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, public.immutable_unaccent((((COALESCE(title, ''::character varying))::text || ' '::text) || COALESCE(summary, ''::text))))) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    image_seed integer DEFAULT 0 NOT NULL,
    review_note text,
    CONSTRAINT activities_activity_type_ck CHECK (((activity_type)::text = ANY (ARRAY[('TASK_BASED'::character varying)::text, ('GENERAL'::character varying)::text]))),
    CONSTRAINT activities_confirm_status_ck CHECK (((confirm_status)::text = ANY (ARRAY[('NOT_REQUIRED'::character varying)::text, ('PENDING'::character varying)::text, ('CONFIRMED'::character varying)::text, ('NEEDS_INFO'::character varying)::text, ('REJECTED'::character varying)::text]))),
    CONSTRAINT activities_date_range_ck CHECK ((end_date >= start_date)),
    CONSTRAINT activities_participant_count_ck CHECK ((participant_count >= 0)),
    CONSTRAINT activities_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('SUBMITTED'::character varying)::text, ('REVISED'::character varying)::text]))),
    CONSTRAINT activities_summary_length_ck CHECK ((char_length(summary) <= 2000))
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.activities ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: activity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_categories (
    activity_id bigint NOT NULL,
    content_category_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_files (
    activity_id bigint NOT NULL,
    file_id bigint NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_cover boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_links (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    platform character varying(30) NOT NULL,
    url text NOT NULL,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT activity_links_platform_ck CHECK (((platform)::text = ANY (ARRAY[('FACEBOOK'::character varying)::text, ('WEBSITE'::character varying)::text, ('ZALO'::character varying)::text, ('TIKTOK'::character varying)::text, ('YOUTUBE'::character varying)::text, ('PRESS'::character varying)::text, ('OTHER'::character varying)::text]))),
    CONSTRAINT activity_links_url_ck CHECK ((url ~* '^https?://'::text))
);


--
-- Name: activity_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.activity_links ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: activity_task_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_task_links (
    activity_id bigint NOT NULL,
    task_assignment_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_units (
    id bigint NOT NULL,
    parent_id bigint,
    code character varying(20) NOT NULL,
    name character varying(150) NOT NULL,
    unit_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_units_unit_type_ck CHECK (((unit_type)::text = ANY (ARRAY[('PROVINCE'::character varying)::text, ('WARD'::character varying)::text, ('COMMUNE'::character varying)::text, ('SPECIAL_ZONE'::character varying)::text])))
);


--
-- Name: admin_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.admin_units ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.admin_units_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: assignment_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_reviews (
    id bigint NOT NULL,
    task_assignment_id bigint NOT NULL,
    reviewer_account_id bigint NOT NULL,
    action character varying(20) NOT NULL,
    note text,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assignment_reviews_action_ck CHECK (((action)::text = ANY (ARRAY[('CONFIRM'::character varying)::text, ('REQUEST_INFO'::character varying)::text, ('REJECT'::character varying)::text])))
);


--
-- Name: assignment_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.assignment_reviews ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.assignment_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: assignment_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_targets (
    id bigint NOT NULL,
    task_assignment_id bigint NOT NULL,
    task_metric_id bigint NOT NULL,
    target_value numeric(14,2) NOT NULL,
    achieved_value numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assignment_targets_target_value_ck CHECK ((target_value >= (0)::numeric))
);


--
-- Name: assignment_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.assignment_targets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.assignment_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendances (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    member_name character varying(150) NOT NULL,
    member_class character varying(100),
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.attendances ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.attendances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (created_at);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: audit_logs_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_default (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_y2026m09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_y2026m09 (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_y2026m10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_y2026m10 (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_y2026m11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_y2026m11 (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_y2026m12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_y2026m12 (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_y2027m01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs_y2027m01 (
    id bigint DEFAULT nextval('public.audit_logs_id_seq'::regclass) NOT NULL,
    account_id bigint,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    refresh_token_hash character varying(64) NOT NULL,
    user_agent character varying(500),
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_sessions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auth_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chuc_danh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chuc_danh (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chuc_danh_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chuc_danh_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chuc_danh_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chuc_danh_id_seq OWNED BY public.chuc_danh.id;


--
-- Name: content_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_categories (
    id bigint NOT NULL,
    parent_id bigint,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    display_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.content_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.content_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contribution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_logs (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    contribution_kind character varying(10) NOT NULL,
    ref_id bigint NOT NULL,
    ref_title character varying(500) NOT NULL,
    points integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contribution_logs_contribution_kind_check CHECK (((contribution_kind)::text = ANY ((ARRAY['POST'::character varying, 'RESOURCE'::character varying, 'PROJECT'::character varying, 'HS3T'::character varying])::text[]))),
    CONSTRAINT contribution_logs_points_check CHECK ((points > 0))
);


--
-- Name: contribution_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contribution_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contribution_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: criteria_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criteria_sets (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    year smallint NOT NULL,
    owner_org_unit_id bigint NOT NULL,
    target_org_level smallint,
    total_points numeric(7,2),
    effective_from date,
    effective_to date,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT criteria_sets_effective_range_ck CHECK ((effective_to >= effective_from)),
    CONSTRAINT criteria_sets_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('ACTIVE'::character varying)::text, ('CLOSED'::character varying)::text, ('ARCHIVED'::character varying)::text]))),
    CONSTRAINT criteria_sets_target_org_level_ck CHECK (((target_org_level >= 1) AND (target_org_level <= 4))),
    CONSTRAINT criteria_sets_total_points_ck CHECK ((total_points >= (0)::numeric)),
    CONSTRAINT criteria_sets_year_ck CHECK (((year >= 2020) AND (year <= 2100)))
);


--
-- Name: criteria_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.criteria_sets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.criteria_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_categories (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.document_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.document_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: document_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_files (
    document_id bigint NOT NULL,
    file_id bigint NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_recipients (
    document_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    doc_number character varying(100),
    title character varying(500) NOT NULL,
    summary text,
    document_category_id bigint,
    issuing_org_unit_id bigint NOT NULL,
    issued_date date NOT NULL,
    effective_date date,
    recipient_scope character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_by_account_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    file_name text,
    file_data_url text,
    CONSTRAINT documents_recipient_scope_ck CHECK (((recipient_scope)::text = ANY (ARRAY[('ALL_DESCENDANTS'::character varying)::text, ('DIRECT_CHILDREN'::character varying)::text, ('SELECTED'::character varying)::text]))),
    CONSTRAINT documents_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('ISSUED'::character varying)::text, ('REVOKED'::character varying)::text])))
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documents ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id bigint NOT NULL,
    feedback_id bigint NOT NULL,
    to_email public.citext NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    email_kind character varying(10) NOT NULL,
    sent_by_account_id bigint NOT NULL,
    delivery character varying(10),
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_logs_delivery_check CHECK (((delivery)::text = ANY ((ARRAY['PENDING'::character varying, 'SENT'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT email_logs_email_kind_check CHECK (((email_kind)::text = ANY ((ARRAY['REPLY'::character varying, 'RESULT'::character varying])::text[])))
);


--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedback_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_messages (
    id bigint NOT NULL,
    feedback_id bigint NOT NULL,
    sender_type character varying(10) NOT NULL,
    sender_account_id bigint,
    content text NOT NULL,
    is_internal_note boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_name character varying(255),
    sent_at timestamp with time zone,
    CONSTRAINT feedback_messages_internal_note_ck CHECK (((NOT is_internal_note) OR ((sender_type)::text = 'STAFF'::text))),
    CONSTRAINT feedback_messages_sender_account_ck CHECK (((((sender_type)::text = 'STAFF'::text) AND (sender_account_id IS NOT NULL)) OR (((sender_type)::text = 'CITIZEN'::text) AND (sender_account_id IS NULL)))),
    CONSTRAINT feedback_messages_sender_type_ck CHECK (((sender_type)::text = ANY (ARRAY[('CITIZEN'::character varying)::text, ('STAFF'::character varying)::text])))
);


--
-- Name: feedback_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.feedback_messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.feedback_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedback_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_topics (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.feedback_topics ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.feedback_topics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedbacks (
    id bigint NOT NULL,
    tracking_code character varying(20) NOT NULL,
    access_token character varying(64) NOT NULL,
    sender_name character varying(150) NOT NULL,
    sender_email public.citext NOT NULL,
    sender_phone character varying(20),
    sender_org_text character varying(255),
    sender_admin_unit_id bigint,
    feedback_topic_id bigint,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'NEW'::character varying NOT NULL,
    assigned_account_id bigint,
    ip_address inet,
    user_agent character varying(500),
    is_spam boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    first_responded_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    sender_account_id bigint,
    sender_commune_union character varying(255),
    sender_province_union character varying(255),
    evidence_names text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT feedbacks_sender_email_ck CHECK ((sender_email OPERATOR(public.~) '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::public.citext)),
    CONSTRAINT feedbacks_status_ck CHECK (((status)::text = ANY (ARRAY[('NEW'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('RESOLVED'::character varying)::text, ('CLOSED'::character varying)::text])))
);


--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.feedbacks ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id bigint NOT NULL,
    storage_path character varying(500) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum_sha256 character(64),
    uploaded_by_account_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT files_size_bytes_ck CHECK ((size_bytes > 0))
);


--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.files ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: forum_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_comments (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    alias character varying(100) NOT NULL,
    author_account_id bigint NOT NULL,
    content text NOT NULL,
    media jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'PUBLISHED'::character varying NOT NULL,
    liked_account_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    ai_verdict character varying(10) DEFAULT 'CLEAN'::character varying NOT NULL,
    ai_reason text,
    ai_model character varying(100),
    moderated_by_account_id bigint,
    moderated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_comments_ai_verdict_check CHECK (((ai_verdict)::text = ANY ((ARRAY['CLEAN'::character varying, 'FLAGGED'::character varying])::text[]))),
    CONSTRAINT forum_comments_content_check CHECK ((char_length(content) <= 10000)),
    CONSTRAINT forum_comments_status_check CHECK (((status)::text = ANY ((ARRAY['PUBLISHED'::character varying, 'PENDING_REVIEW'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: forum_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.forum_comments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.forum_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: forum_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_threads (
    id bigint NOT NULL,
    alias character varying(100) NOT NULL,
    author_account_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    topic character varying(100),
    media jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'PUBLISHED'::character varying NOT NULL,
    liked_account_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    ai_verdict character varying(10) DEFAULT 'CLEAN'::character varying NOT NULL,
    ai_reason text,
    ai_model character varying(100),
    moderated_by_account_id bigint,
    moderated_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT forum_threads_ai_verdict_check CHECK (((ai_verdict)::text = ANY ((ARRAY['CLEAN'::character varying, 'FLAGGED'::character varying])::text[]))),
    CONSTRAINT forum_threads_content_check CHECK ((char_length(content) <= 20000)),
    CONSTRAINT forum_threads_status_check CHECK (((status)::text = ANY ((ARRAY['PUBLISHED'::character varying, 'HIDDEN'::character varying])::text[])))
);


--
-- Name: forum_threads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.forum_threads ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.forum_threads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hs3t_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hs3t_achievements (
    id bigint NOT NULL,
    profile_id bigint NOT NULL,
    title character varying(500) NOT NULL,
    category character varying(20) NOT NULL,
    sub character varying(255),
    evidence_names text[] DEFAULT '{}'::text[] NOT NULL,
    achieved_at date NOT NULL,
    added_by_role character varying(10) NOT NULL,
    added_by_account_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hs3t_achievements_added_by_role_check CHECK (((added_by_role)::text = ANY ((ARRAY['STUDENT'::character varying, 'SCHOOL'::character varying])::text[]))),
    CONSTRAINT hs3t_achievements_category_check CHECK (((category)::text = ANY ((ARRAY['HOC_TAP'::character varying, 'REN_LUYEN'::character varying, 'PHONG_TRAO'::character varying, 'KHAC'::character varying])::text[])))
);


--
-- Name: hs3t_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hs3t_achievements ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hs3t_achievements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hs3t_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hs3t_profiles (
    id bigint NOT NULL,
    code character varying(30) NOT NULL,
    account_id bigint NOT NULL,
    student_name character varying(150) NOT NULL,
    school_org_unit_id bigint NOT NULL,
    class_name character varying(100),
    awarded_level character varying(10),
    awarded_at timestamp with time zone,
    awarded_by_account_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hs3t_profiles_awarded_level_check CHECK (((awarded_level)::text = ANY ((ARRAY['XA'::character varying, 'TINH'::character varying, 'TW'::character varying])::text[])))
);


--
-- Name: hs3t_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hs3t_profiles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hs3t_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: hs3t_unit_standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hs3t_unit_standards (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    apply_tw boolean DEFAULT true NOT NULL,
    dao_duc text,
    hoc_tap text,
    the_luc text,
    thanh_tich_khac text,
    note text,
    confirmed_by_account_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hs3t_unit_standards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.hs3t_unit_standards ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hs3t_unit_standards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: live_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_events (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    event_type character varying(30) NOT NULL,
    title character varying(500) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT live_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['ACTIVITY_SUBMITTED'::character varying, 'ACTIVITY_CONFIRMED'::character varying, 'TASK_RESULT'::character varying, 'TASK_ASSIGNED'::character varying, 'ATTENDANCE'::character varying, 'REPORT_CREATED'::character varying, 'FEEDBACK_NEW'::character varying])::text[])))
);


--
-- Name: live_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.live_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.live_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_files (
    id bigint NOT NULL,
    path character varying(255) NOT NULL,
    sha256 character(64) NOT NULL,
    kind character varying(30) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    width integer,
    height integer,
    original_name character varying(255),
    uploaded_by_account_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.media_files ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.media_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: member_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_contributions (
    id bigint NOT NULL,
    contributor_account_id bigint NOT NULL,
    category_tag character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    excerpt character varying(500),
    content text NOT NULL,
    cover_data_url text,
    status character varying(10) DEFAULT 'PENDING'::character varying NOT NULL,
    ai_verdict character varying(10) DEFAULT 'CLEAN'::character varying NOT NULL,
    ai_reason text,
    ai_model character varying(100),
    moderated_by_account_id bigint,
    moderated_at timestamp with time zone,
    rejection_reason text,
    post_slug character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT member_contributions_ai_verdict_check CHECK (((ai_verdict)::text = ANY ((ARRAY['CLEAN'::character varying, 'FLAGGED'::character varying])::text[]))),
    CONSTRAINT member_contributions_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: member_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.member_contributions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.member_contributions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    recipient_account_id bigint NOT NULL,
    notification_type character varying(40) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    ref_type character varying(50),
    ref_id bigint,
    link_url character varying(500),
    channel character varying(10) DEFAULT 'WEB'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    email_status character varying(20),
    email_sent_at timestamp with time zone,
    dedupe_key character varying(200),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_channel_ck CHECK (((channel)::text = ANY (ARRAY[('WEB'::character varying)::text, ('EMAIL'::character varying)::text, ('BOTH'::character varying)::text]))),
    CONSTRAINT notifications_email_status_ck CHECK (((email_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SENT'::character varying)::text, ('FAILED'::character varying)::text]))),
    CONSTRAINT notifications_notification_type_ck CHECK (((notification_type)::text = ANY ((ARRAY['TASK_ASSIGNED'::character varying, 'TASK_DUE_SOON'::character varying, 'TASK_OVERDUE'::character varying, 'RESULT_CONFIRMED'::character varying, 'RESULT_NEEDS_INFO'::character varying, 'NEW_DOCUMENT'::character varying, 'FEEDBACK_REPLIED'::character varying, 'FEEDBACK_STATUS'::character varying, 'POST_PUBLISHED'::character varying, 'SYSTEM'::character varying, 'FORUM_FLAGGED'::character varying, 'CONTRIBUTION_APPROVED'::character varying, 'CONTRIBUTION_REJECTED'::character varying, 'PROJECT_APPROVED'::character varying, 'HS3T_AWARDED'::character varying])::text[])))
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: org_directory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_directory (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    secretary_name character varying(150) NOT NULL,
    secretary_phone character varying(20),
    email character varying(255),
    achievements text,
    strengths text,
    academic_resources text,
    clubs text,
    updated_by_account_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_directory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.org_directory ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.org_directory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: org_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_units (
    id bigint NOT NULL,
    parent_id bigint,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    short_name character varying(100),
    org_level smallint NOT NULL,
    path character varying(255) NOT NULL,
    depth smallint NOT NULL,
    admin_unit_id bigint,
    school_type_id bigint,
    address character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    org_block character varying(20),
    CONSTRAINT org_units_not_own_parent_ck CHECK ((parent_id <> id)),
    CONSTRAINT org_units_org_block_ck CHECK (((org_block IS NULL) OR ((org_block)::text = ANY ((ARRAY['DAN_CU'::character varying, 'TRUONG_HOC'::character varying, 'CO_QUAN'::character varying, 'VU_TRANG'::character varying])::text[])))),
    CONSTRAINT org_units_org_level_ck CHECK (((org_level >= 1) AND (org_level <= 5))),
    CONSTRAINT org_units_parent_by_level_ck CHECK ((((org_level = 1) AND (parent_id IS NULL)) OR ((org_level > 1) AND (parent_id IS NOT NULL)))),
    CONSTRAINT org_units_school_type_level_ck CHECK (((school_type_id IS NULL) OR (org_level = 4)))
);


--
-- Name: org_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.org_units ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.org_units_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_codes (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    code_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_codes_id_seq OWNED BY public.password_reset_codes.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    group_name character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.permissions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: post_view_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_view_daily (
    post_id bigint NOT NULL,
    view_date date NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    unique_visitors integer DEFAULT 0 NOT NULL,
    CONSTRAINT post_view_daily_unique_visitors_ck CHECK ((unique_visitors >= 0)),
    CONSTRAINT post_view_daily_view_count_ck CHECK ((view_count >= 0))
);


--
-- Name: post_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
)
PARTITION BY RANGE (viewed_at);


--
-- Name: post_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_views_id_seq OWNED BY public.post_views.id;


--
-- Name: post_views_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_default (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: post_views_y2026m09; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_y2026m09 (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: post_views_y2026m10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_y2026m10 (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: post_views_y2026m11; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_y2026m11 (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: post_views_y2026m12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_y2026m12 (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: post_views_y2027m01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views_y2027m01 (
    id bigint DEFAULT nextval('public.post_views_id_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    visitor_hash character(64),
    referrer character varying(500),
    device_type character varying(20),
    CONSTRAINT post_views_device_type_ck CHECK (((device_type)::text = ANY (ARRAY[('DESKTOP'::character varying)::text, ('MOBILE'::character varying)::text, ('TABLET'::character varying)::text])))
);


--
-- Name: published_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_posts (
    id bigint NOT NULL,
    activity_id bigint,
    slug character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    excerpt character varying(500),
    content text,
    cover_file_id bigint,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    unpublished_at timestamp with time zone,
    view_count bigint DEFAULT 0 NOT NULL,
    meta_title character varying(255),
    meta_description character varying(500),
    editor_account_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    author_org_unit_id bigint,
    contributor_account_id bigint,
    category_names text[] DEFAULT '{}'::text[] NOT NULL,
    cover_data_url text,
    cover_seed integer DEFAULT 0 NOT NULL,
    author_org_unit_name character varying(255),
    subtitle text,
    seo_title text,
    seo_keywords text,
    image_caption text,
    cover_url text,
    post_attributes text[] DEFAULT '{}'::text[] NOT NULL,
    related_posts text[] DEFAULT '{}'::text[] NOT NULL,
    related_topics text[] DEFAULT '{}'::text[] NOT NULL,
    internal_notes text,
    content_doc jsonb,
    CONSTRAINT published_posts_published_at_ck CHECK ((((status)::text <> 'PUBLISHED'::text) OR (published_at IS NOT NULL))),
    CONSTRAINT published_posts_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('SCHEDULED'::character varying)::text, ('PUBLISHED'::character varying)::text, ('UNPUBLISHED'::character varying)::text])))
);


--
-- Name: published_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.published_posts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.published_posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id bigint NOT NULL,
    exam_id bigint NOT NULL,
    account_id bigint,
    examinee_name character varying(150) NOT NULL,
    examinee_org_text character varying(255),
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    trail jsonb DEFAULT '[]'::jsonb NOT NULL,
    auto_score numeric(6,2) DEFAULT 0 NOT NULL,
    max_score numeric(6,2) DEFAULT 0 NOT NULL,
    manual_points numeric(6,2),
    status character varying(15) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    graded_by_account_id bigint,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    access_token character varying(64),
    CONSTRAINT quiz_attempts_auto_score_check CHECK ((auto_score >= (0)::numeric)),
    CONSTRAINT quiz_attempts_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'SUBMITTED'::character varying, 'GRADED'::character varying])::text[])))
);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.quiz_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quiz_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_exams (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    duration_minutes smallint NOT NULL,
    question_ids bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    shuffle_questions boolean DEFAULT true NOT NULL,
    shuffle_options boolean DEFAULT false NOT NULL,
    adaptive boolean DEFAULT false NOT NULL,
    topics text[] DEFAULT '{}'::text[] NOT NULL,
    status character varying(10) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_by_account_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quiz_exams_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT quiz_exams_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'OPEN'::character varying, 'CLOSED'::character varying])::text[])))
);


--
-- Name: quiz_exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.quiz_exams ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.quiz_exams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id bigint NOT NULL,
    topic character varying(100) NOT NULL,
    difficulty character varying(10) NOT NULL,
    question_type character varying(20) NOT NULL,
    stem text NOT NULL,
    options jsonb,
    correct_indexes integer[] DEFAULT '{}'::integer[] NOT NULL,
    correct_text character varying(500),
    points numeric(5,2) DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quiz_questions_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['EASY'::character varying, 'MEDIUM'::character varying, 'HARD'::character varying])::text[]))),
    CONSTRAINT quiz_questions_points_check CHECK ((points >= (0)::numeric)),
    CONSTRAINT quiz_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['MCQ_SINGLE'::character varying, 'MCQ_MULTI'::character varying, 'TRUE_FALSE'::character varying, 'FILL'::character varying, 'SHORT_ANSWER'::character varying, 'LONG_ANSWER'::character varying, 'FILE_UPLOAD'::character varying])::text[])))
);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.quiz_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ranking_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_entries (
    id bigint NOT NULL,
    snapshot_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    rank_position integer NOT NULL,
    total_score numeric(8,2),
    completion_rate numeric(5,2),
    completed_tasks integer,
    total_tasks integer,
    activity_count integer,
    extra_metrics jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ranking_entries_rank_position_ck CHECK ((rank_position > 0))
);


--
-- Name: ranking_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ranking_entries ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ranking_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ranking_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_snapshots (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    criteria_set_id bigint,
    scope_org_unit_id bigint NOT NULL,
    ranked_org_level smallint NOT NULL,
    ranking_type character varying(30) NOT NULL,
    period_type character varying(20) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_units integer DEFAULT 0 NOT NULL,
    generated_by_account_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying DEFAULT 'DRAFT'::character varying NOT NULL,
    CONSTRAINT ranking_snapshots_period_range_ck CHECK ((period_end >= period_start)),
    CONSTRAINT ranking_snapshots_period_type_ck CHECK (((period_type)::text = ANY (ARRAY[('MONTH'::character varying)::text, ('QUARTER'::character varying)::text, ('YEAR'::character varying)::text, ('CUSTOM'::character varying)::text]))),
    CONSTRAINT ranking_snapshots_ranked_org_level_ck CHECK (((ranked_org_level >= 1) AND (ranked_org_level <= 4))),
    CONSTRAINT ranking_snapshots_ranking_type_ck CHECK (((ranking_type)::text = ANY (ARRAY[('BY_SCORE'::character varying)::text, ('BY_TASK_RESULT'::character varying)::text, ('BY_ACTIVITY_COUNT'::character varying)::text]))),
    CONSTRAINT ranking_snapshots_status_ck CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'FINALIZED'::character varying])::text[]))),
    CONSTRAINT ranking_snapshots_total_units_ck CHECK ((total_units >= 0))
);


--
-- Name: ranking_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ranking_snapshots ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ranking_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: report_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_activities (
    report_id bigint NOT NULL,
    activity_id bigint NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_highlighted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: report_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_exports (
    id bigint NOT NULL,
    report_id bigint NOT NULL,
    file_id bigint NOT NULL,
    export_format character varying(10) NOT NULL,
    exported_by_account_id bigint NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_exports_export_format_ck CHECK (((export_format)::text = ANY (ARRAY[('DOCX'::character varying)::text, ('PDF'::character varying)::text, ('XLSX'::character varying)::text])))
);


--
-- Name: report_exports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.report_exports ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.report_exports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    report_type character varying(20) NOT NULL,
    period_year smallint NOT NULL,
    period_number smallint,
    period_start date NOT NULL,
    period_end date NOT NULL,
    content text,
    ai_draft_content text,
    ai_model character varying(100),
    ai_generated_at timestamp with time zone,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_by_account_id bigint NOT NULL,
    finalized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT reports_period_number_ck CHECK (((((report_type)::text = 'MONTHLY'::text) AND (period_number IS NOT NULL) AND ((period_number >= 1) AND (period_number <= 12))) OR (((report_type)::text = 'QUARTERLY'::text) AND (period_number IS NOT NULL) AND ((period_number >= 1) AND (period_number <= 4))) OR (((report_type)::text = ANY (ARRAY[('ANNUAL'::character varying)::text, ('CUSTOM'::character varying)::text])) AND (period_number IS NULL)))),
    CONSTRAINT reports_period_range_ck CHECK ((period_end >= period_start)),
    CONSTRAINT reports_period_year_ck CHECK (((period_year >= 2020) AND (period_year <= 2100))),
    CONSTRAINT reports_report_type_ck CHECK (((report_type)::text = ANY (ARRAY[('MONTHLY'::character varying)::text, ('QUARTERLY'::character varying)::text, ('ANNUAL'::character varying)::text, ('CUSTOM'::character varying)::text]))),
    CONSTRAINT reports_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('FINALIZED'::character varying)::text])))
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reports ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: resource_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_types (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    short_name character varying(100)
);


--
-- Name: resource_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.resource_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.resource_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id bigint NOT NULL,
    resource_type_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    file_id bigint,
    thumbnail_file_id bigint,
    source_document_id bigint,
    is_public boolean DEFAULT true NOT NULL,
    download_count integer DEFAULT 0 NOT NULL,
    published_by_org_unit_id bigint NOT NULL,
    published_at timestamp with time zone,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    file_name character varying(255),
    file_size_kb integer DEFAULT 0 NOT NULL,
    video_url character varying(500),
    submitted_by_account_id bigint,
    file_data_url text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    contributor_name character varying(255),
    CONSTRAINT resources_download_count_ck CHECK ((download_count >= 0)),
    CONSTRAINT resources_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PUBLISHED'::character varying)::text, ('ARCHIVED'::character varying)::text])))
);


--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.resources ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.resources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id bigint NOT NULL,
    filename character varying(200) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.schema_migrations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.schema_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: school_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_types (
    id bigint NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(150) NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.school_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.school_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scores (
    id bigint NOT NULL,
    criteria_set_id bigint NOT NULL,
    task_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    points numeric(6,2) NOT NULL,
    max_points numeric(6,2) NOT NULL,
    scoring_method character varying(30) NOT NULL,
    note text,
    scored_by_account_id bigint,
    scored_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metric_id bigint,
    CONSTRAINT scores_points_range_ck CHECK (((points >= (0)::numeric) AND (points <= max_points)))
);


--
-- Name: scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scores ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    setting_key character varying(100) NOT NULL,
    value text,
    value_type character varying(10) DEFAULT 'STRING'::character varying NOT NULL,
    group_name character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_settings_value_type_ck CHECK (((value_type)::text = ANY (ARRAY[('STRING'::character varying)::text, ('NUMBER'::character varying)::text, ('BOOLEAN'::character varying)::text, ('JSON'::character varying)::text])))
);


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id bigint NOT NULL,
    task_id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    assigned_by_org_unit_id bigint NOT NULL,
    parent_assignment_id bigint,
    due_date date,
    progress_status character varying(20) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    confirm_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    completion_rate numeric(5,2) DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    confirmed_by_account_id bigint,
    note text,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT task_assignments_completion_rate_ck CHECK (((completion_rate >= (0)::numeric) AND (completion_rate <= (100)::numeric))),
    CONSTRAINT task_assignments_confirm_status_ck CHECK (((confirm_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('CONFIRMED'::character varying)::text, ('NEEDS_INFO'::character varying)::text, ('REJECTED'::character varying)::text]))),
    CONSTRAINT task_assignments_not_own_parent_ck CHECK ((parent_assignment_id <> id)),
    CONSTRAINT task_assignments_progress_status_ck CHECK (((progress_status)::text = ANY (ARRAY[('NOT_STARTED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('OVERDUE'::character varying)::text])))
);


--
-- Name: task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.task_assignments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.task_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: task_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_metrics (
    id bigint NOT NULL,
    task_id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name text NOT NULL,
    unit_of_measure character varying(50) NOT NULL,
    aggregation_type character varying(20) NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    max_points numeric,
    scoring_ladder text,
    requirement text,
    evidence text,
    period character varying(50),
    dept character varying(120),
    CONSTRAINT task_metrics_aggregation_type_ck CHECK (((aggregation_type)::text = ANY (ARRAY[('SUM'::character varying)::text, ('COUNT'::character varying)::text, ('AVG'::character varying)::text, ('MAX'::character varying)::text, ('PERCENT'::character varying)::text])))
);


--
-- Name: task_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.task_metrics ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.task_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: task_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_results (
    id bigint NOT NULL,
    task_assignment_id bigint NOT NULL,
    assignment_target_id bigint,
    reported_value numeric(14,2),
    report_note text,
    data_source character varying(20) DEFAULT 'MANUAL'::character varying NOT NULL,
    reported_by_account_id bigint NOT NULL,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_results_data_source_ck CHECK (((data_source)::text = ANY (ARRAY[('MANUAL'::character varying)::text, ('AUTO_AGGREGATE'::character varying)::text])))
);


--
-- Name: task_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.task_results ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.task_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id bigint NOT NULL,
    criteria_set_id bigint,
    parent_task_id bigint,
    code character varying(50),
    title character varying(500) NOT NULL,
    description text,
    task_kind character varying(20) NOT NULL,
    max_points numeric(6,2),
    requirement text,
    tracking_method text,
    scoring_method character varying(30) NOT NULL,
    due_date date,
    created_by_org_unit_id bigint NOT NULL,
    responsible_dept character varying(255),
    target_org_level smallint,
    display_order smallint DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT tasks_max_points_ck CHECK ((max_points >= (0)::numeric)),
    CONSTRAINT tasks_not_own_parent_ck CHECK ((parent_task_id <> id)),
    CONSTRAINT tasks_scoring_method_ck CHECK (((scoring_method)::text = ANY (ARRAY[('AUTO_AGGREGATE'::character varying)::text, ('MANUAL_CONFIRM'::character varying)::text, ('EXPERT_REVIEW'::character varying)::text, ('OTHER'::character varying)::text]))),
    CONSTRAINT tasks_status_ck CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PUBLISHED'::character varying)::text, ('CLOSED'::character varying)::text]))),
    CONSTRAINT tasks_target_org_level_ck CHECK (((target_org_level >= 1) AND (target_org_level <= 4))),
    CONSTRAINT tasks_task_kind_ck CHECK (((task_kind)::text = ANY (ARRAY[('TASK'::character varying)::text, ('CRITERION'::character varying)::text])))
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tasks ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: volunteer_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volunteer_projects (
    id bigint NOT NULL,
    org_unit_id bigint NOT NULL,
    school_name character varying(255) NOT NULL,
    province character varying(100) NOT NULL,
    project_name character varying(255) NOT NULL,
    summary text NOT NULL,
    beneficiaries character varying(500),
    participants integer DEFAULT 0 NOT NULL,
    status character varying(10) DEFAULT 'PENDING'::character varying NOT NULL,
    submitted_by_account_id bigint,
    map_x numeric(5,2),
    map_y numeric(5,2),
    ai_verdict character varying(10),
    ai_reason text,
    moderated_by_account_id bigint,
    moderated_at timestamp with time zone,
    rejection_reason text,
    report_file_name character varying(255),
    report_file_data text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    field character varying(20) DEFAULT 'KHAC'::character varying NOT NULL,
    phase character varying(20) DEFAULT 'DANG_TRIEN_KHAI'::character varying NOT NULL,
    CONSTRAINT volunteer_projects_ai_verdict_check CHECK (((ai_verdict)::text = ANY ((ARRAY['CLEAN'::character varying, 'FLAGGED'::character varying])::text[]))),
    CONSTRAINT volunteer_projects_field_check CHECK (((field)::text = ANY ((ARRAY['MOI_TRUONG'::character varying, 'GIAO_DUC'::character varying, 'AN_SINH'::character varying, 'Y_TE'::character varying, 'VAN_HOA'::character varying, 'KHAC'::character varying])::text[]))),
    CONSTRAINT volunteer_projects_participants_check CHECK ((participants >= 0)),
    CONSTRAINT volunteer_projects_phase_check CHECK (((phase)::text = ANY ((ARRAY['DANG_TUYEN'::character varying, 'DANG_TRIEN_KHAI'::character varying, 'HOAN_THANH'::character varying])::text[]))),
    CONSTRAINT volunteer_projects_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: volunteer_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.volunteer_projects ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.volunteer_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_logs_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_default DEFAULT;


--
-- Name: audit_logs_y2026m09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2026m09 FOR VALUES FROM ('2026-09-01 07:00:00+07') TO ('2026-10-01 07:00:00+07');


--
-- Name: audit_logs_y2026m10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2026m10 FOR VALUES FROM ('2026-10-01 07:00:00+07') TO ('2026-11-01 07:00:00+07');


--
-- Name: audit_logs_y2026m11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2026m11 FOR VALUES FROM ('2026-11-01 07:00:00+07') TO ('2026-12-01 07:00:00+07');


--
-- Name: audit_logs_y2026m12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2026m12 FOR VALUES FROM ('2026-12-01 07:00:00+07') TO ('2027-01-01 07:00:00+07');


--
-- Name: audit_logs_y2027m01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2027m01 FOR VALUES FROM ('2027-01-01 07:00:00+07') TO ('2027-02-01 07:00:00+07');


--
-- Name: post_views_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_default DEFAULT;


--
-- Name: post_views_y2026m09; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_y2026m09 FOR VALUES FROM ('2026-09-01 07:00:00+07') TO ('2026-10-01 07:00:00+07');


--
-- Name: post_views_y2026m10; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_y2026m10 FOR VALUES FROM ('2026-10-01 07:00:00+07') TO ('2026-11-01 07:00:00+07');


--
-- Name: post_views_y2026m11; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_y2026m11 FOR VALUES FROM ('2026-11-01 07:00:00+07') TO ('2026-12-01 07:00:00+07');


--
-- Name: post_views_y2026m12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_y2026m12 FOR VALUES FROM ('2026-12-01 07:00:00+07') TO ('2027-01-01 07:00:00+07');


--
-- Name: post_views_y2027m01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ATTACH PARTITION public.post_views_y2027m01 FOR VALUES FROM ('2027-01-01 07:00:00+07') TO ('2027-02-01 07:00:00+07');


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: chuc_danh id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_danh ALTER COLUMN id SET DEFAULT nextval('public.chuc_danh_id_seq'::regclass);


--
-- Name: password_reset_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes ALTER COLUMN id SET DEFAULT nextval('public.password_reset_codes_id_seq'::regclass);


--
-- Name: post_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ALTER COLUMN id SET DEFAULT nextval('public.post_views_id_seq'::regclass);


--
-- Name: account_permissions account_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_permissions
    ADD CONSTRAINT account_permissions_pkey PRIMARY KEY (account_id, perm_code);


--
-- Name: account_roles account_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_roles
    ADD CONSTRAINT account_roles_pkey PRIMARY KEY (account_id, role_id);


--
-- Name: accounts accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_username_key UNIQUE (username);


--
-- Name: activities activities_id_org_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_id_org_unit_id_key UNIQUE (id, org_unit_id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_categories activity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_pkey PRIMARY KEY (activity_id, content_category_id);


--
-- Name: activity_files activity_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_files
    ADD CONSTRAINT activity_files_pkey PRIMARY KEY (activity_id, file_id);


--
-- Name: activity_links activity_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_links
    ADD CONSTRAINT activity_links_pkey PRIMARY KEY (id);


--
-- Name: activity_task_links activity_task_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_task_links
    ADD CONSTRAINT activity_task_links_pkey PRIMARY KEY (activity_id, task_assignment_id);


--
-- Name: admin_units admin_units_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_units
    ADD CONSTRAINT admin_units_code_key UNIQUE (code);


--
-- Name: admin_units admin_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_units
    ADD CONSTRAINT admin_units_pkey PRIMARY KEY (id);


--
-- Name: assignment_reviews assignment_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_reviews
    ADD CONSTRAINT assignment_reviews_pkey PRIMARY KEY (id);


--
-- Name: assignment_targets assignment_targets_assignment_metric_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT assignment_targets_assignment_metric_key UNIQUE (task_assignment_id, task_metric_id);


--
-- Name: assignment_targets assignment_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT assignment_targets_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_default audit_logs_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_default
    ADD CONSTRAINT audit_logs_default_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_y2026m09 audit_logs_y2026m09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_y2026m09
    ADD CONSTRAINT audit_logs_y2026m09_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_y2026m10 audit_logs_y2026m10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_y2026m10
    ADD CONSTRAINT audit_logs_y2026m10_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_y2026m11 audit_logs_y2026m11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_y2026m11
    ADD CONSTRAINT audit_logs_y2026m11_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_y2026m12 audit_logs_y2026m12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_y2026m12
    ADD CONSTRAINT audit_logs_y2026m12_pkey PRIMARY KEY (id, created_at);


--
-- Name: audit_logs_y2027m01 audit_logs_y2027m01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs_y2027m01
    ADD CONSTRAINT audit_logs_y2027m01_pkey PRIMARY KEY (id, created_at);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: chuc_danh chuc_danh_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_danh
    ADD CONSTRAINT chuc_danh_name_key UNIQUE (name);


--
-- Name: chuc_danh chuc_danh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chuc_danh
    ADD CONSTRAINT chuc_danh_pkey PRIMARY KEY (id);


--
-- Name: content_categories content_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_categories
    ADD CONSTRAINT content_categories_code_key UNIQUE (code);


--
-- Name: content_categories content_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_categories
    ADD CONSTRAINT content_categories_pkey PRIMARY KEY (id);


--
-- Name: contribution_logs contribution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_logs
    ADD CONSTRAINT contribution_logs_pkey PRIMARY KEY (id);


--
-- Name: criteria_sets criteria_sets_owner_year_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria_sets
    ADD CONSTRAINT criteria_sets_owner_year_code_key UNIQUE (owner_org_unit_id, year, code);


--
-- Name: criteria_sets criteria_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria_sets
    ADD CONSTRAINT criteria_sets_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_code_key UNIQUE (code);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: document_files document_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT document_files_pkey PRIMARY KEY (document_id, file_id);


--
-- Name: document_recipients document_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_recipients
    ADD CONSTRAINT document_recipients_pkey PRIMARY KEY (document_id, org_unit_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: feedback_messages feedback_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_pkey PRIMARY KEY (id);


--
-- Name: feedback_topics feedback_topics_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_topics
    ADD CONSTRAINT feedback_topics_code_key UNIQUE (code);


--
-- Name: feedback_topics feedback_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_topics
    ADD CONSTRAINT feedback_topics_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_tracking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_tracking_code_key UNIQUE (tracking_code);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- Name: forum_threads forum_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_threads
    ADD CONSTRAINT forum_threads_pkey PRIMARY KEY (id);


--
-- Name: hs3t_achievements hs3t_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_achievements
    ADD CONSTRAINT hs3t_achievements_pkey PRIMARY KEY (id);


--
-- Name: hs3t_profiles hs3t_profiles_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_account_id_key UNIQUE (account_id);


--
-- Name: hs3t_profiles hs3t_profiles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_code_key UNIQUE (code);


--
-- Name: hs3t_profiles hs3t_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_pkey PRIMARY KEY (id);


--
-- Name: hs3t_unit_standards hs3t_unit_standards_org_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_unit_standards
    ADD CONSTRAINT hs3t_unit_standards_org_unit_id_key UNIQUE (org_unit_id);


--
-- Name: hs3t_unit_standards hs3t_unit_standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_unit_standards
    ADD CONSTRAINT hs3t_unit_standards_pkey PRIMARY KEY (id);


--
-- Name: live_events live_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_events
    ADD CONSTRAINT live_events_pkey PRIMARY KEY (id);


--
-- Name: media_files media_files_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_path_key UNIQUE (path);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: member_contributions member_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_contributions
    ADD CONSTRAINT member_contributions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: org_directory org_directory_org_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_directory
    ADD CONSTRAINT org_directory_org_unit_id_key UNIQUE (org_unit_id);


--
-- Name: org_directory org_directory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_directory
    ADD CONSTRAINT org_directory_pkey PRIMARY KEY (id);


--
-- Name: org_units org_units_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_code_key UNIQUE (code);


--
-- Name: org_units org_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: post_view_daily post_view_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_view_daily
    ADD CONSTRAINT post_view_daily_pkey PRIMARY KEY (post_id, view_date);


--
-- Name: post_views post_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_default post_views_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_default
    ADD CONSTRAINT post_views_default_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_y2026m09 post_views_y2026m09_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_y2026m09
    ADD CONSTRAINT post_views_y2026m09_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_y2026m10 post_views_y2026m10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_y2026m10
    ADD CONSTRAINT post_views_y2026m10_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_y2026m11 post_views_y2026m11_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_y2026m11
    ADD CONSTRAINT post_views_y2026m11_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_y2026m12 post_views_y2026m12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_y2026m12
    ADD CONSTRAINT post_views_y2026m12_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: post_views_y2027m01 post_views_y2027m01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views_y2027m01
    ADD CONSTRAINT post_views_y2027m01_pkey PRIMARY KEY (id, viewed_at);


--
-- Name: published_posts published_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_pkey PRIMARY KEY (id);


--
-- Name: published_posts published_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_slug_key UNIQUE (slug);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_exams quiz_exams_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_exams
    ADD CONSTRAINT quiz_exams_code_key UNIQUE (code);


--
-- Name: quiz_exams quiz_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_exams
    ADD CONSTRAINT quiz_exams_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: ranking_entries ranking_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT ranking_entries_pkey PRIMARY KEY (id);


--
-- Name: ranking_entries ranking_entries_snapshot_org_unit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT ranking_entries_snapshot_org_unit_key UNIQUE (snapshot_id, org_unit_id);


--
-- Name: ranking_snapshots ranking_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshots
    ADD CONSTRAINT ranking_snapshots_pkey PRIMARY KEY (id);


--
-- Name: report_activities report_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activities
    ADD CONSTRAINT report_activities_pkey PRIMARY KEY (report_id, activity_id);


--
-- Name: report_exports report_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: resource_types resource_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_types
    ADD CONSTRAINT resource_types_code_key UNIQUE (code);


--
-- Name: resource_types resource_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_types
    ADD CONSTRAINT resource_types_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: school_types school_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_types
    ADD CONSTRAINT school_types_code_key UNIQUE (code);


--
-- Name: school_types school_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_types
    ADD CONSTRAINT school_types_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: scores scores_set_task_org_unit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_set_task_org_unit_key UNIQUE (criteria_set_id, task_id, org_unit_id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: task_assignments task_assignments_id_org_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_id_org_unit_id_key UNIQUE (id, org_unit_id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_task_org_unit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_org_unit_key UNIQUE (task_id, org_unit_id);


--
-- Name: task_metrics task_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_metrics
    ADD CONSTRAINT task_metrics_pkey PRIMARY KEY (id);


--
-- Name: task_metrics task_metrics_task_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_metrics
    ADD CONSTRAINT task_metrics_task_code_key UNIQUE (task_id, code);


--
-- Name: task_results task_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_results
    ADD CONSTRAINT task_results_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: volunteer_projects volunteer_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_projects
    ADD CONSTRAINT volunteer_projects_pkey PRIMARY KEY (id);


--
-- Name: account_permissions_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_permissions_account_idx ON public.account_permissions USING btree (account_id);


--
-- Name: account_roles_granted_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_roles_granted_by_account_id_idx ON public.account_roles USING btree (granted_by_account_id);


--
-- Name: account_roles_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_roles_role_id_idx ON public.account_roles USING btree (role_id);


--
-- Name: accounts_role_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_code_idx ON public.accounts USING btree (role_code);


--
-- Name: activities_confirm_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_confirm_status_idx ON public.activities USING btree (confirm_status) WHERE (deleted_at IS NULL);


--
-- Name: activities_created_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_created_by_account_id_idx ON public.activities USING btree (created_by_account_id);


--
-- Name: activities_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_org_unit_id_idx ON public.activities USING btree (org_unit_id);


--
-- Name: activities_org_unit_start_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_org_unit_start_date_idx ON public.activities USING btree (org_unit_id, start_date DESC) WHERE (deleted_at IS NULL);


--
-- Name: activities_search_vector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_search_vector_idx ON public.activities USING gin (search_vector);


--
-- Name: activities_updated_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_updated_by_account_id_idx ON public.activities USING btree (updated_by_account_id);


--
-- Name: activity_categories_content_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_categories_content_category_id_idx ON public.activity_categories USING btree (content_category_id);


--
-- Name: activity_files_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_files_file_id_idx ON public.activity_files USING btree (file_id);


--
-- Name: activity_links_activity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_links_activity_id_idx ON public.activity_links USING btree (activity_id);


--
-- Name: activity_task_links_activity_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_task_links_activity_org_idx ON public.activity_task_links USING btree (activity_id, org_unit_id);


--
-- Name: activity_task_links_assignment_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_task_links_assignment_org_idx ON public.activity_task_links USING btree (task_assignment_id, org_unit_id);


--
-- Name: admin_units_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_units_parent_id_idx ON public.admin_units USING btree (parent_id);


--
-- Name: assignment_reviews_assignment_reviewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignment_reviews_assignment_reviewed_at_idx ON public.assignment_reviews USING btree (task_assignment_id, reviewed_at DESC);


--
-- Name: assignment_reviews_reviewer_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignment_reviews_reviewer_account_id_idx ON public.assignment_reviews USING btree (reviewer_account_id);


--
-- Name: assignment_targets_task_metric_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignment_targets_task_metric_id_idx ON public.assignment_targets USING btree (task_metric_id);


--
-- Name: attendances_activity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendances_activity_idx ON public.attendances USING btree (activity_id);


--
-- Name: audit_logs_account_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_account_created_idx ON ONLY public.audit_logs USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_default_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_default_account_id_created_at_idx ON public.audit_logs_default USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_idx ON ONLY public.audit_logs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_default_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_default_entity_type_entity_id_created_at_idx ON public.audit_logs_default USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_y2026m09_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m09_account_id_created_at_idx ON public.audit_logs_y2026m09 USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_y2026m09_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m09_entity_type_entity_id_created_at_idx ON public.audit_logs_y2026m09 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_y2026m10_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m10_account_id_created_at_idx ON public.audit_logs_y2026m10 USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_y2026m10_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m10_entity_type_entity_id_created_at_idx ON public.audit_logs_y2026m10 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_y2026m11_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m11_account_id_created_at_idx ON public.audit_logs_y2026m11 USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_y2026m11_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m11_entity_type_entity_id_created_at_idx ON public.audit_logs_y2026m11 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_y2026m12_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m12_account_id_created_at_idx ON public.audit_logs_y2026m12 USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_y2026m12_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2026m12_entity_type_entity_id_created_at_idx ON public.audit_logs_y2026m12 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_logs_y2027m01_account_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2027m01_account_id_created_at_idx ON public.audit_logs_y2027m01 USING btree (account_id, created_at DESC);


--
-- Name: audit_logs_y2027m01_entity_type_entity_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_y2027m01_entity_type_entity_id_created_at_idx ON public.audit_logs_y2027m01 USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: auth_sessions_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_account_id_idx ON public.auth_sessions USING btree (account_id);


--
-- Name: content_categories_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_categories_parent_id_idx ON public.content_categories USING btree (parent_id);


--
-- Name: contribution_logs_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contribution_logs_account_idx ON public.contribution_logs USING btree (account_id, created_at DESC);


--
-- Name: document_files_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_files_file_id_idx ON public.document_files USING btree (file_id);


--
-- Name: document_recipients_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_recipients_org_unit_id_idx ON public.document_recipients USING btree (org_unit_id);


--
-- Name: document_recipients_org_unit_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_recipients_org_unit_unread_idx ON public.document_recipients USING btree (org_unit_id) WHERE (read_at IS NULL);


--
-- Name: documents_created_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_created_by_account_id_idx ON public.documents USING btree (created_by_account_id);


--
-- Name: documents_document_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_document_category_id_idx ON public.documents USING btree (document_category_id);


--
-- Name: documents_issuing_org_issued_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_issuing_org_issued_idx ON public.documents USING btree (issuing_org_unit_id, issued_date DESC);


--
-- Name: email_logs_feedback_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_feedback_idx ON public.email_logs USING btree (feedback_id);


--
-- Name: feedback_messages_feedback_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_messages_feedback_created_idx ON public.feedback_messages USING btree (feedback_id, created_at);


--
-- Name: feedback_messages_sender_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_messages_sender_account_id_idx ON public.feedback_messages USING btree (sender_account_id);


--
-- Name: feedbacks_assigned_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedbacks_assigned_account_id_idx ON public.feedbacks USING btree (assigned_account_id);


--
-- Name: feedbacks_feedback_topic_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedbacks_feedback_topic_id_idx ON public.feedbacks USING btree (feedback_topic_id);


--
-- Name: feedbacks_ip_submitted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedbacks_ip_submitted_idx ON public.feedbacks USING btree (ip_address, submitted_at DESC);


--
-- Name: feedbacks_sender_admin_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedbacks_sender_admin_unit_id_idx ON public.feedbacks USING btree (sender_admin_unit_id);


--
-- Name: feedbacks_status_submitted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedbacks_status_submitted_idx ON public.feedbacks USING btree (status, submitted_at DESC);


--
-- Name: files_checksum_sha256_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX files_checksum_sha256_idx ON public.files USING btree (checksum_sha256);


--
-- Name: files_uploaded_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX files_uploaded_by_account_id_idx ON public.files USING btree (uploaded_by_account_id);


--
-- Name: forum_comments_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forum_comments_author_idx ON public.forum_comments USING btree (author_account_id);


--
-- Name: forum_comments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forum_comments_status_idx ON public.forum_comments USING btree (status);


--
-- Name: forum_comments_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forum_comments_thread_idx ON public.forum_comments USING btree (thread_id, created_at);


--
-- Name: forum_threads_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forum_threads_author_idx ON public.forum_threads USING btree (author_account_id);


--
-- Name: forum_threads_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forum_threads_status_idx ON public.forum_threads USING btree (status, created_at DESC);


--
-- Name: hs3t_achievements_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs3t_achievements_category_idx ON public.hs3t_achievements USING btree (category);


--
-- Name: hs3t_achievements_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs3t_achievements_profile_idx ON public.hs3t_achievements USING btree (profile_id);


--
-- Name: hs3t_profiles_school_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs3t_profiles_school_idx ON public.hs3t_profiles USING btree (school_org_unit_id);


--
-- Name: live_events_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_events_created_idx ON public.live_events USING btree (created_at DESC);


--
-- Name: live_events_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX live_events_org_idx ON public.live_events USING btree (org_unit_id);


--
-- Name: media_files_sha256_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_files_sha256_kind_idx ON public.media_files USING btree (sha256, kind);


--
-- Name: member_contributions_contributor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_contributions_contributor_idx ON public.member_contributions USING btree (contributor_account_id);


--
-- Name: member_contributions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_contributions_status_idx ON public.member_contributions USING btree (status);


--
-- Name: notifications_email_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_email_pending_idx ON public.notifications USING btree (email_status) WHERE ((email_status)::text = 'PENDING'::text);


--
-- Name: notifications_recipient_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_created_idx ON public.notifications USING btree (recipient_account_id, created_at DESC);


--
-- Name: notifications_recipient_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_unread_idx ON public.notifications USING btree (recipient_account_id) WHERE (NOT is_read);


--
-- Name: org_units_admin_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_units_admin_unit_id_idx ON public.org_units USING btree (admin_unit_id);


--
-- Name: org_units_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_units_name_trgm_idx ON public.org_units USING gin (public.immutable_unaccent((name)::text) public.gin_trgm_ops);


--
-- Name: org_units_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_units_parent_id_idx ON public.org_units USING btree (parent_id);


--
-- Name: org_units_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_units_path_idx ON public.org_units USING btree (path varchar_pattern_ops);


--
-- Name: org_units_school_type_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_units_school_type_id_idx ON public.org_units USING btree (school_type_id);


--
-- Name: password_reset_codes_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_codes_account_idx ON public.password_reset_codes USING btree (account_id, created_at DESC);


--
-- Name: post_view_daily_view_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_view_daily_view_date_idx ON public.post_view_daily USING btree (view_date);


--
-- Name: post_views_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_post_id_viewed_at_idx ON ONLY public.post_views USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_default_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_default_post_id_viewed_at_idx ON public.post_views_default USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_y2026m09_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_y2026m09_post_id_viewed_at_idx ON public.post_views_y2026m09 USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_y2026m10_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_y2026m10_post_id_viewed_at_idx ON public.post_views_y2026m10 USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_y2026m11_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_y2026m11_post_id_viewed_at_idx ON public.post_views_y2026m11 USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_y2026m12_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_y2026m12_post_id_viewed_at_idx ON public.post_views_y2026m12 USING btree (post_id, viewed_at DESC);


--
-- Name: post_views_y2027m01_post_id_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_views_y2027m01_post_id_viewed_at_idx ON public.post_views_y2027m01 USING btree (post_id, viewed_at DESC);


--
-- Name: published_posts_activity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_activity_id_idx ON public.published_posts USING btree (activity_id);


--
-- Name: published_posts_activity_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX published_posts_activity_id_key ON public.published_posts USING btree (activity_id) WHERE ((activity_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: published_posts_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_author_idx ON public.published_posts USING btree (author_org_unit_id);


--
-- Name: published_posts_contributor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_contributor_idx ON public.published_posts USING btree (contributor_account_id);


--
-- Name: published_posts_cover_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_cover_file_id_idx ON public.published_posts USING btree (cover_file_id);


--
-- Name: published_posts_editor_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_editor_account_id_idx ON public.published_posts USING btree (editor_account_id);


--
-- Name: published_posts_status_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX published_posts_status_published_at_idx ON public.published_posts USING btree (status, published_at DESC);


--
-- Name: quiz_attempts_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_attempts_account_idx ON public.quiz_attempts USING btree (account_id);


--
-- Name: quiz_attempts_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_attempts_exam_idx ON public.quiz_attempts USING btree (exam_id);


--
-- Name: quiz_questions_difficulty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_questions_difficulty_idx ON public.quiz_questions USING btree (difficulty);


--
-- Name: quiz_questions_topic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_questions_topic_idx ON public.quiz_questions USING btree (topic);


--
-- Name: ranking_entries_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_entries_org_unit_id_idx ON public.ranking_entries USING btree (org_unit_id);


--
-- Name: ranking_entries_snapshot_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_entries_snapshot_rank_idx ON public.ranking_entries USING btree (snapshot_id, rank_position);


--
-- Name: ranking_snapshots_criteria_set_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_snapshots_criteria_set_id_idx ON public.ranking_snapshots USING btree (criteria_set_id);


--
-- Name: ranking_snapshots_generated_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_snapshots_generated_by_account_id_idx ON public.ranking_snapshots USING btree (generated_by_account_id);


--
-- Name: ranking_snapshots_scope_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranking_snapshots_scope_period_idx ON public.ranking_snapshots USING btree (scope_org_unit_id, period_start DESC);


--
-- Name: report_activities_activity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_activities_activity_id_idx ON public.report_activities USING btree (activity_id);


--
-- Name: report_exports_exported_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_exports_exported_by_account_id_idx ON public.report_exports USING btree (exported_by_account_id);


--
-- Name: report_exports_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_exports_file_id_idx ON public.report_exports USING btree (file_id);


--
-- Name: report_exports_report_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_exports_report_id_idx ON public.report_exports USING btree (report_id);


--
-- Name: reports_created_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_created_by_account_id_idx ON public.reports USING btree (created_by_account_id);


--
-- Name: reports_org_unit_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_org_unit_period_idx ON public.reports USING btree (org_unit_id, period_year DESC, period_number);


--
-- Name: resources_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_file_id_idx ON public.resources USING btree (file_id);


--
-- Name: resources_published_by_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_published_by_org_unit_id_idx ON public.resources USING btree (published_by_org_unit_id);


--
-- Name: resources_source_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_source_document_id_idx ON public.resources USING btree (source_document_id);


--
-- Name: resources_thumbnail_file_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_thumbnail_file_id_idx ON public.resources USING btree (thumbnail_file_id);


--
-- Name: resources_type_status_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_type_status_published_idx ON public.resources USING btree (resource_type_id, status, published_at DESC);


--
-- Name: role_permissions_permission_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_permissions_permission_id_idx ON public.role_permissions USING btree (permission_id);


--
-- Name: scores_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scores_org_unit_id_idx ON public.scores USING btree (org_unit_id);


--
-- Name: scores_scored_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scores_scored_by_account_id_idx ON public.scores USING btree (scored_by_account_id);


--
-- Name: scores_task_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scores_task_id_idx ON public.scores USING btree (task_id);


--
-- Name: task_assignments_assigned_by_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_assigned_by_org_unit_id_idx ON public.task_assignments USING btree (assigned_by_org_unit_id);


--
-- Name: task_assignments_confirmed_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_confirmed_by_account_id_idx ON public.task_assignments USING btree (confirmed_by_account_id);


--
-- Name: task_assignments_due_date_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_due_date_open_idx ON public.task_assignments USING btree (due_date) WHERE (((progress_status)::text <> 'COMPLETED'::text) AND (deleted_at IS NULL));


--
-- Name: task_assignments_org_unit_progress_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_org_unit_progress_idx ON public.task_assignments USING btree (org_unit_id, progress_status);


--
-- Name: task_assignments_parent_assignment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_parent_assignment_id_idx ON public.task_assignments USING btree (parent_assignment_id);


--
-- Name: task_results_assignment_reported_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_results_assignment_reported_at_idx ON public.task_results USING btree (task_assignment_id, reported_at DESC);


--
-- Name: task_results_assignment_target_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_results_assignment_target_id_idx ON public.task_results USING btree (assignment_target_id);


--
-- Name: task_results_reported_by_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_results_reported_by_account_id_idx ON public.task_results USING btree (reported_by_account_id);


--
-- Name: tasks_created_by_org_unit_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_created_by_org_unit_id_idx ON public.tasks USING btree (created_by_org_unit_id);


--
-- Name: tasks_criteria_set_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_criteria_set_id_idx ON public.tasks USING btree (criteria_set_id);


--
-- Name: tasks_parent_task_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_parent_task_id_idx ON public.tasks USING btree (parent_task_id);


--
-- Name: volunteer_projects_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteer_projects_org_idx ON public.volunteer_projects USING btree (org_unit_id);


--
-- Name: volunteer_projects_province_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteer_projects_province_idx ON public.volunteer_projects USING btree (province);


--
-- Name: volunteer_projects_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteer_projects_status_idx ON public.volunteer_projects USING btree (status);


--
-- Name: audit_logs_default_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_default_account_id_created_at_idx;


--
-- Name: audit_logs_default_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_default_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_default_pkey;


--
-- Name: audit_logs_y2026m09_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_y2026m09_account_id_created_at_idx;


--
-- Name: audit_logs_y2026m09_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_y2026m09_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_y2026m09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2026m09_pkey;


--
-- Name: audit_logs_y2026m10_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_y2026m10_account_id_created_at_idx;


--
-- Name: audit_logs_y2026m10_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_y2026m10_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_y2026m10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2026m10_pkey;


--
-- Name: audit_logs_y2026m11_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_y2026m11_account_id_created_at_idx;


--
-- Name: audit_logs_y2026m11_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_y2026m11_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_y2026m11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2026m11_pkey;


--
-- Name: audit_logs_y2026m12_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_y2026m12_account_id_created_at_idx;


--
-- Name: audit_logs_y2026m12_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_y2026m12_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_y2026m12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2026m12_pkey;


--
-- Name: audit_logs_y2027m01_account_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_account_created_idx ATTACH PARTITION public.audit_logs_y2027m01_account_id_created_at_idx;


--
-- Name: audit_logs_y2027m01_entity_type_entity_id_created_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_entity_idx ATTACH PARTITION public.audit_logs_y2027m01_entity_type_entity_id_created_at_idx;


--
-- Name: audit_logs_y2027m01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2027m01_pkey;


--
-- Name: post_views_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_default_pkey;


--
-- Name: post_views_default_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_default_post_id_viewed_at_idx;


--
-- Name: post_views_y2026m09_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_y2026m09_pkey;


--
-- Name: post_views_y2026m09_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_y2026m09_post_id_viewed_at_idx;


--
-- Name: post_views_y2026m10_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_y2026m10_pkey;


--
-- Name: post_views_y2026m10_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_y2026m10_post_id_viewed_at_idx;


--
-- Name: post_views_y2026m11_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_y2026m11_pkey;


--
-- Name: post_views_y2026m11_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_y2026m11_post_id_viewed_at_idx;


--
-- Name: post_views_y2026m12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_y2026m12_pkey;


--
-- Name: post_views_y2026m12_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_y2026m12_post_id_viewed_at_idx;


--
-- Name: post_views_y2027m01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_pkey ATTACH PARTITION public.post_views_y2027m01_pkey;


--
-- Name: post_views_y2027m01_post_id_viewed_at_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.post_views_post_id_viewed_at_idx ATTACH PARTITION public.post_views_y2027m01_post_id_viewed_at_idx;


--
-- Name: accounts accounts_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounts_set_updated_at_trg BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activities activities_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activities_set_updated_at_trg BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_links activity_links_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_links_set_updated_at_trg BEFORE UPDATE ON public.activity_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admin_units admin_units_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admin_units_set_updated_at_trg BEFORE UPDATE ON public.admin_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assignment_targets assignment_targets_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assignment_targets_set_updated_at_trg BEFORE UPDATE ON public.assignment_targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: content_categories content_categories_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER content_categories_set_updated_at_trg BEFORE UPDATE ON public.content_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: criteria_sets criteria_sets_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER criteria_sets_set_updated_at_trg BEFORE UPDATE ON public.criteria_sets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: document_categories document_categories_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER document_categories_set_updated_at_trg BEFORE UPDATE ON public.document_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents documents_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER documents_set_updated_at_trg BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feedback_topics feedback_topics_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER feedback_topics_set_updated_at_trg BEFORE UPDATE ON public.feedback_topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: feedbacks feedbacks_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER feedbacks_set_updated_at_trg BEFORE UPDATE ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: files files_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER files_set_updated_at_trg BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: org_units org_units_cascade_path_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER org_units_cascade_path_trg AFTER UPDATE OF parent_id ON public.org_units FOR EACH ROW EXECUTE FUNCTION public.org_units_cascade_path();


--
-- Name: org_units org_units_set_path_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER org_units_set_path_trg BEFORE INSERT OR UPDATE OF parent_id ON public.org_units FOR EACH ROW EXECUTE FUNCTION public.org_units_set_path();


--
-- Name: org_units org_units_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER org_units_set_updated_at_trg BEFORE UPDATE ON public.org_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: permissions permissions_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER permissions_set_updated_at_trg BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: published_posts published_posts_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER published_posts_set_updated_at_trg BEFORE UPDATE ON public.published_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ranking_snapshots ranking_snapshots_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ranking_snapshots_set_updated_at_trg BEFORE UPDATE ON public.ranking_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reports reports_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reports_set_updated_at_trg BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: resource_types resource_types_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER resource_types_set_updated_at_trg BEFORE UPDATE ON public.resource_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: resources resources_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER resources_set_updated_at_trg BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles roles_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER roles_set_updated_at_trg BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: school_types school_types_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER school_types_set_updated_at_trg BEFORE UPDATE ON public.school_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scores scores_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER scores_set_updated_at_trg BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: system_settings system_settings_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER system_settings_set_updated_at_trg BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_assignments task_assignments_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_assignments_set_updated_at_trg BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_metrics task_metrics_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_metrics_set_updated_at_trg BEFORE UPDATE ON public.task_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_results task_results_forbid_update_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_results_forbid_update_trg BEFORE UPDATE ON public.task_results FOR EACH ROW EXECUTE FUNCTION public.task_results_forbid_update();


--
-- Name: tasks tasks_set_updated_at_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_set_updated_at_trg BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: account_permissions account_permissions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_permissions
    ADD CONSTRAINT account_permissions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_permissions account_permissions_granted_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_permissions
    ADD CONSTRAINT account_permissions_granted_by_account_id_fkey FOREIGN KEY (granted_by_account_id) REFERENCES public.accounts(id);


--
-- Name: account_roles account_roles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_roles
    ADD CONSTRAINT account_roles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: account_roles account_roles_granted_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_roles
    ADD CONSTRAINT account_roles_granted_by_account_id_fkey FOREIGN KEY (granted_by_account_id) REFERENCES public.accounts(id);


--
-- Name: account_roles account_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_roles
    ADD CONSTRAINT account_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: activities activities_created_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_account_id_fkey FOREIGN KEY (created_by_account_id) REFERENCES public.accounts(id);


--
-- Name: activities activities_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: activities activities_updated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_updated_by_account_id_fkey FOREIGN KEY (updated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: activity_categories activity_categories_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_categories activity_categories_content_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_content_category_id_fkey FOREIGN KEY (content_category_id) REFERENCES public.content_categories(id);


--
-- Name: activity_files activity_files_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_files
    ADD CONSTRAINT activity_files_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_files activity_files_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_files
    ADD CONSTRAINT activity_files_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: activity_links activity_links_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_links
    ADD CONSTRAINT activity_links_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_task_links activity_task_links_activity_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_task_links
    ADD CONSTRAINT activity_task_links_activity_fk FOREIGN KEY (activity_id, org_unit_id) REFERENCES public.activities(id, org_unit_id) ON DELETE CASCADE;


--
-- Name: activity_task_links activity_task_links_assignment_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_task_links
    ADD CONSTRAINT activity_task_links_assignment_fk FOREIGN KEY (task_assignment_id, org_unit_id) REFERENCES public.task_assignments(id, org_unit_id) ON DELETE CASCADE;


--
-- Name: admin_units admin_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_units
    ADD CONSTRAINT admin_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.admin_units(id);


--
-- Name: assignment_reviews assignment_reviews_reviewer_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_reviews
    ADD CONSTRAINT assignment_reviews_reviewer_account_id_fkey FOREIGN KEY (reviewer_account_id) REFERENCES public.accounts(id);


--
-- Name: assignment_reviews assignment_reviews_task_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_reviews
    ADD CONSTRAINT assignment_reviews_task_assignment_id_fkey FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_targets assignment_targets_task_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT assignment_targets_task_assignment_id_fkey FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_targets assignment_targets_task_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT assignment_targets_task_metric_id_fkey FOREIGN KEY (task_metric_id) REFERENCES public.task_metrics(id);


--
-- Name: attendances attendances_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: attendances attendances_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: audit_logs audit_logs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: auth_sessions auth_sessions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: content_categories content_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_categories
    ADD CONSTRAINT content_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.content_categories(id);


--
-- Name: contribution_logs contribution_logs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_logs
    ADD CONSTRAINT contribution_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: criteria_sets criteria_sets_owner_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria_sets
    ADD CONSTRAINT criteria_sets_owner_org_unit_id_fkey FOREIGN KEY (owner_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: document_files document_files_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT document_files_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_files document_files_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT document_files_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: document_recipients document_recipients_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_recipients
    ADD CONSTRAINT document_recipients_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_recipients document_recipients_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_recipients
    ADD CONSTRAINT document_recipients_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: documents documents_created_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_account_id_fkey FOREIGN KEY (created_by_account_id) REFERENCES public.accounts(id);


--
-- Name: documents documents_document_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_category_id_fkey FOREIGN KEY (document_category_id) REFERENCES public.document_categories(id);


--
-- Name: documents documents_issuing_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_issuing_org_unit_id_fkey FOREIGN KEY (issuing_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: email_logs email_logs_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedbacks(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_sent_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_sent_by_account_id_fkey FOREIGN KEY (sent_by_account_id) REFERENCES public.accounts(id);


--
-- Name: feedback_messages feedback_messages_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedbacks(id) ON DELETE CASCADE;


--
-- Name: feedback_messages feedback_messages_sender_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_sender_account_id_fkey FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id);


--
-- Name: feedbacks feedbacks_assigned_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_assigned_account_id_fkey FOREIGN KEY (assigned_account_id) REFERENCES public.accounts(id);


--
-- Name: feedbacks feedbacks_feedback_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_feedback_topic_id_fkey FOREIGN KEY (feedback_topic_id) REFERENCES public.feedback_topics(id);


--
-- Name: feedbacks feedbacks_sender_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_sender_account_id_fkey FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id);


--
-- Name: feedbacks feedbacks_sender_admin_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_sender_admin_unit_id_fkey FOREIGN KEY (sender_admin_unit_id) REFERENCES public.admin_units(id);


--
-- Name: files files_uploaded_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_account_id_fkey FOREIGN KEY (uploaded_by_account_id) REFERENCES public.accounts(id);


--
-- Name: forum_comments forum_comments_author_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_author_account_id_fkey FOREIGN KEY (author_account_id) REFERENCES public.accounts(id);


--
-- Name: forum_comments forum_comments_moderated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_moderated_by_account_id_fkey FOREIGN KEY (moderated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: forum_comments forum_comments_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.forum_threads(id) ON DELETE CASCADE;


--
-- Name: forum_threads forum_threads_author_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_threads
    ADD CONSTRAINT forum_threads_author_account_id_fkey FOREIGN KEY (author_account_id) REFERENCES public.accounts(id);


--
-- Name: forum_threads forum_threads_moderated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_threads
    ADD CONSTRAINT forum_threads_moderated_by_account_id_fkey FOREIGN KEY (moderated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: hs3t_achievements hs3t_achievements_added_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_achievements
    ADD CONSTRAINT hs3t_achievements_added_by_account_id_fkey FOREIGN KEY (added_by_account_id) REFERENCES public.accounts(id);


--
-- Name: hs3t_achievements hs3t_achievements_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_achievements
    ADD CONSTRAINT hs3t_achievements_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.hs3t_profiles(id) ON DELETE CASCADE;


--
-- Name: hs3t_profiles hs3t_profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: hs3t_profiles hs3t_profiles_awarded_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_awarded_by_account_id_fkey FOREIGN KEY (awarded_by_account_id) REFERENCES public.accounts(id);


--
-- Name: hs3t_profiles hs3t_profiles_school_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_profiles
    ADD CONSTRAINT hs3t_profiles_school_org_unit_id_fkey FOREIGN KEY (school_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: hs3t_unit_standards hs3t_unit_standards_confirmed_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_unit_standards
    ADD CONSTRAINT hs3t_unit_standards_confirmed_by_account_id_fkey FOREIGN KEY (confirmed_by_account_id) REFERENCES public.accounts(id);


--
-- Name: hs3t_unit_standards hs3t_unit_standards_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs3t_unit_standards
    ADD CONSTRAINT hs3t_unit_standards_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id) ON DELETE CASCADE;


--
-- Name: live_events live_events_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_events
    ADD CONSTRAINT live_events_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: media_files media_files_uploaded_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_uploaded_by_account_id_fkey FOREIGN KEY (uploaded_by_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: member_contributions member_contributions_contributor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_contributions
    ADD CONSTRAINT member_contributions_contributor_account_id_fkey FOREIGN KEY (contributor_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: member_contributions member_contributions_moderated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_contributions
    ADD CONSTRAINT member_contributions_moderated_by_account_id_fkey FOREIGN KEY (moderated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: notifications notifications_recipient_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_account_id_fkey FOREIGN KEY (recipient_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: org_directory org_directory_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_directory
    ADD CONSTRAINT org_directory_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id) ON DELETE CASCADE;


--
-- Name: org_directory org_directory_updated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_directory
    ADD CONSTRAINT org_directory_updated_by_account_id_fkey FOREIGN KEY (updated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: org_units org_units_admin_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_admin_unit_id_fkey FOREIGN KEY (admin_unit_id) REFERENCES public.admin_units(id);


--
-- Name: org_units org_units_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.org_units(id);


--
-- Name: org_units org_units_school_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_units
    ADD CONSTRAINT org_units_school_type_id_fkey FOREIGN KEY (school_type_id) REFERENCES public.school_types(id);


--
-- Name: password_reset_codes password_reset_codes_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: post_view_daily post_view_daily_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_view_daily
    ADD CONSTRAINT post_view_daily_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.published_posts(id) ON DELETE CASCADE;


--
-- Name: published_posts published_posts_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: published_posts published_posts_author_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_author_org_unit_id_fkey FOREIGN KEY (author_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: published_posts published_posts_contributor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_contributor_account_id_fkey FOREIGN KEY (contributor_account_id) REFERENCES public.accounts(id);


--
-- Name: published_posts published_posts_cover_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_cover_file_id_fkey FOREIGN KEY (cover_file_id) REFERENCES public.files(id);


--
-- Name: published_posts published_posts_editor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_posts
    ADD CONSTRAINT published_posts_editor_account_id_fkey FOREIGN KEY (editor_account_id) REFERENCES public.accounts(id);


--
-- Name: quiz_attempts quiz_attempts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: quiz_attempts quiz_attempts_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.quiz_exams(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_graded_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_graded_by_account_id_fkey FOREIGN KEY (graded_by_account_id) REFERENCES public.accounts(id);


--
-- Name: quiz_exams quiz_exams_created_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_exams
    ADD CONSTRAINT quiz_exams_created_by_account_id_fkey FOREIGN KEY (created_by_account_id) REFERENCES public.accounts(id);


--
-- Name: ranking_entries ranking_entries_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT ranking_entries_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: ranking_entries ranking_entries_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_entries
    ADD CONSTRAINT ranking_entries_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.ranking_snapshots(id) ON DELETE CASCADE;


--
-- Name: ranking_snapshots ranking_snapshots_criteria_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshots
    ADD CONSTRAINT ranking_snapshots_criteria_set_id_fkey FOREIGN KEY (criteria_set_id) REFERENCES public.criteria_sets(id);


--
-- Name: ranking_snapshots ranking_snapshots_generated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshots
    ADD CONSTRAINT ranking_snapshots_generated_by_account_id_fkey FOREIGN KEY (generated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: ranking_snapshots ranking_snapshots_scope_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshots
    ADD CONSTRAINT ranking_snapshots_scope_org_unit_id_fkey FOREIGN KEY (scope_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: report_activities report_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activities
    ADD CONSTRAINT report_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: report_activities report_activities_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activities
    ADD CONSTRAINT report_activities_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_exports report_exports_exported_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_exported_by_account_id_fkey FOREIGN KEY (exported_by_account_id) REFERENCES public.accounts(id);


--
-- Name: report_exports report_exports_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: report_exports report_exports_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_created_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_account_id_fkey FOREIGN KEY (created_by_account_id) REFERENCES public.accounts(id);


--
-- Name: reports reports_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: resources resources_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: resources resources_published_by_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_published_by_org_unit_id_fkey FOREIGN KEY (published_by_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: resources resources_resource_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_resource_type_id_fkey FOREIGN KEY (resource_type_id) REFERENCES public.resource_types(id);


--
-- Name: resources resources_source_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES public.documents(id);


--
-- Name: resources resources_submitted_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_submitted_by_account_id_fkey FOREIGN KEY (submitted_by_account_id) REFERENCES public.accounts(id);


--
-- Name: resources resources_thumbnail_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_thumbnail_file_id_fkey FOREIGN KEY (thumbnail_file_id) REFERENCES public.files(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: scores scores_criteria_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_criteria_set_id_fkey FOREIGN KEY (criteria_set_id) REFERENCES public.criteria_sets(id);


--
-- Name: scores scores_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.task_metrics(id);


--
-- Name: scores scores_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: scores scores_scored_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_scored_by_account_id_fkey FOREIGN KEY (scored_by_account_id) REFERENCES public.accounts(id);


--
-- Name: scores scores_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_assignments task_assignments_assigned_by_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_assigned_by_org_unit_id_fkey FOREIGN KEY (assigned_by_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: task_assignments task_assignments_confirmed_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_confirmed_by_account_id_fkey FOREIGN KEY (confirmed_by_account_id) REFERENCES public.accounts(id);


--
-- Name: task_assignments task_assignments_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: task_assignments task_assignments_parent_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_parent_assignment_id_fkey FOREIGN KEY (parent_assignment_id) REFERENCES public.task_assignments(id);


--
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_metrics task_metrics_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_metrics
    ADD CONSTRAINT task_metrics_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_results task_results_assignment_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_results
    ADD CONSTRAINT task_results_assignment_target_id_fkey FOREIGN KEY (assignment_target_id) REFERENCES public.assignment_targets(id) ON DELETE CASCADE;


--
-- Name: task_results task_results_reported_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_results
    ADD CONSTRAINT task_results_reported_by_account_id_fkey FOREIGN KEY (reported_by_account_id) REFERENCES public.accounts(id);


--
-- Name: task_results task_results_task_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_results
    ADD CONSTRAINT task_results_task_assignment_id_fkey FOREIGN KEY (task_assignment_id) REFERENCES public.task_assignments(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_org_unit_id_fkey FOREIGN KEY (created_by_org_unit_id) REFERENCES public.org_units(id);


--
-- Name: tasks tasks_criteria_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_criteria_set_id_fkey FOREIGN KEY (criteria_set_id) REFERENCES public.criteria_sets(id);


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id);


--
-- Name: volunteer_projects volunteer_projects_moderated_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_projects
    ADD CONSTRAINT volunteer_projects_moderated_by_account_id_fkey FOREIGN KEY (moderated_by_account_id) REFERENCES public.accounts(id);


--
-- Name: volunteer_projects volunteer_projects_org_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_projects
    ADD CONSTRAINT volunteer_projects_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.org_units(id);


--
-- Name: volunteer_projects volunteer_projects_submitted_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_projects
    ADD CONSTRAINT volunteer_projects_submitted_by_account_id_fkey FOREIGN KEY (submitted_by_account_id) REFERENCES public.accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict BQXH4iV3932KCPxj5aDbxfgYgE5v3ay1fEzFfQTxqRcceCwkyycfyOtRSghFJEM

