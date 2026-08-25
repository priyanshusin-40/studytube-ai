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
  const embedding = await createQueryEmbedding(question);
  const sources = await searchTranscript(videoId, embedding);
  const answer = await aiProvider.answer({ question, context: buildContext(sources), history });
  return { answer, sources };
}
