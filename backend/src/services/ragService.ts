import type { SourceReference } from '../types/index.js';
import { formatTimestamp } from '../utils/format.js';
import { aiProvider, type ConversationTurn } from './aiProvider.js';
import { createQueryEmbedding } from './embeddingService.js';
import { searchTranscript } from './vectorSearchService.js';

export function buildContext(sources: SourceReference[]): string {
  return sources
    .map(
      (source, index) =>
        `[Source ${index + 1} | ${formatTimestamp(source.startTime)}–${formatTimestamp(source.endTime)}]\n${source.text}`,
    )
    .join('\n\n');
}

export async function answerQuestion(
  videoId: string,
  question: string,
  history: ConversationTurn[],
): Promise<{ answer: string; sources: SourceReference[] }> {
  const startedAt = performance.now();
  const embeddingStartedAt = performance.now();
  const embedding = await createQueryEmbedding(question);
  const searchStartedAt = performance.now();
  const sources = await searchTranscript(videoId, embedding);
  const answerStartedAt = performance.now();
  const answer = await aiProvider.answer({ question, context: buildContext(sources), history });
  console.info('[rag]', {
    embeddingMs: Math.round(searchStartedAt - embeddingStartedAt),
    searchMs: Math.round(answerStartedAt - searchStartedAt),
    answerMs: Math.round(performance.now() - answerStartedAt),
    totalMs: Math.round(performance.now() - startedAt),
    sourceCount: sources.length,
  });
  return { answer, sources };
}
