/**
 * Terminal output renderer for Quinn.
 *
 * Provides helpers for rendering markdown, tool calls, tool results,
 * errors, and streaming tokens to the terminal.
 */

import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked to render to the terminal.
marked.use(markedTerminal() as any);

/**
 * Render a markdown string for terminal display.
 */
export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

/**
 * Render a styled tool invocation line.
 */
export function renderToolCall(name: string, args: Record<string, any>): string {
  const argSummary = Object.entries(args)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      const truncated = val.length > 80 ? val.slice(0, 77) + '...' : val;
      return `${k}=${truncated}`;
    })
    .join(', ');

  return chalk.cyan(`  ▸ ${name}`) + (argSummary ? chalk.dim(` (${argSummary})`) : '');
}

/**
 * Render a styled tool result line (truncated to 500 chars for display).
 */
export function renderToolResult(name: string, result: string): string {
  const truncated = result.length > 500 ? result.slice(0, 497) + '...' : result;
  return chalk.dim(`  ◂ ${name}: `) + chalk.gray(truncated);
}

/**
 * Render an error message.
 */
export function renderError(message: string): string {
  return chalk.red(`Error: ${message}`);
}

/**
 * Write a streaming token to stdout without a trailing newline.
 */
export function renderStreaming(token: string): void {
  process.stdout.write(token);
}
