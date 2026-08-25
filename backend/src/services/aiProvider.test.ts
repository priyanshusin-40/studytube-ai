import { describe, expect, it } from 'vitest';
import { buildGeminiContents } from './aiProvider.js';

describe('Gemini answer request construction', () => {
  it('maps assistant history to Gemini model turns and appends grounded context', () => {
    const contents = buildGeminiContents({
      question: 'What is the main point?',
      context: '[Source 1]\nThe main point is retrieval.',
      history: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'How can I help?' },
      ],
    });

    expect(contents[0]?.role).toBe('user');
    expect(contents[1]?.role).toBe('model');
    expect(contents[2]?.parts?.[0]?.text).toContain('TRANSCRIPT CONTEXT');
    expect(contents[2]?.parts?.[0]?.text).toContain('What is the main point?');
  });
});
