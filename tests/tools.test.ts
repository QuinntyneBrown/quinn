import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultTools, ToolRegistry } from '../src/tools/index.js';

const TEST_DIR = join(process.cwd(), '.test-sandbox');

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, 'hello.txt'), 'line 1\nline 2\nline 3\nline 4\nline 5\n');
  writeFileSync(join(TEST_DIR, 'code.ts'), 'function greet() {\n  return "hello";\n}\n');
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of createDefaultTools()) {
    registry.register(tool);
  }
  return registry;
}

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const registry = buildRegistry();
    const tools = registry.list();
    expect(tools.length).toBeGreaterThanOrEqual(8);
    expect(tools.map(t => t.name)).toContain('read_file');
    expect(tools.map(t => t.name)).toContain('shell');
  });

  it('returns tool definitions in LLM format', () => {
    const registry = buildRegistry();
    const defs = registry.getToolDefinitions();
    expect(defs[0]).toHaveProperty('type', 'function');
    expect(defs[0]).toHaveProperty('function.name');
    expect(defs[0]).toHaveProperty('function.description');
    expect(defs[0]).toHaveProperty('function.parameters');
  });

  it('returns error string for unknown tool', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('nonexistent', {});
    expect(result).toContain('not found');
  });
});

describe('ReadFile tool', () => {
  it('reads a file with line numbers', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('read_file', { file_path: join(TEST_DIR, 'hello.txt') });
    expect(result).toContain('1');
    expect(result).toContain('line 1');
    expect(result).toContain('line 5');
  });

  it('applies offset and limit', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('read_file', {
      file_path: join(TEST_DIR, 'hello.txt'),
      offset: 2,
      limit: 2,
    });
    expect(result).toContain('line 2');
    expect(result).toContain('line 3');
    expect(result).not.toContain('line 1');
    expect(result).not.toContain('line 4');
  });

  it('returns error for nonexistent file', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('read_file', { file_path: join(TEST_DIR, 'nope.txt') });
    expect(result.toLowerCase()).toContain('error');
  });
});

describe('WriteFile tool', () => {
  it('creates a file and parent directories', async () => {
    const registry = buildRegistry();
    const filePath = join(TEST_DIR, 'sub', 'dir', 'new.txt');
    const result = await registry.execute('write_file', { file_path: filePath, content: 'hello world' });
    expect(result).toContain('bytes');
    expect(existsSync(filePath)).toBe(true);
  });
});

describe('EditFile tool', () => {
  it('replaces a unique string', async () => {
    const registry = buildRegistry();
    const filePath = join(TEST_DIR, 'edit-test.txt');
    writeFileSync(filePath, 'foo bar baz');
    const result = await registry.execute('edit_file', {
      file_path: filePath,
      old_string: 'bar',
      new_string: 'qux',
    });
    expect(result).not.toContain('error');
  });

  it('returns error for no match', async () => {
    const registry = buildRegistry();
    const filePath = join(TEST_DIR, 'edit-test2.txt');
    writeFileSync(filePath, 'foo bar baz');
    const result = await registry.execute('edit_file', {
      file_path: filePath,
      old_string: 'nothere',
      new_string: 'x',
    });
    expect(result.toLowerCase()).toContain('not found');
  });

  it('returns error for multiple matches', async () => {
    const registry = buildRegistry();
    const filePath = join(TEST_DIR, 'edit-test3.txt');
    writeFileSync(filePath, 'aaa bbb aaa');
    const result = await registry.execute('edit_file', {
      file_path: filePath,
      old_string: 'aaa',
      new_string: 'x',
    });
    expect(result.toLowerCase()).toContain('match');
  });
});

describe('Shell tool', () => {
  it('executes a simple command', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('shell', { command: 'echo hello-quinn' });
    expect(result).toContain('hello-quinn');
  });

  it('returns exit code for failing command', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('shell', { command: 'exit 42' });
    expect(result).toContain('42');
  });
});

describe('Glob tool', () => {
  it('finds files matching a pattern', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('glob', { pattern: '**/*.txt', path: TEST_DIR });
    expect(result).toContain('hello.txt');
  });

  it('returns message for no matches', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('glob', { pattern: '**/*.xyz', path: TEST_DIR });
    expect(result.toLowerCase()).toContain('no file');
  });
});

describe('Grep tool', () => {
  it('finds matching lines', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('grep', { pattern: 'greet', glob: '**/*.ts', path: TEST_DIR });
    expect(result).toContain('greet');
    expect(result).toContain('code.ts');
  });

  it('returns message for no matches', async () => {
    const registry = buildRegistry();
    const result = await registry.execute('grep', { pattern: 'zzzznothere', path: TEST_DIR });
    expect(result.toLowerCase()).toContain('no match');
  });
});
