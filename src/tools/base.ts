/**
 * Base tool interface for the Quinn tool system.
 *
 * Every tool implements this interface — a name, description,
 * JSON-Schema parameters object, and an async execute method
 * that always returns a string (never throws).
 */
export interface Tool {
  name: string;
  description: string;
  /** JSON Schema object describing the function parameters. */
  parameters: Record<string, any>;
  execute(args: Record<string, any>): Promise<string>;
}
