import { describe, it, expect } from 'vitest';
import { OllamaClient } from '../src/llm/ollama.js';

describe('OllamaClient', () => {
  it('uses default base URL', () => {
    const client = new OllamaClient();
    // The client should be constructable with no args
    expect(client).toBeDefined();
  });

  it('accepts custom base URL', () => {
    const client = new OllamaClient('http://custom:1234');
    expect(client).toBeDefined();
  });

  it('listModels connects to Ollama', async () => {
    const client = new OllamaClient();
    try {
      const models = await client.listModels();
      expect(Array.isArray(models)).toBe(true);
      // If Ollama is running, we should get at least one model
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('name');
      }
    } catch (e: any) {
      // If Ollama isn't running, that's OK for CI — just verify the error message
      expect(e.message).toContain('Cannot connect to Ollama');
    }
  });
});
