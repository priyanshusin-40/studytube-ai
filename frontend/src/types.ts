export interface SourceReference {
  chunkId: string;
  text: string;
  startTime: number;
  endTime: number;
  score: number;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceReference[];
  createdAt: string;
}

export interface Video {
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

export interface ChatSummary {
  id: string;
  title: string;
  videoId: string;
  videoTitle: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  title: string;
  videoId: string;
  video: Video;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
