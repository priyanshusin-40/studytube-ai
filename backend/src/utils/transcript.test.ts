import { describe, expect, it } from 'vitest';
import { chunkTranscript, cleanTranscriptSegments } from './transcript.js';
import { normalizeTranscriptTiming } from '../services/youtubeService.js';

describe('transcript processing', () => {
  it('normalizes srv3 millisecond timestamps to seconds', () => {
    expect(normalizeTranscriptTiming([
      { text: 'One', offset: 12_000, duration: 2_000 },
      { text: 'Two', offset: 14_000, duration: 2_500 },
    ])).toEqual([
      { text: 'One', start: 12, duration: 2 },
      { text: 'Two', start: 14, duration: 2.5 },
    ]);
  });

  it('cleans whitespace, noise, and empty segments', () => {
    expect(cleanTranscriptSegments([
      { text: ' Hello   world ', start: 0, duration: 2 },
      { text: '[Music]', start: 2, duration: 1 },
      { text: 'Next', start: 3, duration: 2 },
    ])).toEqual([
      { text: 'Hello world', start: 0, duration: 2 },
      { text: 'Next', start: 3, duration: 2 },
    ]);
  });

  it('creates overlapping chunks with real timestamp bounds', async () => {
    const chunks = await chunkTranscript([
      { text: 'First concept is explained clearly.', start: 10, duration: 4 },
      { text: 'Second concept adds more useful detail.', start: 14, duration: 5 },
      { text: 'Third concept closes the section.', start: 19, duration: 3 },
    ], 50, 15);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.startTime).toBe(10);
    expect(chunks.at(-1)?.endTime).toBe(22);
    expect(chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
  });
});
