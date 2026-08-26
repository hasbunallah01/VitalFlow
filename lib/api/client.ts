/**
 * VitalFlow — Frontend API client
 *
 * Thin wrapper around fetch() that points at the same Next.js origin
 * (server components, client components, route handlers all share origin).
 * All functions return real typed responses from the 6 backend routes
 * — no mocks, no fallbacks. If the request fails, the error is thrown
 * and the caller decides how to render it.
 */

import type {
  AgentsRunResponse,
  AnalysisListResponse,
  AuditResponse,
  FundingOutreachDetail,
  FundingOutreachListResponse,
  OverviewData,
  Session,
  UploadResponse,
} from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    cache: init?.cache ?? 'no-store',
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ----- /api/dev/session -----------------------------------------------

export async function getSession(): Promise<Session> {
  return request<Session>('/api/dev/session');
}

// ----- /api/upload ----------------------------------------------------

export async function uploadStatement(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return (await res.json()) as UploadResponse;
}

// ----- /api/analyses --------------------------------------------------

export async function getAnalyses(): Promise<AnalysisListResponse> {
  return request<AnalysisListResponse>('/api/analyses');
}

/**
 * Returns the most recent analysis overview, or null if the org has
 * none yet. Implemented as getAnalyses() + getAnalysis(id) because we
 * don't have a dedicated "latest" endpoint (it would be a thin
 * convenience over the list). This is a pure read, no writes.
 */
export async function getLatestOverview(): Promise<OverviewData | null> {
  const list = await getAnalyses();
  const latest = list.analyses[0];
  if (!latest?.id) return null;
  try {
    return await getAnalysis(latest.id);
  } catch {
    return null;
  }
}

// ----- /api/analyses/[id] --------------------------------------------

export async function getAnalysis(id: string): Promise<OverviewData> {
  return request<OverviewData>(`/api/analyses/${id}`);
}

// ----- /api/agents/run -----------------------------------------------

export async function runAgents(
  agents?: ReadonlyArray<'watcher' | 'insight' | 'funding-outreach'>,
): Promise<AgentsRunResponse> {
  return request<AgentsRunResponse>('/api/agents/run', {
    method: 'POST',
    body: JSON.stringify(agents ? { agents } : {}),
  });
}

// ----- /api/audit -----------------------------------------------------

export type AuditType =
  | 'all'
  | 'agent_runs'
  | 'watch_events'
  | 'recommendations'
  | 'funding_outreach'
  | 'analyses';

export async function getAudit(
  type: AuditType = 'all',
  limit = 50,
): Promise<AuditResponse> {
  return request<AuditResponse>(
    `/api/audit?type=${type}&limit=${Math.min(200, Math.max(1, limit))}`,
  );
}

// ----- /api/funding-outreach (added as part of frontend) -------------

export async function getFundingOutreaches(): Promise<FundingOutreachListResponse> {
  return request<FundingOutreachListResponse>('/api/funding-outreach');
}

export async function getFundingOutreach(
  id: string,
): Promise<FundingOutreachDetail> {
  return request<FundingOutreachDetail>(`/api/funding-outreach/${id}`);
}

// ----- Approver endpoints (Q3 option A) -------------------------------

export async function approveFundingOutreach(id: string): Promise<FundingOutreachDetail> {
  return request<FundingOutreachDetail>(`/api/funding-outreach/${id}/approve`, {
    method: 'POST',
  });
}

export async function revokeFundingOutreach(id: string): Promise<FundingOutreachDetail> {
  return request<FundingOutreachDetail>(`/api/funding-outreach/${id}/revoke`, {
    method: 'POST',
  });
}

export async function shareFundingOutreach(id: string): Promise<FundingOutreachDetail> {
  return request<FundingOutreachDetail>(`/api/funding-outreach/${id}/share`, {
    method: 'POST',
  });
}
