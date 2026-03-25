import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('L1-5: Privacy and Security', () => {
  describe('L2-5.1: No Remote LLM Calls', () => {
    it('package.json contains no remote LLM SDK dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.optionalDependencies,
      };
      const remoteSDKs = ['openai', '@anthropic-ai/sdk', 'cohere-ai', '@google/generative-ai'];
      for (const sdk of remoteSDKs) {
        expect(allDeps).not.toHaveProperty(sdk);
      }
    });
  });

  describe('L2-5.2: No Telemetry', () => {
    it('package.json contains no analytics/telemetry libraries', () => {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      const telemetryLibs = [
        'analytics-node', '@segment/analytics-node', 'mixpanel',
        '@sentry/node', 'posthog-node', '@amplitude/node',
        'rudder-sdk-node', 'heap-api',
      ];
      for (const lib of telemetryLibs) {
        expect(allDeps).not.toHaveProperty(lib);
      }
    });
  });

  describe('L2-5.3: Network-Aware Tool Descriptions', () => {
    it('web_fetch tool description mentions network', async () => {
      const { createDefaultTools } = await import('../src/tools/index.js');
      const tools = createDefaultTools();
      const webFetch = tools.find(t => t.name === 'web_fetch');
      expect(webFetch).toBeDefined();
      expect(webFetch!.description.toLowerCase()).toContain('network');
    });

    it('browser tool description mentions network', async () => {
      const { createDefaultTools } = await import('../src/tools/index.js');
      const tools = createDefaultTools();
      const browser = tools.find(t => t.name === 'browser');
      expect(browser).toBeDefined();
      expect(browser!.description.toLowerCase()).toContain('network');
    });
  });
});
