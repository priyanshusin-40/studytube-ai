import type { Content } from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { geminiClient, normalizeGeminiError } from './geminiClient.js';

const SYSTEM_INSTRUCTION =
  'You answer questions about one YouTube video. Use the provided transcript context as the primary and authoritative source. ' +
  'Do not use outside facts to fill gaps. If the answer is not supported by the context, clearly say the information was not found in the video. ' +
  'Be direct, accurate, and helpful. You may use Markdown. Never invent quotations or timestamps; timestamp sources are rendered separately.';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnswerRequest {
  question: string;
  context: string;
  history: ConversationTurn[];
}

export interface AIProvider {
  answer(request: AnswerRequest): Promise<string>;
}

export function buildGeminiContents({ question, context, history }: AnswerRequest): Content[] {
  const contents: Content[] = history.slice(-8).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));
  contents.push({
    role: 'user',
    parts: [{ text: `TRANSCRIPT CONTEXT\n${context}\n\nQUESTION\n${question}` }],
  });
  return contents;
}

export class GeminiProvider implements AIProvider {
  async answer(request: AnswerRequest): Promise<string> {
    try {
      const response = await geminiClient.models.generateContent({
        model: env.GEMINI_CHAT_MODEL,
        contents: buildGeminiContents(request),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
        },
      });
      const answer = response.text?.trim();
      if (!answer) throw new AppError('Gemini returned an empty answer.', 502, 'EMPTY_AI_RESPONSE');
      return answer;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw normalizeGeminiError(error, 'answer generation');
    }
  }
}

export const aiProvider: AIProvider = new GeminiProvider();
