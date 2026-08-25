import { describe, expect, it } from 'vitest';
import { formatDocumentForEmbedding, formatQueryForEmbedding } from './embeddingService.js';

describe('Gemini embedding input formatting', () => {
  it('uses the document structure recommended for asymmetric retrieval', () => {
    expect(formatDocumentForEmbedding('A transcript passage.')).toBe(
      'title: YouTube transcript | text: A transcript passage.',
    );
  });

  it('uses the question-answering query prefix', () => {
    expect(formatQueryForEmbedding('What is RAG?')).toBe(
      'task: question answering | query: What is RAG?',
    );
  });
});
