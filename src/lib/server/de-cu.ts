import type { Nomination } from "@/types";
export {
  moderateStoryText,
  dataUrlGuard,
  adminScopePaths,
  isAdminSession,
  scopeClause,
  type AdminScope,
} from "@/lib/server/binh-chon";

const ISO = (v: Date | string | null): string =>
  v === null ? "" : v instanceof Date ? v.toISOString() : new Date(v).toISOString();

export type NominationRow = {
  id: number | string;
  nominee_name: string;
  nominee_position: string | null;
  org_unit_id: number | string;
  field: string;
  quote: string | null;
  achievements: string;
  evidence_data_url: string | null;
  evidence_thumb_data_url: string;
  submitter_account_id: number | string | null;
  ai_verdict: string | null;
  ai_reason: string | null;
  ai_model: string | null;
  status: string | null;
  rejection_reason: string | null;
  reviewed_by_account_id: number | string | null;
  reviewed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  school_name?: string | null;
  province_name?: string | null;
  submitter_username?: string | null;
};

export function toNominationDto(r: NominationRow, opts?: { withFullEvidence?: boolean }): Nomination {
  return {
    id: Number(r.id),
    nomineeName: r.nominee_name,
    nomineePosition: r.nominee_position ?? undefined,
    orgUnitId: Number(r.org_unit_id),
    orgUnitName: r.school_name ?? undefined,
    provinceName: r.province_name ?? undefined,
    field: r.field,
    quote: r.quote ?? undefined,
    achievements: r.achievements,
    evidenceThumbDataUrl: r.evidence_thumb_data_url,
    evidenceDataUrl: opts?.withFullEvidence ? (r.evidence_data_url ?? undefined) : undefined,
    submitterAccountId: r.submitter_account_id ? Number(r.submitter_account_id) : undefined,
    submitterUsername: r.submitter_username ?? undefined,
    aiVerdict: (r.ai_verdict as Nomination["aiVerdict"]) ?? undefined,
    aiReason: r.ai_reason ?? undefined,
    aiModel: r.ai_model ?? undefined,
    status: (r.status as Nomination["status"]) ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    reviewedByAccountId: r.reviewed_by_account_id ? Number(r.reviewed_by_account_id) : undefined,
    reviewedAt: r.reviewed_at ? ISO(r.reviewed_at) : undefined,
    createdAt: ISO(r.created_at),
    updatedAt: ISO(r.updated_at),
  };
}

export const NOMINATION_SELECT = `
  SELECT n.id, n.nominee_name, n.nominee_position, n.org_unit_id, n.field, n.quote,
         n.achievements, n.evidence_data_url, n.evidence_thumb_data_url,
         n.submitter_account_id, n.ai_verdict, n.ai_reason, n.ai_model,
         n.status, n.rejection_reason, n.reviewed_by_account_id, n.reviewed_at,
         n.created_at, n.updated_at,
         school.name AS school_name,
         school.path AS school_path,
         prov.name AS province_name,
         acc.username AS submitter_username
    FROM nominations n
    JOIN org_units school ON school.id = n.org_unit_id
    LEFT JOIN accounts acc ON acc.id = n.submitter_account_id
    LEFT JOIN LATERAL (
      SELECT au.name FROM org_units pu
        JOIN admin_units au ON au.id = pu.admin_unit_id
       WHERE pu.id = CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint ELSE NULL END
       LIMIT 1
    ) prov ON true`;
