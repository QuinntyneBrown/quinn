/**
 * Integration test — measures how long Quinn takes to generate a Python class
 * in response to a prompt.
 *
 * Requires a running Ollama instance.  The test is automatically skipped when
 * Ollama is unreachable so it never fails in CI or offline environments.
 *
 * Usage:
 *   QUINN_TEST_MODEL=qwen2.5-coder:7b npm test -- agent-timing
 *
 * The model defaults to the first model Ollama reports if QUINN_TEST_MODEL is
 * not set.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaClient } from '../src/llm/ollama.js';
import { AgentLoop } from '../src/agent/loop.js';
import { createDefaultTools, ToolRegistry } from '../src/tools/index.js';

/* ── Configuration ─────────────────────────────────────────────────── */

/** Maximum wall-clock time (ms) allowed for the generation run. */
const HARD_TIMEOUT_MS = 5 * 60_000; // 5 minutes — generous for slow hardware

/** The prompt sent to Quinn. */
const PROMPT =
  'Write a Python class called Calculator with an __init__ that stores a ' +
  'running total (starting at 0), and methods add(n), subtract(n), ' +
  'multiply(n), divide(n) that update and return the total.  ' +
  'Do NOT use any tools — just output the code directly.';

/* ── Helpers ───────────────────────────────────────────────────────── */

async function ollamaIsReachable(client: OllamaClient): Promise<boolean> {
  try {
    await client.listModels();
    return true;
  } catch {
    return false;
  }
}

async function pickModel(client: OllamaClient): Promise<string> {
  const env = process.env['QUINN_TEST_MODEL'];
  if (env) return env;
  const models = await client.listModels();
  if (models.length === 0) throw new Error('No Ollama models installed');
  return models[0].name;
}

function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of createDefaultTools()) {
    registry.register(tool);
  }
  return registry;
}

/**
 * Extract all assistant-role text from the conversation history
 * (excludes the system prompt and user messages).
 */
function getAssistantOutput(agent: AgentLoop): string {
  return agent.conversation
    .getMessages()
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content)
    .join('\n');
}

/* ── Test suite ────────────────────────────────────────────────────── */

describe('Agent timing — Python class generation', () => {
  let client: OllamaClient;
  let reachable: boolean;
  let model: string;

  beforeAll(async () => {
    client = new OllamaClient();
    reachable = await ollamaIsReachable(client);
    if (reachable) {
      model = await pickModel(client);
    }
  });

  it(
    'generates a Python Calculator class and reports elapsed time',
    { timeout: HARD_TIMEOUT_MS },
    async () => {
      if (!reachable) {
        console.log('⏭  Ollama not reachable — skipping agent timing test');
        return;
      }

      const registry = buildRegistry();
      const agent = new AgentLoop(client, registry, model);

      // Silence streaming output during the test.
      const origWrite = process.stdout.write.bind(process.stdout);
      const origLog = console.log;
      process.stdout.write = (() => true) as typeof process.stdout.write;
      console.log = () => {};

      const t0 = performance.now();

      try {
        await agent.run(PROMPT);
      } finally {
        // Restore stdout no matter what.
        process.stdout.write = origWrite;
        console.log = origLog;
      }

      const elapsedMs = performance.now() - t0;
      const elapsedSec = (elapsedMs / 1000).toFixed(2);

      // ── Timing report ──────────────────────────────────────────────
      console.log('\n┌─────────────────────────────────────────────┐');
      console.log(`│  Model:   ${model}`);
      console.log(`│  Elapsed: ${elapsedSec}s (${Math.round(elapsedMs)}ms)`);
      console.log('└─────────────────────────────────────────────┘\n');

      // ── Validate the generated output ──────────────────────────────
      const output = getAssistantOutput(agent);

      // Must contain a Python class definition.
      expect(output).toMatch(/class\s+Calculator/);

      // Must define the required methods.
      expect(output).toMatch(/def\s+__init__/);
      expect(output).toMatch(/def\s+add/);
      expect(output).toMatch(/def\s+subtract/);
      expect(output).toMatch(/def\s+multiply/);
      expect(output).toMatch(/def\s+divide/);

      // Sanity: finished within the hard timeout (implicit — vitest
      // would have aborted) and within a reasonable upper bound.
      expect(elapsedMs).toBeLessThan(HARD_TIMEOUT_MS);
    },
  );
});
