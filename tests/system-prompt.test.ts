import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../src/llm/system-prompt.js';

describe('buildSystemPrompt', () => {
  it('includes working directory', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain(process.cwd());
  });

  it('includes tool descriptions', () => {
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('test_tool');
    expect(prompt).toContain('A test tool');
  });

  it('appends custom prompt', () => {
    const prompt = buildSystemPrompt([], 'Custom instruction here');
    expect(prompt).toContain('Custom instruction here');
  });

  it('includes tool_call format instructions', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('tool_call');
  });

  it('includes network warning instruction', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt.toLowerCase()).toContain('network');
  });
});
