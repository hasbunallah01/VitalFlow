/**
 * Agent base contract. See docs/AGENTS.md.
 */

import type { CurrencyCode } from './money';

export interface AgentContext {
  analysisId: string;
  organizationId: string;
  currency: CurrencyCode;
  locale: string;
  budget: { maxTokens: number; maxDurationMs: number };
}

export interface AgentWarning {
  code: string;
  message: string;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface AgentResult<T> {
  ok: boolean;
  data?: T;
  warnings: AgentWarning[];
  errors: AgentError[];
  /** 0–1. Propagates downstream and into the final report. */
  confidence: number;
  meta: {
    agent: string;
    agentVersion: string;
    promptId?: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    durationMs: number;
  };
}

export interface Agent<TIn, TOut> {
  readonly name: string;
  readonly version: string;
  readonly usesLLM: boolean;
  run(input: TIn, ctx: AgentContext): Promise<AgentResult<TOut>>;
}
