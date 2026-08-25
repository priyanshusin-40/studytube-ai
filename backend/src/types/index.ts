export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  chunkIndex: number;
}

export interface VideoRecord {
  id: string;
  youtubeId: string;
  url: string;
  title: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  transcriptStatus: 'processing' | 'ready' | 'failed';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceReference {
  chunkId: string;
  text: string;
  startTime: number;
  endTime: number;
  score: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceReference[];
  createdAt: string;
}
