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
   * Return compact tool definitions (descriptions trimmed, parameter
   * descriptions stripped) for native tool calling.
   */
  getCompactToolDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: truncateDescription(tool.description),
        parameters: stripParamDescriptions(tool.parameters),
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

/** Strip description fields from parameter properties to reduce token count. */
function stripParamDescriptions(params: Record<string, unknown>): Record<string, unknown> {
  const props = params['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (!props) return params;

  const stripped: Record<string, Record<string, unknown>> = {};
  for (const [key, schema] of Object.entries(props)) {
    const { description: _, ...rest } = schema;
    stripped[key] = rest;
  }
  return { ...params, properties: stripped };
}

/** Keep only the first sentence of a tool description. */
function truncateDescription(desc: string): string {
  const dot = desc.indexOf('.');
  return dot >= 0 ? desc.slice(0, dot + 1) : desc;
}
