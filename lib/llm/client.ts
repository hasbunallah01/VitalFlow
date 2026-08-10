/**
 * LLM client — provider-agnostic OpenAI-compatible HTTP wrapper.
 *
 * Used by every agent in `agents/` that touches an LLM. The interface
 * is intentionally small (chat + JSON-mode) because that's all our
 * agents need. If a future agent needs tool-use or streaming, extend
 * here first.
 *
 * Provider config is read from env at construction time. The client
 * carries its own config — passing it down through every agent call
 * would be ceremony.
 *
 * Strict mode flag controls `response_format: { type: "json_object" }`.
 * When true, the provider will refuse to return non-JSON. When false,
 * we just ask politely in the prompt and validate the response client-side.
 */

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatOptions {
  /** When true, request `response_format: { type: "json_object" }`. */
  jsonMode?: boolean;
  /** Model override. Falls back to the client's default. */
  model?: string;
  /** Sampling temperature. Default 0.3 (mostly deterministic). */
  temperature?: number;
  /** Max output tokens. */
  maxTokens?: number;
  /** Total request timeout in ms. */
  timeoutMs?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | string;
  /** Raw provider payload, for debugging. */
  raw: unknown;
}

export interface LLMClient {
  /** Provider name (e.g. "nebius", "mock"). */
  readonly provider: string;
  /** Default model used when ChatOptions.model is not provided. */
  readonly defaultModel: string;
  chat(messages: ReadonlyArray<ChatMessage>, options?: ChatOptions): Promise<ChatResponse>;
}

/**
 * Environment-driven config loader. Reads the values the .env.example
 * documents. Pure function — no side effects, easy to test.
 */
export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  maxRetries: number;
}

export function loadLLMConfig(env: NodeJS.ProcessEnv = process.env): LLMConfig {
  const baseUrl = env.LLM_BASE_URL || env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1';
  const apiKey = env.LLM_API_KEY || env.NEBIUS_API_KEY || '';
  const model = env.LLM_MODEL || env.NEBIUS_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';
  const temperature = Number(env.LLM_TEMPERATURE ?? env.NEBIUS_TEMPERATURE ?? '0.2');
  const timeoutMs = Number(env.LLM_TIMEOUT_MS ?? env.NEBIUS_TIMEOUT_MS ?? '30000');
  const maxRetries = Number(env.LLM_MAX_RETRIES ?? env.NEBIUS_MAX_RETRIES ?? '2');
  return { baseUrl, apiKey, model, temperature, timeoutMs, maxRetries };
}

// ---------------------------------------------------------------------------
// OpenAI-compatible HTTP client
// ---------------------------------------------------------------------------

export class HttpLLMClient implements LLMClient {
  readonly provider: string;
  readonly defaultModel: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: LLMConfig, providerName = 'openai-compatible') {
    this.provider = providerName;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.model;
    this.temperature = config.temperature;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = Math.max(0, config.maxRetries);
  }

  async chat(
    messages: ReadonlyArray<ChatMessage>,
    options: ChatOptions = {},
  ): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY not set. Cannot call LLM.');
    }
    const model = options.model ?? this.defaultModel;
    const temperature = options.temperature ?? this.temperature;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: options.maxTokens ?? 1024,
    };
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 500)}`);
          }
          const json = (await res.json()) as Record<string, unknown>;
          const choices = json.choices as Array<{ message?: { content?: string }; finish_reason?: string }> | undefined;
          const content = choices?.[0]?.message?.content ?? '';
          const finishReason = choices?.[0]?.finish_reason ?? 'unknown';
          const usage = (json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined) ?? {};
          return {
            content,
            model: (json.model as string) ?? model,
            tokensIn: usage.prompt_tokens ?? 0,
            tokensOut: usage.completion_tokens ?? 0,
            finishReason,
            raw: json,
          };
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        lastErr = e;
        // Only retry on transient errors (network, timeout, 5xx). Don't
        // retry on 4xx (auth, bad request) — those won't get better.
        if (attempt < this.maxRetries && isTransientError(e)) {
          const backoff = 200 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        throw e;
      }
    }
    // Unreachable, but TS wants an explicit throw.
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}

function isTransientError(e: unknown): boolean {
  if (e instanceof Error) {
    if (e.name === 'AbortError') return true;
    const msg = e.message;
    if (/HTTP (5\d\d|429)/.test(msg)) return true;
    if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(msg)) return true;
  }
  return false;
}
