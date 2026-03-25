import { describe, it, expect } from 'vitest';
import { parseToolCallsFromText } from '../src/llm/tool-call-parser.js';

describe('parseToolCallsFromText', () => {
  it('parses a tool_call code block', () => {
    const text = `I'll read that file for you.
\`\`\`tool_call
{"name": "read_file", "arguments": {"file_path": "/tmp/test.txt"}}
\`\`\``;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('read_file');
    expect(calls[0].function.arguments).toEqual({ file_path: '/tmp/test.txt' });
    expect(calls[0].id).toMatch(/^tc_/);
  });

  it('parses multiple tool_call blocks', () => {
    const text = `Let me check both files.
\`\`\`tool_call
{"name": "read_file", "arguments": {"file_path": "a.txt"}}
\`\`\`
\`\`\`tool_call
{"name": "read_file", "arguments": {"file_path": "b.txt"}}
\`\`\``;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(2);
  });

  it('parses json code blocks with tool call shape', () => {
    const text = `\`\`\`json
{"name": "shell", "arguments": {"command": "ls"}}
\`\`\``;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('shell');
  });

  it('returns empty array for text with no tool calls', () => {
    const calls = parseToolCallsFromText('Just a normal response with no tools.');
    expect(calls).toHaveLength(0);
  });

  it('returns empty array for malformed JSON', () => {
    const text = `\`\`\`tool_call
{not valid json}
\`\`\``;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(0);
  });

  it('parses raw JSON at end of response', () => {
    const text = `I need to run a command.
{"name": "shell", "arguments": {"command": "echo hello"}}`;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('shell');
  });
});
