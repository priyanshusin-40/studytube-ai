import type { GenerateContentResponse } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { extractTimedTranscript, groupTimedWords, parseGeminiOffset } from './audioTranscriptionService.js';

describe('audio transcription timestamps', () => {
  it('parses Gemini second offsets without inventing missing values', () => {
    expect(parseGeminiOffset('12.345s')).toBe(12.345);
    expect(parseGeminiOffset(undefined)).toBeNull();
    expect(parseGeminiOffset('not-a-time')).toBeNull();
  });

  it('groups words while preserving their actual time bounds', () => {
    expect(groupTimedWords([
      { text: 'Hello', start: 1.25, end: 1.7 },
      { text: 'world.', start: 1.8, end: 2.2 },
    ])).toEqual([{ text: 'Hello world.', start: 1.25, duration: 0.95 }]);
  });

  it('extracts word annotations from a Gemini transcription response', () => {
    const response = {
      candidates: [{
        content: {
          parts: [{
            audioTranscription: {
              words: [
                { word: 'StudyTube', startOffset: '0.100s', endOffset: '0.600s' },
                { word: 'works.', startOffset: '0.700s', endOffset: '1.100s' },
              ],
            },
          }],
        },
      }],
    } as GenerateContentResponse;

    expect(extractTimedTranscript(response)).toEqual([
      { text: 'StudyTube works.', start: 0.1, duration: 1 },
    ]);
  });
});
