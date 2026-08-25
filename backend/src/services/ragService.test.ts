import { describe, expect, it } from 'vitest';
import type { SourceReference } from '../types/index.js';
import { buildContext } from './ragService.js';

describe('RAG context construction', () => {
  it('includes only retrieved chunks and their real timestamps', () => {
    const sources: SourceReference[] = [{
      chunkId: 'chunk-1', text: 'Supervised learning uses labeled examples.', startTime: 134,
      endTime: 185, score: 0.91, url: 'https://youtube.test',
    }];
    const context = buildContext(sources);
    expect(context).toContain('02:14–03:05');
    expect(context).toContain('labeled examples');
  });
});
