import type { Request, Response } from 'express';
import * as videoService from '../services/videoService.js';

export async function processVideo(request: Request, response: Response) {
  const result = await videoService.processVideo(request.body.url as string);
  response.status(result.reused ? 200 : 201).json({ success: true, data: result });
}

export async function listVideos(_request: Request, response: Response) {
  response.json({ success: true, data: { videos: await videoService.listVideos() } });
}

export async function getVideo(request: Request, response: Response) {
  response.json({ success: true, data: { video: await videoService.getVideo(String(request.params.id)) } });
}
