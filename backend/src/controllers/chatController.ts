import type { Request, Response } from 'express';
import * as chatService from '../services/chatService.js';

export async function createChat(request: Request, response: Response) {
  const chat = await chatService.createChat(request.body.videoId as string, request.body.title as string | undefined);
  response.status(201).json({ success: true, data: { chat } });
}

export async function listChats(_request: Request, response: Response) {
  response.json({ success: true, data: { chats: await chatService.listChats() } });
}

export async function getChat(request: Request, response: Response) {
  response.json({ success: true, data: { chat: await chatService.getChat(String(request.params.id)) } });
}

export async function renameChat(request: Request, response: Response) {
  const chat = await chatService.renameChat(String(request.params.id), request.body.title as string);
  response.json({ success: true, data: { chat } });
}

export async function deleteChat(request: Request, response: Response) {
  await chatService.deleteChat(String(request.params.id));
  response.status(204).send();
}

export async function sendMessage(request: Request, response: Response) {
  const result = await chatService.sendMessage(request.body.chatId as string, request.body.question as string);
  response.status(201).json({ success: true, data: result });
}
