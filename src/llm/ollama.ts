/**
 * HTTP client for the Ollama REST API.
 *
 * Uses the native `fetch` available in Node 22+ so there are zero runtime
 * dependencies beyond Node itself.
 */

import type {
  ChatRequest,
  OllamaModel,
  StreamToken,
  ToolCall,
} from './types.js';

/** Shape of each NDJSON line Ollama sends while streaming. */
interface OllamaStreamChunk {
  message?: {
    content?: string;
    tool_calls?: Array<{
      function?: { name?: string; arguments?: Record<string, unknown> };
    }>;
  };
  done?: boolean;
}

/** Shape of the `/api/tags` response. */
interface TagsResponse {
  models?: Array<{
    name?: string;
    size?: number;
    modified_at?: string;
  }>;
}

export class OllamaClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ?? process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
    // Strip a trailing slash so callers don't have to worry about it.
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  // ── Model listing ────────────────────────────────────────────────────

  async listModels(): Promise<OllamaModel[]> {
    const res = await this.fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
    const body = (await res.json()) as TagsResponse;

    if (!Array.isArray(body.models)) {
      return [];
    }

    return body.models.map((m) => ({
      name: m.name ?? '',
      size: typeof m.size === 'number' ? m.size : 0,
      modified_at: m.modified_at ?? '',
    }));
  }

  // ── Streaming chat ───────────────────────────────────────────────────

  async *chat(request: ChatRequest): AsyncGenerator<StreamToken> {
    const res = await this.fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!res.body) {
      throw new Error(
        'Ollama returned an empty response body — is the server healthy?',
      );
    }

    // Accumulate tool_calls across the stream so we can emit them with
    // the final token even when Ollama sprinkles them across chunks.
    const accumulatedToolCalls: ToolCall[] = [];
    let toolCallCounter = 0;

    // Node's Fetch returns a ReadableStream<Uint8Array>.  We decode it
    // manually and split on newlines (NDJSON).
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const rawChunk of res.body as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(rawChunk, { stream: true });

      // Process every complete line in the buffer.
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (line.length === 0) continue;

        const parsed = safeParse(line);
        if (!parsed) continue;

        // Collect tool calls if the chunk carries any.
        if (Array.isArray(parsed.message?.tool_calls)) {
          for (const tc of parsed.message.tool_calls) {
            accumulatedToolCalls.push({
              id: `tc_${(toolCallCounter++).toString(16).padStart(4, '0')}`,
              function: {
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? {},
              },
            });
          }
        }

        const done = parsed.done === true;
        const content = parsed.message?.content ?? '';

        const token: StreamToken = { content, done };

        // Attach all collected tool calls to the final token.
        if (done && accumulatedToolCalls.length > 0) {
          token.tool_calls = accumulatedToolCalls;
        }

        yield token;
      }
    }

    // Flush any remaining data that didn't end with a newline.
    const remaining = buffer.trim();
    if (remaining.length > 0) {
      const parsed = safeParse(remaining);
      if (parsed) {
        if (Array.isArray(parsed.message?.tool_calls)) {
          for (const tc of parsed.message.tool_calls) {
            accumulatedToolCalls.push({
              id: `tc_${(toolCallCounter++).toString(16).padStart(4, '0')}`,
              function: {
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? {},
              },
            });
          }
        }

        const token: StreamToken = {
          content: parsed.message?.content ?? '',
          done: parsed.done === true,
        };

        if (parsed.done === true && accumulatedToolCalls.length > 0) {
          token.tool_calls = accumulatedToolCalls;
        }

        yield token;
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /**
   * Thin wrapper around `fetch` that catches connection-level errors and
   * turns them into a human-friendly message.
   */
  private async fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err: unknown) {
      const code =
        err instanceof Error && 'cause' in err
          ? ((err.cause as Record<string, string> | undefined)?.code ?? '')
          : '';

      if (
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ENOTFOUND' ||
        (err instanceof TypeError && /fetch failed/i.test(err.message))
      ) {
        throw new Error(
          `Cannot connect to Ollama at ${this.baseUrl} — is it running?`,
        );
      }

      throw err;
    }
  }
}

// ── Module-level helpers ───────────────────────────────────────────────

function safeParse(text: string): OllamaStreamChunk | null {
  try {
    return JSON.parse(text) as OllamaStreamChunk;
  } catch {
    return null;
  }
}
