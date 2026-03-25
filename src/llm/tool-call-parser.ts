/**
 * Fallback tool-call parser for models that do not support native tool
 * calling.  Scans the assistant's text for JSON blocks that look like
 * tool invocations and returns structured ToolCall objects.
 */

import type { ToolCall } from './types.js';
import { randomBytes } from 'node:crypto';

/**
 * Scan `text` for tool-call JSON blocks and return any that are found.
 *
 * Recognised formats:
 *
 *  1. Fenced with ```tool_call … ```
 *  2. Fenced with ```json  … ```  (content must match the tool-call shape)
 *  3. A bare JSON object `{"name": "…", "arguments": {…}}` at the end of
 *     the response (after the last non-JSON prose).
 */
export function parseToolCallsFromText(text: string): ToolCall[] {
  const calls: ToolCall[] = [];

  // 1. ```tool_call blocks
  const toolCallFenceRe =
    /```tool_call\s*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(toolCallFenceRe)) {
    const parsed = tryParseToolCall(match[1]);
    if (parsed) calls.push(parsed);
  }

  // 2. ```json blocks (only if they look like a tool call)
  const jsonFenceRe = /```json\s*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(jsonFenceRe)) {
    const parsed = tryParseToolCall(match[1]);
    if (parsed) calls.push(parsed);
  }

  // 3. Bare JSON at the tail of the response.
  //    We only attempt this when no fenced blocks were found — otherwise the
  //    fenced blocks are authoritative.
  if (calls.length === 0) {
    const bareJson = extractTrailingJson(text);
    if (bareJson) {
      const parsed = tryParseToolCall(bareJson);
      if (parsed) calls.push(parsed);
    }
  }

  return calls;
}

// ── Internal helpers ───────────────────────────────────────────────────

/** Shape we accept as a valid tool-call object. */
interface RawToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

function isRawToolCall(value: unknown): value is RawToolCall {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['name'] === 'string' &&
    obj['name'].length > 0 &&
    typeof obj['arguments'] === 'object' &&
    obj['arguments'] !== null &&
    !Array.isArray(obj['arguments'])
  );
}

function tryParseToolCall(raw: string): ToolCall | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  // Direct tool-call object.
  if (isRawToolCall(parsed)) {
    return {
      id: generateId(),
      function: {
        name: parsed.name,
        arguments: parsed.arguments,
      },
    };
  }

  // Wrapped in a `tool_call` key: {"tool_call": {"name": …, "arguments": …}}
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'tool_call' in parsed
  ) {
    const inner = (parsed as Record<string, unknown>)['tool_call'];
    if (isRawToolCall(inner)) {
      return {
        id: generateId(),
        function: {
          name: inner.name,
          arguments: inner.arguments,
        },
      };
    }
  }

  return null;
}

/**
 * Look for the last JSON object in `text` that sits at the very end
 * (possibly followed only by whitespace).
 */
function extractTrailingJson(text: string): string | null {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('}')) return null;

  // Walk backwards to find the matching opening brace.
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '}') depth++;
    if (ch === '{') depth--;

    if (depth === 0) {
      return trimmed.slice(i);
    }
  }

  return null;
}

function generateId(): string {
  return `tc_${randomBytes(6).toString('hex')}`;
}
