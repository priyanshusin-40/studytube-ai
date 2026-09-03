import type { Request, Response } from 'express';
import * as videoService from '../services/videoService.js';

export async function processVideo(request: Request, response: Response) {
  const result = await videoService.processVideo(request.authUser!.id, request.body.url as string);
  response.status(result.reused ? 200 : 201).json({ success: true, data: result });
}

export async function listVideos(request: Request, response: Response) {
  response.json({ success: true, data: { videos: await videoService.listVideos(request.authUser!.id) } });
}

export async function getVideo(request: Request, response: Response) {
  response.json({ success: true, data: { video: await videoService.getVideo(request.authUser!.id, String(request.params.id)) } });
}
