import { execFile } from 'node:child_process';
import type { Tool } from './base.js';

const DEFAULT_TIMEOUT = 120_000; // 2 minutes

/**
 * shell — execute a shell command and return its output.
 */
export const shellTool: Tool = {
  name: 'shell',
  description:
    'Execute a shell command and return its output. Runs in the project working directory.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute.',
      },
      timeout: {
        type: 'number',
        description:
          'Maximum execution time in milliseconds. Defaults to 120000 (2 minutes).',
      },
    },
    required: ['command'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const command: string = args.command;
    const timeout: number = args.timeout ?? DEFAULT_TIMEOUT;

    return new Promise<string>((resolve) => {
      // Determine the correct shell for the platform.
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellFlag = isWindows ? '/c' : '-c';

      const child = execFile(
        shell,
        [shellFlag, command],
        {
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10 MB
          cwd: process.cwd(),
          killSignal: 'SIGTERM',
        },
        (error, stdout, stderr) => {
          const parts: string[] = [];

          if (stdout) {
            parts.push(stdout);
          }
          if (stderr) {
            parts.push(stderr);
          }

          if (error) {
            if (error.killed || (error as any).code === 'ETIMEDOUT') {
              resolve(`Command timed out after ${timeout}ms`);
              return;
            }
            // Include exit code when available.
            const exitCode =
              (error as any).code ??
              child.exitCode ??
              'unknown';
            parts.push(`\n[exit code: ${exitCode}]`);
          } else {
            parts.push(`\n[exit code: 0]`);
          }

          resolve(parts.join('\n'));
        },
      );
    });
  },
};
