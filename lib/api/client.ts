/**
 * VitalFlow — Frontend API client
 *
 * Thin wrapper around fetch(). All functions return real typed responses
 * from the existing backend. No mocks. If a request fails the error is
 * thrown and the caller decides how to render it.
 *
 * Server-side: relative URLs are rewritten to absolute URLs by reading the
 * base from `VERCEL_URL` (production) or `NEXT_PUBLIC_SITE_URL` /
 * `process.env.VERCEL_PROJECT_PRODUCTION_URL` (preview/dev). Falls back to
 * `localhost:3000` so local server-side fetches also work.
 *
 * This module is safely importable from both server and client components.
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

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let cachedBaseUrl: string | null = null;

function getBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    cachedBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return cachedBaseUrl;
  }
  if (process.env.VERCEL_URL) {
    cachedBaseUrl = `https://${process.env.VERCEL_URL}`;
    return cachedBaseUrl;
  }
  // Local / sandbox: derive the port from the server's actual PORT env var,
  // or fall back to 3000. Without this, server-side fetches during local
  // testing would hit the wrong port and silently 404.
  const port = process.env.PORT ?? '3000';
  cachedBaseUrl = `http://localhost:${port}`;
  return cachedBaseUrl;
}

function absoluteUrl(path: string): string {
  if (typeof window !== 'undefined') return path;
  if (/^https?:\/\//.test(path)) return path;
  return `${getBaseUrl()}${path}`;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(absoluteUrl(input), {
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

// ----- /api/dev/session -----------------------------------------------

export async function getSession(): Promise<Session> {
  return request<Session>('/api/dev/session');
}

// ----- /api/upload ----------------------------------------------------

export async function uploadStatement(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const url = absoluteUrl('/api/upload');
  const res = await fetch(url, {
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
