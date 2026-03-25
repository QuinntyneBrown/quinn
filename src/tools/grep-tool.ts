import { glob } from 'glob';
import fs from 'node:fs/promises';
import type { Tool } from './base.js';

const MAX_MATCHES = 100;

/**
 * grep — search file contents for a regex pattern.
 */
export const grepTool: Tool = {
  name: 'grep',
  description:
    'Search file contents for a regex pattern. Returns matching lines with file paths and line numbers.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regular expression pattern to search for.',
      },
      glob: {
        type: 'string',
        description:
          'Optional file glob filter (e.g. "*.ts"). Defaults to "**/*".',
      },
      path: {
        type: 'string',
        description:
          'Directory to search in. Defaults to the current working directory.',
      },
      context: {
        type: 'number',
        description:
          'Number of lines of context to show around each match. Defaults to 0.',
      },
    },
    required: ['pattern'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const pattern: string = args.pattern;
    const fileGlob: string = args.glob ?? '**/*';
    const searchPath: string = args.path ?? process.cwd();
    const contextLines: number = args.context ?? 0;

    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return `Error: invalid regex pattern — ${pattern}`;
    }

    try {
      const files = await glob(fileGlob, {
        cwd: searchPath,
        nodir: true,
        dot: false,
        posix: true,
        absolute: true,
      });

      const results: string[] = [];
      let totalMatches = 0;

      for (const filePath of files) {
        if (totalMatches >= MAX_MATCHES) break;

        let content: string;
        try {
          const buf = await fs.readFile(filePath);
          // Skip binary files.
          if (buf.subarray(0, 1024).includes(0)) continue;
          content = buf.toString('utf-8');
        } catch {
          // Skip files that can't be read.
          continue;
        }

        const lines = content.split('\n');
        const matchedIndices: Set<number> = new Set();

        // Find all matching line indices.
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matchedIndices.add(i);
          }
        }

        if (matchedIndices.size === 0) continue;

        // Expand with context lines.
        const outputIndices: Set<number> = new Set();
        for (const idx of matchedIndices) {
          const start = Math.max(0, idx - contextLines);
          const end = Math.min(lines.length - 1, idx + contextLines);
          for (let i = start; i <= end; i++) {
            outputIndices.add(i);
          }
        }

        // Build relative path for display.
        const normalizedBase = searchPath.replace(/\\/g, '/');
        const normalizedFile = filePath.replace(/\\/g, '/');
        const displayPath = normalizedFile.startsWith(normalizedBase)
          ? normalizedFile.slice(normalizedBase.length + 1)
          : normalizedFile;

        // Output matching + context lines.
        const sorted = [...outputIndices].sort((a, b) => a - b);
        for (const idx of sorted) {
          if (totalMatches >= MAX_MATCHES) break;
          results.push(`${displayPath}:${idx + 1}: ${lines[idx]}`);
          if (matchedIndices.has(idx)) {
            totalMatches++;
          }
        }
      }

      if (results.length === 0) {
        return `No matches found for pattern: ${pattern}`;
      }

      const header =
        totalMatches >= MAX_MATCHES
          ? `(showing first ${MAX_MATCHES} matches)\n`
          : '';
      return header + results.join('\n');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error searching files: ${message}`;
    }
  },
};
