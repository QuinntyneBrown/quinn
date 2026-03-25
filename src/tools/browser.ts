import type { Tool } from './base.js';

/**
 * browser — navigate to a URL in a headless browser and extract content
 * or take a screenshot.  Requires playwright to be installed.
 */
export const browserTool: Tool = {
  name: 'browser',
  description:
    'Navigate to a URL in a headless browser and extract content or take a screenshot. NOTE: This tool makes network requests. Requires playwright to be installed.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to navigate to.',
      },
      action: {
        type: 'string',
        enum: ['content', 'screenshot'],
        description:
          'Action to perform. "content" extracts page text, "screenshot" saves a screenshot. Defaults to "content".',
      },
      screenshot_path: {
        type: 'string',
        description:
          'File path to save the screenshot (only used when action is "screenshot").',
      },
    },
    required: ['url'],
  },

  async execute(args: Record<string, any>): Promise<string> {
    const url: string = args.url;
    const action: string = args.action ?? 'content';
    const screenshotPath: string = args.screenshot_path ?? 'screenshot.png';

    // Try to dynamically import playwright.
    let playwright: any;
    try {
      playwright = await import('playwright');
    } catch {
      return 'Playwright is not installed. Run: npm install playwright && npx playwright install';
    }

    let browser: any = null;
    try {
      browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      if (action === 'screenshot') {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        return `Screenshot saved to ${screenshotPath}`;
      }

      // Default: extract text content.
      const title: string = await page.title();
      const bodyText: string =
        (await page.textContent('body')) ?? '(no body content)';

      // Trim to a reasonable length.
      const trimmedBody =
        bodyText.length > 50_000
          ? bodyText.substring(0, 50_000) + '\n... (truncated)'
          : bodyText;

      return `Title: ${title}\n\n${trimmedBody}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error using browser: ${message}`;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  },
};
