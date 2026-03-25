import type { Tool } from './base.js';

const MAX_RESPONSE_LENGTH = 50_000;

/**
 * web_fetch — fetch a URL and return the response as text.
 */
export const webFetchTool: Tool = {
  name: 'web_fetch',
  description:
    'Fetch a URL and return the response as text. NOTE: This tool makes a network request.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch.',
      },
    },
    required: ['url'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const url: string = args.url;

    try {
      const response = await fetch(url);
      let text = await response.text();

      if (text.length > MAX_RESPONSE_LENGTH) {
        text = text.substring(0, MAX_RESPONSE_LENGTH) + '\n... (truncated)';
      }

      return `[Network request made to: ${url}]\n${text}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error fetching URL "${url}": ${message}`;
    }
  },
};
