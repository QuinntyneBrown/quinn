/**
 * Interactive REPL for Quinn.
 */

import readline from 'node:readline';
import chalk from 'chalk';
import { AgentLoop } from './agent/loop.js';
import { OllamaClient } from './llm/ollama.js';
import { ToolRegistry } from './tools/registry.js';
import * as renderer from './ui/renderer.js';

export class CLI {
  private agentLoop: AgentLoop;
  private ollamaClient: OllamaClient;
  private registry: ToolRegistry;

  constructor(agentLoop: AgentLoop, ollamaClient: OllamaClient, registry: ToolRegistry) {
    this.agentLoop = agentLoop;
    this.ollamaClient = ollamaClient;
    this.registry = registry;
  }

  async startRepl(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Print welcome banner.
    console.log('');
    console.log(chalk.bold.cyan('  Quinn') + chalk.dim(' — local coding agent'));
    console.log(chalk.dim(`  Model: ${this.agentLoop.model}`));
    console.log(chalk.dim('  Type /help for commands'));
    console.log('');

    // Graceful shutdown on Ctrl+C.
    process.on('SIGINT', () => {
      console.log(chalk.dim('\nGoodbye!'));
      rl.close();
      process.exit(0);
    });

    // Graceful shutdown on Ctrl+D (stream end).
    rl.on('close', () => {
      console.log(chalk.dim('\nGoodbye!'));
      process.exit(0);
    });

    // Main prompt loop.
    const prompt = (): void => {
      rl.question(chalk.green('quinn> '), async (input: string) => {
        const trimmed = input.trim();

        if (trimmed.length === 0) {
          prompt();
          return;
        }

        // Handle slash commands.
        if (trimmed.startsWith('/')) {
          const handled = this.handleCommand(trimmed, rl);
          if (handled === 'exit') return;
          prompt();
          return;
        }

        // Normal user input — run the agent loop.
        try {
          await this.agentLoop.run(trimmed);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(renderer.renderError(message));
        }

        prompt();
      });
    };

    prompt();
  }

  /**
   * Handle slash commands. Returns 'exit' if the REPL should close.
   */
  private handleCommand(
    input: string,
    rl: readline.Interface,
  ): string | void {
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/exit':
      case '/quit':
        console.log(chalk.dim('Goodbye!'));
        rl.close();
        process.exit(0);
        return 'exit';

      case '/clear': {
        this.agentLoop.clearConversation();
        console.log(chalk.dim('Conversation cleared.'));
        break;
      }

      case '/model': {
        const newModel = parts.slice(1).join(' ').trim();
        if (!newModel) {
          console.log(chalk.dim(`Current model: ${this.agentLoop.model}`));
          break;
        }
        this.agentLoop.model = newModel;
        console.log(chalk.dim(`Model switched to: ${newModel}`));
        break;
      }

      case '/tools': {
        const tools = this.registry.list();
        console.log('');
        console.log(chalk.bold('Available tools:'));
        for (const tool of tools) {
          console.log(chalk.cyan(`  ${tool.name}`) + chalk.dim(` — ${tool.description}`));
        }
        console.log('');
        break;
      }

      case '/help':
        console.log('');
        console.log(chalk.bold('Commands:'));
        console.log(chalk.cyan('  /help   ') + chalk.dim('— Show this help'));
        console.log(chalk.cyan('  /clear  ') + chalk.dim('— Clear conversation history'));
        console.log(chalk.cyan('  /model  ') + chalk.dim('— Show or switch model (/model <name>)'));
        console.log(chalk.cyan('  /tools  ') + chalk.dim('— List available tools'));
        console.log(chalk.cyan('  /exit   ') + chalk.dim('— Exit Quinn'));
        console.log('');
        break;

      default:
        console.log(chalk.dim(`Unknown command: ${cmd}. Type /help for commands.`));
        break;
    }
  }
}
