import fs from 'node:fs/promises';
import type { Tool } from './base.js';

/**
 * edit_file — replace an exact, unique string in a file.
 */
export const editFileTool: Tool = {
  name: 'edit_file',
  description:
    'Edit a file by replacing a specific string. The old_string must match exactly one location in the file.',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative path to the file to edit.',
      },
      old_string: {
        type: 'string',
        description:
          'The exact text to find in the file. Must match exactly once.',
      },
      new_string: {
        type: 'string',
        description: 'The text to replace old_string with.',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const filePath: string = args.file_path;
    const oldString: string = args.old_string;
    const newString: string = args.new_string;

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Count non-overlapping occurrences.
      let count = 0;
      let searchFrom = 0;
      while (true) {
        const idx = content.indexOf(oldString, searchFrom);
        if (idx === -1) break;
        count++;
        searchFrom = idx + oldString.length;
      }

      if (count === 0) {
        return 'Error: old_string not found in file';
      }
      if (count > 1) {
        return `Error: old_string matches ${count} locations — provide more surrounding context to make it unique`;
      }

      // Perform the single replacement and write back.
      const updated = content.replace(oldString, newString);
      await fs.writeFile(filePath, updated, 'utf-8');

      // Build a brief context summary around the change.
      const changeIndex = content.indexOf(oldString);
      const lineNumber =
        content.substring(0, changeIndex).split('\n').length;
      return `Replaced text at line ${lineNumber} in ${filePath}`;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return `Error: file not found — ${filePath}`;
      }
      const message = err instanceof Error ? err.message : String(err);
      return `Error editing file: ${message}`;
    }
  },
};
