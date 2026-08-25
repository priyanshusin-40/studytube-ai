import type { Chat, ChatSummary, Message, Video } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { message: string; code: string };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Cannot reach the StudyTube API. Make sure the backend is running.');
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? 'Something went wrong. Please try again.');
  }
  return body.data;
}

export const api = {
  processVideo: (url: string) => request<{ video: Video; reused: boolean }>('/videos/process', {
    method: 'POST', body: JSON.stringify({ url }),
  }),
  listVideos: () => request<{ videos: Video[] }>('/videos'),
  listChats: () => request<{ chats: ChatSummary[] }>('/chats'),
  createChat: (videoId: string) => request<{ chat: { id: string } }>('/chats', {
    method: 'POST', body: JSON.stringify({ videoId }),
  }),
  getChat: (id: string) => request<{ chat: Chat }>(`/chats/${id}`),
  renameChat: (id: string, title: string) => request(`/chats/${id}`, {
    method: 'PATCH', body: JSON.stringify({ title }),
  }),
  deleteChat: (id: string) => request<void>(`/chats/${id}`, { method: 'DELETE' }),
  sendMessage: (chatId: string, question: string) => request<{ user: Message; assistant: Message }>('/chats/message/send', {
    method: 'POST', body: JSON.stringify({ chatId, question }),
  }),
};
