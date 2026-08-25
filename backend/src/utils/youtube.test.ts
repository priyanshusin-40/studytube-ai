import { describe, expect, it } from 'vitest';
import { extractYouTubeId } from './youtube.js';

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts %s', (url, expected) => expect(extractYouTubeId(url)).toBe(expected));

  it.each(['https://example.com/watch?v=dQw4w9WgXcQ', 'not-a-url', 'https://youtube.com/watch?v=short']) (
    'rejects %s',
    (url) => expect(() => extractYouTubeId(url)).toThrow(),
  );
});
