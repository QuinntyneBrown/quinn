/**
 * Builds the system prompt that is prepended to every conversation.
 */

import type { ToolDefinition } from './types.js';

/**
 * Construct the full system prompt.
 *
 * @param tools              The tools the agent has access to.
 * @param customPrompt       Optional extra instructions appended at the end.
 * @param includeToolDetails When false, omit tool descriptions and fallback
 *                           call format (use when tools are sent natively).
 */
export function buildSystemPrompt(
  tools: ToolDefinition[],
  customPrompt?: string,
  includeToolDetails = true,
): string {
  const sections: string[] = [];

  // ── Identity + Environment (compact) ─────────────────────────────────
  sections.push(
    `You are Quinn, a coding agent. cwd: ${process.cwd()} | platform: ${process.platform}`,
  );

  if (includeToolDetails) {
    // ── Available tools (only for fallback / non-native tool modes) ────
    if (tools.length > 0) {
      const toolLines = tools.map((t) => formatToolEntry(t));
      sections.push(['Tools:', ...toolLines].join('\n'));
    }

    // ── Fallback tool-calling format ───────────────────────────────────
    sections.push(
      'To call a tool: ```tool_call\n{"name":"tool_name","arguments":{"p":"v"}}\n```',
    );
  }

  // ── Safety (compact) ──────────────────────────────────────────────────
  sections.push('Inform user before making network requests.');

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
