import fs from 'node:fs/promises';
import type { Tool } from './base.js';

/**
 * read_file — read a file's contents with line numbers.
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description:
    'Read the contents of a file. Returns file contents with line numbers.',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative path to the file to read.',
      },
      offset: {
        type: 'number',
        description: 'Start reading from this line number (1-indexed). Optional.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to return. Optional.',
      },
    },
    required: ['file_path'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const filePath: string = args.file_path;
    const offset: number | undefined = args.offset;
    const limit: number | undefined = args.limit;

    try {
      const buffer = await fs.readFile(filePath);

      // Binary detection: look for null bytes in the first 1024 bytes.
      const head = buffer.subarray(0, 1024);
      if (head.includes(0)) {
        return 'Binary file detected';
      }

      const content = buffer.toString('utf-8');
      let lines = content.split('\n');

      // Apply offset (1-indexed).
      const startIndex = offset != null && offset > 0 ? offset - 1 : 0;
      lines = lines.slice(startIndex);

      // Apply limit.
      if (limit != null && limit > 0) {
        lines = lines.slice(0, limit);
      }

      // Add line numbers.
      const numbered = lines.map(
        (line, i) => `${startIndex + i + 1}\t${line}`,
      );
      return numbered.join('\n');
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return `Error: file not found — ${filePath}`;
      }
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === 'EISDIR'
      ) {
        return `Error: path is a directory, not a file — ${filePath}`;
      }
      const message = err instanceof Error ? err.message : String(err);
      return `Error reading file: ${message}`;
    }
  },
};
