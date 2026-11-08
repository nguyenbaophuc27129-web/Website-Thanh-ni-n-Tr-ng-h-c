import type {
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyStatus,
  SurveyTally,
} from "@/types";

export const GUEST_TOKEN_KEY = "tnth_ks_guest";

/** Lấy hoặc tự sinh mã thiết bị khách lưu trong localStorage */
export function getGuestToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token || token.length < 16) {
      token = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `g_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "";
  }
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function fetchPublicSurveys(): Promise<{
  ok: boolean;
  surveys: Survey[];
  error?: string;
}> {
  try {
    const res = await fetch("/api/khao-sat", { cache: "no-store" });
    return await res.json();
  } catch (e) {
    return { ok: false, surveys: [], error: (e as Error).message };
  }
}

export async function fetchSurveyDetail(
  code: string,
  guestToken?: string
): Promise<{
  ok: boolean;
  survey?: Survey;
  myResponse?: {
    id: number;
    answers: SurveyAnswer[];
    submittedAt: string;
  } | null;
  error?: string;
}> {
  try {
    const url = new URL("/api/khao-sat", window.location.origin);
    url.searchParams.set("code", code);
    if (guestToken) {
      url.searchParams.set("guestToken", guestToken);
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitSurveyAnswers(
  code: string,
  answers: SurveyAnswer[],
  guestToken?: string
): Promise<{
  ok: boolean;
  responseId?: number;
  submittedAt?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/khao-sat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, answers, guestToken }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function adminFetchSurveys(): Promise<{
  ok: boolean;
  surveys: Survey[];
  error?: string;
}> {
  try {
    const res = await fetch("/api/khao-sat/quan-tri", { credentials: "include", cache: "no-store" });
    return await res.json();
  } catch (e) {
    return { ok: false, surveys: [], error: (e as Error).message };
  }
}

export async function adminFetchSurveyDetail(id: number): Promise<{
  ok: boolean;
  survey?: Survey;
  tallies?: SurveyTally[];
  responseCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/khao-sat/quan-tri?id=${id}`, {
      credentials: "include",
      cache: "no-store",
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface CreateSurveyPayload {
  title: string;
  code?: string;
  description?: string;
  status?: SurveyStatus;
  startsAt?: string;
  endsAt?: string;
  questions: SurveyQuestion[];
}

export async function adminCreateSurvey(payload: CreateSurveyPayload): Promise<{
  ok: boolean;
  survey?: Survey;
  error?: string;
}> {
  try {
    const res = await fetch("/api/khao-sat/quan-tri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface UpdateSurveyPayload {
  id: number;
  title?: string;
  code?: string;
  description?: string;
  status?: SurveyStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  questions?: SurveyQuestion[];
}

export async function adminUpdateSurvey(payload: UpdateSurveyPayload): Promise<{
  ok: boolean;
  survey?: Survey;
  error?: string;
}> {
  try {
    const res = await fetch("/api/khao-sat/quan-tri", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function adminDeleteSurvey(id: number): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/khao-sat/quan-tri?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
