/**
 * Conversation manager — maintains the ordered list of chat messages
 * exchanged between the user, assistant, and tools.
 */

import type { ChatMessage, ToolCall } from '../llm/types.js';

export class Conversation {
  private messages: ChatMessage[] = [];

  constructor(systemPrompt: string) {
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  /** Append a user message. */
  addUser(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  /** Append an assistant message, optionally with tool calls. */
  addAssistant(content: string, toolCalls?: ToolCall[]): void {
    const msg: ChatMessage = { role: 'assistant', content };
    if (toolCalls && toolCalls.length > 0) {
      msg.tool_calls = toolCalls;
    }
    this.messages.push(msg);
  }

  /** Append a tool result message. */
  addToolResult(toolCallId: string, content: string): void {
    this.messages.push({ role: 'tool', content, tool_call_id: toolCallId });
  }

  /** Return a shallow copy of all messages. */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /** Reset the conversation to just the system message. */
  clear(systemPrompt: string): void {
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  /** Return the number of messages in the conversation. */
  getLength(): number {
    return this.messages.length;
  }
}
