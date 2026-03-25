#!/usr/bin/env node

/**
 * Quinn — local LLM coding agent CLI.
 *
 * Main entry point: parses arguments, wires up components, and starts
 * either a one-shot run or the interactive REPL.
 */

import { OllamaClient } from './llm/ollama.js';
import { ToolRegistry } from './tools/registry.js';
import { createDefaultTools } from './tools/index.js';
import { AgentLoop } from './agent/loop.js';
import { CLI } from './cli.js';
import chalk from 'chalk';

// ── Argument parsing ────────────────────────────────────────────────────

interface ParsedArgs {
  help: boolean;
  listModels: boolean;
  model: string | null;
  systemPrompt: string | null;
  inlinePrompt: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip node + script
  const result: ParsedArgs = {
    help: false,
    listModels: false,
    model: null,
    systemPrompt: null,
    inlinePrompt: null,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      i++;
    } else if (arg === '--list-models') {
      result.listModels = true;
      i++;
    } else if (arg === '--model' || arg === '-m') {
      result.model = args[i + 1] ?? null;
      i += 2;
    } else if (arg === '--system' || arg === '-s') {
      result.systemPrompt = args[i + 1] ?? null;
      i += 2;
    } else if (arg.startsWith('-')) {
      // Unknown flag — skip.
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  if (positional.length > 0) {
    result.inlinePrompt = positional.join(' ');
  }

  return result;
}

function printUsage(): void {
  console.log(`
${chalk.bold.cyan('Quinn')} — local LLM coding agent

${chalk.bold('Usage:')}
  quinn [options] [prompt]

${chalk.bold('Options:')}
  -h, --help           Show this help message
  --list-models        List available Ollama models
  -m, --model <name>   Set the model (default: first available or gemma3:4b)
  -s, --system <text>  Add custom system prompt text

${chalk.bold('Examples:')}
  quinn                          Start interactive REPL
  quinn "explain this codebase"  Run a single prompt and exit
  quinn -m codellama "fix bug"   Use a specific model
`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  // Create the Ollama client.
  const client = new OllamaClient();

  // Handle --list-models.
  if (parsed.listModels) {
    try {
      const models = await client.listModels();
      if (models.length === 0) {
        console.log(chalk.dim('No models found. Pull one with: ollama pull gemma3:4b'));
      } else {
        console.log(chalk.bold('\nAvailable models:'));
        for (const m of models) {
          const size = (m.size / 1e9).toFixed(1);
          console.log(chalk.cyan(`  ${m.name}`) + chalk.dim(` (${size} GB)`));
        }
        console.log('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(renderer_error(message));
    }
    process.exit(0);
  }

  // Create the tool registry and register all default tools.
  const registry = new ToolRegistry();
  for (const tool of createDefaultTools()) {
    registry.register(tool);
  }

  // Determine which model to use.
  let model = parsed.model;
  if (!model) {
    try {
      const models = await client.listModels();
      if (models.length > 0) {
        model = models[0].name;
      }
    } catch {
      // If we can't connect, we'll discover that later.
    }
    if (!model) {
      model = 'gemma3:4b';
    }
  }

  // Create the agent loop.
  const agentLoop = new AgentLoop(client, registry, model, parsed.systemPrompt ?? undefined);

  // If an inline prompt was provided, run it once and exit.
  if (parsed.inlinePrompt) {
    try {
      await agentLoop.run(parsed.inlinePrompt);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
    process.exit(0);
  }

  // Otherwise, start the interactive REPL.
  const cli = new CLI(agentLoop, client, registry);
  await cli.startRepl();
}

// Simple error formatter for when renderer isn't yet available.
function renderer_error(message: string): string {
  return chalk.red(`Error: ${message}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(`Fatal: ${message}`));

  // Provide a helpful hint for common issues.
  if (message.includes('Cannot connect') || message.includes('ECONNREFUSED')) {
    console.error(chalk.dim('\nMake sure Ollama is running: https://ollama.ai'));
  }

  process.exit(1);
});
