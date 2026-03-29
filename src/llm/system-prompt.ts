/**
 * Builds the system prompt that is prepended to every conversation.
 */

import type { ToolDefinition } from './types.js';

/**
 * Construct the full system prompt.
 *
 * @param tools         The tools the agent has access to.
 * @param customPrompt  Optional extra instructions appended at the end.
 */
export function buildSystemPrompt(
  tools: ToolDefinition[],
  customPrompt?: string,
): string {
  const sections: string[] = [];

  // ── Identity ─────────────────────────────────────────────────────────
  sections.push(
    'You are Quinn, a local coding agent. You help users write code, answer questions, and perform tasks in their development environment.',
  );

  // ── Environment ──────────────────────────────────────────────────────
  sections.push(
    [
      '## Environment',
      `- Working directory: ${process.cwd()}`,
      `- Platform: ${process.platform}`,
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
    ].join('\n'),
  );

  // ── Available tools ──────────────────────────────────────────────────
  if (tools.length > 0) {
    const toolLines = tools.map((t) => formatToolEntry(t));
    sections.push(['## Available tools', '', ...toolLines].join('\n'));
  }

  // ── Fallback tool-calling format ─────────────────────────────────────
  sections.push(
    [
      '## How to call tools',
      '',
      'When you need to use a tool, output a JSON code block:',
      '',
      '```tool_call',
      '{"name": "tool_name", "arguments": {"param": "value"}}',
      '```',
      '',
      'You can call multiple tools by outputting multiple such blocks.',
      'Always wait for tool results before continuing.',
    ].join('\n'),
  );

  // ── Safety ───────────────────────────────────────────────────────────
  sections.push(
    'IMPORTANT: If you need to make a network request (web_fetch or browser tools), inform the user first.',
  );

  // ── Custom prompt ────────────────────────────────────────────────────
  if (customPrompt && customPrompt.trim().length > 0) {
    sections.push(customPrompt.trim());
  }

  return sections.join('\n\n');
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatToolEntry(tool: ToolDefinition): string {
  const fn = tool.function;
  const params = formatParametersCompact(fn.parameters);
  return `- **${fn.name}**(${params}): ${fn.description}`;
}

function formatParametersCompact(params: Record<string, unknown>): string {
  const properties = params['properties'] as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties || Object.keys(properties).length === 0) {
    return '';
  }

  const required = Array.isArray(params['required'])
    ? (params['required'] as string[])
    : [];

  return Object.entries(properties)
    .map(([name, schema]) => {
      const type = schema['type'] ?? 'any';
      const req = required.includes(name) ? '' : '?';
      return `${name}${req}: ${String(type)}`;
    })
    .join(', ');
}
