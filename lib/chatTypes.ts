export type MediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type ChatMode = 'code' | 'essay';

export interface ChatImage {
  data: string;       // base64
  mediaType: MediaType;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: ChatImage[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
