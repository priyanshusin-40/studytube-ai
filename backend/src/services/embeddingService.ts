import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { geminiClient, normalizeGeminiError } from './geminiClient.js';

export function formatDocumentForEmbedding(text: string): string {
  return `title: YouTube transcript | text: ${text}`;
}

export function formatQueryForEmbedding(text: string): string {
  return `task: question answering | query: ${text}`;
}

function validateEmbedding(values: number[] | undefined): number[] {
  if (
    !values ||
    values.length !== env.GEMINI_EMBEDDING_DIMENSIONS ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new AppError('Gemini returned an invalid embedding.', 502, 'INVALID_EMBEDDING');
  }
  return values;
}

async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const embeddings: number[][] = [];
  try {
    for (let index = 0; index < inputs.length; index += env.EMBEDDING_BATCH_SIZE) {
      const batch = inputs.slice(index, index + env.EMBEDDING_BATCH_SIZE);
      const response = await geminiClient.models.embedContent({
        model: env.GEMINI_EMBEDDING_MODEL,
        contents: batch.map((text) => ({
          parts: [{ text }],
        })),
        config: { outputDimensionality: env.GEMINI_EMBEDDING_DIMENSIONS },
      });
      const batchEmbeddings = response.embeddings?.map((item) => validateEmbedding(item.values));
      if (!batchEmbeddings || batchEmbeddings.length !== batch.length) {
        throw new AppError(
          `Gemini returned ${batchEmbeddings?.length ?? 0} embeddings for ${batch.length} inputs.`,
          502,
          'INVALID_EMBEDDING',
        );
      }
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw normalizeGeminiError(error, 'embedding');
  }
}

export function createDocumentEmbeddings(texts: string[]): Promise<number[][]> {
  return createEmbeddings(texts.map(formatDocumentForEmbedding));
}

export async function createQueryEmbedding(question: string): Promise<number[]> {
  const [embedding] = await createEmbeddings([formatQueryForEmbedding(question)]);
  if (!embedding) throw new AppError('Gemini returned an invalid embedding.', 502, 'INVALID_EMBEDDING');
  return embedding;
}
