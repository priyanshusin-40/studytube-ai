import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { TranscriptChunk, TranscriptSegment } from '../types/index.js';

export function cleanTranscriptSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      text: segment.text.replace(/\s+/g, ' ').replace(/\[(?:Music|Applause)\]/gi, '').trim(),
    }))
    .filter((segment) => segment.text.length > 0 && Number.isFinite(segment.start));
}

export async function chunkTranscript(
  input: TranscriptSegment[],
  chunkSize: number,
  chunkOverlap: number,
): Promise<TranscriptChunk[]> {
  const cleaned = cleanTranscriptSegments(input);
  if (cleaned.length === 0) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
    separators: ['. ', '? ', '! ', '; ', ', ', ' ', ''],
  });

  const atomic: TranscriptSegment[] = [];
  for (const segment of cleaned) {
    const pieces = segment.text.length > chunkSize ? await splitter.splitText(segment.text) : [segment.text];
    for (const text of pieces) atomic.push({ ...segment, text });
  }

  const chunks: TranscriptChunk[] = [];
  let buffer: TranscriptSegment[] = [];
  let length = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const first = buffer[0]!;
    const last = buffer[buffer.length - 1]!;
    chunks.push({
      text: buffer.map((item) => item.text).join(' '),
      startTime: first.start,
      endTime: last.start + Math.max(0, last.duration),
      chunkIndex: chunks.length,
    });

    const overlap: TranscriptSegment[] = [];
    let overlapLength = 0;
    for (let index = buffer.length - 1; index >= 0 && overlapLength < chunkOverlap; index -= 1) {
      const item = buffer[index]!;
      overlap.unshift(item);
      overlapLength += item.text.length + 1;
    }
    buffer = overlap;
    length = overlapLength;
  };

  for (const segment of atomic) {
    if (buffer.length > 0 && length + segment.text.length + 1 > chunkSize) flush();
    buffer.push(segment);
    length += segment.text.length + 1;
  }
  flush();

  return chunks;
}
