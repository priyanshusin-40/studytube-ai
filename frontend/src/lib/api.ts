import type { Chat, ChatSummary, Message, User, Video } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { message: string; code: string };
}

let authRequiredHandler: (() => void) | undefined;

export function setAuthRequiredHandler(handler: (() => void) | undefined) {
  authRequiredHandler = handler;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Cannot reach the StudyTube API. Make sure the backend is running.');
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body?.success) {
    const error = new ApiError(
      body?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      body?.error?.code,
    );
    if (error.code === 'AUTH_REQUIRED') authRequiredHandler?.();
    throw error;
  }
  return body.data;
}

export const api = {
  me: () => request<{ user: User | null }>('/auth/me'),
  register: (name: string, email: string, password: string) => request<{ user: User }>('/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password }),
  }),
  login: (email: string, password: string) => request<{ user: User }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
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

