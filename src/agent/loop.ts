/**
 * Core agent loop — orchestrates the conversation between the user,
 * the LLM, and the tool system.
 */

import { OllamaClient } from '../llm/ollama.js';
import { ToolRegistry } from '../tools/registry.js';
import { Conversation } from './conversation.js';
import { parseToolCallsFromText } from '../llm/tool-call-parser.js';
import { buildSystemPrompt } from '../llm/system-prompt.js';
import * as renderer from '../ui/renderer.js';
import type { ToolCall } from '../llm/types.js';

const MAX_ITERATIONS = 25;

export class AgentLoop {
  public conversation: Conversation;
  private client: OllamaClient;
  private registry: ToolRegistry;
  private _model: string;
  private customPrompt?: string;

  constructor(client: OllamaClient, registry: ToolRegistry, model: string, customPrompt?: string) {
    this.client = client;
    this.registry = registry;
    this._model = model;
    this.customPrompt = customPrompt;

    const systemPrompt = buildSystemPrompt(
      this.registry.getToolDefinitions(),
      this.customPrompt,
    );
    this.conversation = new Conversation(systemPrompt);
  }

  /** Rebuild the system prompt (preserving any custom prompt) and clear conversation. */
  clearConversation(): void {
    const systemPrompt = buildSystemPrompt(
      this.registry.getToolDefinitions(),
      this.customPrompt,
    );
    this.conversation.clear(systemPrompt);
  }

  get model(): string {
    return this._model;
  }

  set model(value: string) {
    this._model = value;
  }

  /**
   * Run a single turn of the agent loop: send the user message, stream
   * the response, execute any tool calls, and loop until the model is
   * done or we hit the iteration cap.
   */
  async run(userMessage: string): Promise<void> {
    this.conversation.addUser(userMessage);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Call the LLM and stream tokens.
      let fullText = '';
      let nativeToolCalls: ToolCall[] = [];
      const useNativeTools = this.client.supportsTools(this._model);

      const stream = this.client.chat({
        model: this._model,
        messages: this.conversation.getMessages(),
        stream: true,
        tools: useNativeTools ? this.registry.getToolDefinitions() : undefined,
      });

      for await (const token of stream) {
        if (token.content) {
          renderer.renderStreaming(token.content);
          fullText += token.content;
        }
        if (token.done && token.tool_calls) {
          nativeToolCalls = token.tool_calls;
        }
      }

      // Determine tool calls — prefer native, fall back to text parsing.
      const usedNative = nativeToolCalls.length > 0;
      const toolCalls: ToolCall[] = usedNative
        ? nativeToolCalls
        : parseToolCallsFromText(fullText);

      if (toolCalls.length === 0) {
        // No tool calls — the model is done.
        this.conversation.addAssistant(fullText);
        // Ensure we end on a new line after streaming.
        process.stdout.write('\n');
        return;
      }

      // Tool calls found — add assistant message, execute each tool,
      // add results, and loop.
      this.conversation.addAssistant(fullText, usedNative ? toolCalls : undefined);
      process.stdout.write('\n');

      // Collect all tool results.
      const resultParts: string[] = [];

      for (const tc of toolCalls) {
        const name = tc.function.name;
        const args = tc.function.arguments as Record<string, any>;

        console.log(renderer.renderToolCall(name, args));

        const result = await this.registry.execute(name, args);

        console.log(renderer.renderToolResult(name, result));

        if (usedNative) {
          // Native tool support — send as tool-role messages.
          this.conversation.addToolResult(tc.id, result);
        } else {
          // Fallback — collect results to send as a user message,
          // since models without tool support don't understand tool-role messages.
          resultParts.push(`[Tool result for ${name}]\n${result}`);
        }
      }

      // For fallback mode, send all tool results as a single user message.
      if (!usedNative && resultParts.length > 0) {
        this.conversation.addUser(resultParts.join('\n\n'));
      }
    }

    // If we exhausted the iteration budget, warn the user.
    console.log(
      renderer.renderError(
        `Reached maximum iterations (${MAX_ITERATIONS}). Stopping.`,
      ),
    );
  }
}
