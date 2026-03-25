/**
 * Core types for the Ollama LLM integration layer.
 */

/** A function call requested by the model. */
export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/** A single message in a chat conversation. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** JSON-Schema-style tool definition sent to the model. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    /** JSON Schema object describing the function parameters. */
    parameters: Record<string, unknown>;
  };
}

/** Model metadata returned by the Ollama `/api/tags` endpoint. */
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

/** A single token (or final summary) from a streaming chat response. */
export interface StreamToken {
  content: string;
  done: boolean;
  tool_calls?: ToolCall[];
}

/** Request body for the Ollama `/api/chat` endpoint. */
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  tools?: ToolDefinition[];
}

/** Non-streaming response from the Ollama `/api/chat` endpoint. */
export interface ChatResponse {
  message: ChatMessage;
  done: boolean;
}
