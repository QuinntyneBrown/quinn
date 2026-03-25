import fs from 'node:fs/promises';
import path from 'node:path';
import type { Tool } from './base.js';

/**
 * write_file — write content to a file, creating parent directories as needed.
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description:
    'Write content to a file. Creates parent directories if needed. Overwrites existing files.',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative path to the file to write.',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file.',
      },
    },
    required: ['file_path', 'content'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const filePath: string = args.file_path;
    const content: string = args.content ?? '';

    try {
      // Ensure parent directories exist.
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, 'utf-8');
      const byteCount = Buffer.byteLength(content, 'utf-8');
      return `Wrote ${byteCount} bytes to ${filePath}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error writing file: ${message}`;
    }
  },
};
