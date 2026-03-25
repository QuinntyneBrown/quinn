import { describe, it, expect } from 'vitest';
import { Conversation } from '../src/agent/conversation.js';

describe('Conversation', () => {
  it('initializes with a system message', () => {
    const conv = new Conversation('You are a helper.');
    const msgs = conv.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe('You are a helper.');
  });

  it('adds user and assistant messages', () => {
    const conv = new Conversation('sys');
    conv.addUser('hello');
    conv.addAssistant('hi there');
    const msgs = conv.getMessages();
    expect(msgs).toHaveLength(3);
    expect(msgs[1].role).toBe('user');
    expect(msgs[2].role).toBe('assistant');
  });

  it('adds tool results', () => {
    const conv = new Conversation('sys');
    conv.addUser('do something');
    conv.addAssistant('calling tool', [{ id: 'tc_1', function: { name: 'read_file', arguments: { file_path: 'x' } } }]);
    conv.addToolResult('tc_1', 'file contents here');
    const msgs = conv.getMessages();
    expect(msgs).toHaveLength(4);
    expect(msgs[3].role).toBe('tool');
    expect(msgs[3].content).toBe('file contents here');
  });

  it('clears conversation back to system message', () => {
    const conv = new Conversation('sys');
    conv.addUser('a');
    conv.addAssistant('b');
    conv.clear('new system');
    const msgs = conv.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('new system');
  });

  it('getLength returns message count', () => {
    const conv = new Conversation('sys');
    expect(conv.getLength()).toBe(1);
    conv.addUser('x');
    expect(conv.getLength()).toBe(2);
  });
});
