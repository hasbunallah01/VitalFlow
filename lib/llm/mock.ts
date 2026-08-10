/**
 * Mock LLM client for tests.
 *
 * Two modes:
 *   1. `scripted`: returns canned responses in order, optionally matching
 *      on the user message content. Use for deterministic agent tests.
 *   2. `echo`: returns the user message as a JSON object. Use for smoke
 *      tests where you just need the round-trip to work.
 *
 * Records every call so tests can assert on what was asked.
 */

import type { ChatMessage, ChatOptions, ChatResponse, LLMClient } from './client';

export interface MockCall {
  messages: ReadonlyArray<ChatMessage>;
  options: ChatOptions;
  response: ChatResponse;
}

export interface ScriptedResponse {
  /** If set, only match calls whose user message contains this string. */
  matchContains?: string;
  /** Content to return. Should be a JSON string when jsonMode is true. */
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}

export class MockLLMClient implements LLMClient {
  readonly provider = 'mock';
  readonly defaultModel = 'mock-1';

  private readonly responses: ScriptedResponse[];
  private readonly callLog: MockCall[] = [];
  private nextIndex = 0;

  constructor(responses: ScriptedResponse[] = []) {
    this.responses = responses;
  }

  /** All calls made, in order. Read-only view. */
  get calls(): ReadonlyArray<MockCall> {
    return this.callLog;
  }

  /** How many calls have been made. */
  get callCount(): number {
    return this.callLog.length;
  }

  async chat(
    messages: ReadonlyArray<ChatMessage>,
    options: ChatOptions = {},
  ): Promise<ChatResponse> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const lastUserContent = lastUser?.content ?? '';

    // Find a matching scripted response. If matchContains is set, skip
    // until we find one whose matchContains appears in the user content.
    let chosen: ScriptedResponse | undefined;
    if (this.responses.length > 0) {
      for (let i = this.nextIndex; i < this.responses.length; i++) {
        const r = this.responses[i]!;
        if (!r.matchContains || lastUserContent.includes(r.matchContains)) {
          chosen = r;
          this.nextIndex = i + 1;
          break;
        }
      }
      if (!chosen) {
        // Fallback: last scripted response (so we don't crash on the tail)
        chosen = this.responses[this.responses.length - 1]!;
      }
    } else {
      // Echo mode: return user content as JSON
      chosen = { content: lastUserContent };
    }

    const response: ChatResponse = {
      content: chosen.content,
      model: this.defaultModel,
      tokensIn: chosen.tokensIn ?? estimateTokens(lastUserContent),
      tokensOut: chosen.tokensOut ?? estimateTokens(chosen.content),
      finishReason: 'stop',
      raw: { mock: true },
    };
    this.callLog.push({ messages, options, response });
    return response;
  }
}

function estimateTokens(s: string): number {
  // Very rough: 1 token per 4 chars. Good enough for mock accounting.
  return Math.max(1, Math.ceil(s.length / 4));
}
