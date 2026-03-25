import { glob } from 'glob';
import path from 'node:path';
import type { Tool } from './base.js';

/**
 * glob — find files matching a glob pattern.
 */
export const globTool: Tool = {
  name: 'glob',
  description:
    'Find files matching a glob pattern. Returns paths relative to the working directory.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files against (e.g. "**/*.ts").',
      },
      path: {
        type: 'string',
        description:
          'Directory to search in. Defaults to the current working directory.',
      },
    },
    required: ['pattern'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const pattern: string = args.pattern;
    const searchPath: string | undefined = args.path;

    try {
      const cwd = searchPath ?? process.cwd();
      const matches = await glob(pattern, {
        cwd,
        nodir: true,
        dot: false,
        // Use posix paths for consistent output.
        posix: true,
      });

      if (matches.length === 0) {
        return `No files match pattern: ${pattern}`;
      }

      // Return relative paths, one per line.
      return matches
        .map((m) => (path.isAbsolute(m) ? path.relative(cwd, m) : m))
        .join('\n');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error searching for files: ${message}`;
    }
  },
};
