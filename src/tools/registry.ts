import type { Tool } from './base.js';
import type { ToolDefinition } from '../llm/types.js';

/**
 * Central registry that holds all available tools and
 * exposes them in Ollama's tool-definition format.
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /** Register a tool.  Overwrites any existing tool with the same name. */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /** Look up a tool by name. */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** Return every registered tool. */
  list(): Tool[] {
    return [...this.tools.values()];
  }

  /**
   * Return tool definitions in the format expected by the Ollama
   * `/api/chat` request body (`tools` array).
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Find a tool by name, execute it, and return the result string.
   * If the tool is not found or execution throws, an error string
   * is returned instead (never throws).
   */
  async execute(name: string, args: Record<string, any>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: tool "${name}" not found`;
    }
    try {
      return await tool.execute(args);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error executing tool "${name}": ${message}`;
    }
  }
}
