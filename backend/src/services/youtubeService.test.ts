import { YoutubeTranscript } from 'youtube-transcript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transcribeYouTubeAudio } from './audioTranscriptionService.js';
import { getYouTubeVideo } from './youtubeService.js';

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: vi.fn() },
}));

vi.mock('./audioTranscriptionService.js', () => ({
  transcribeYouTubeAudio: vi.fn(),
}));

const captionsMock = vi.mocked(YoutubeTranscript.fetchTranscript);
const audioMock = vi.mocked(transcribeYouTubeAudio);

describe('YouTube transcript selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      title: 'Test video',
      author_name: 'Test channel',
      thumbnail_url: 'https://example.com/thumbnail.jpg',
    }), { status: 200 })));
  });

  it('preserves the existing caption path when captions are available', async () => {
    captionsMock.mockResolvedValue([
      { text: 'Caption text', offset: 1_000, duration: 2_000, lang: 'en' },
    ]);

    const result = await getYouTubeVideo('https://youtu.be/dQw4w9WgXcQ');

    expect(result.transcriptSource).toBe('captions');
    expect(result.transcript).toEqual([{ text: 'Caption text', start: 1, duration: 2 }]);
    expect(audioMock).not.toHaveBeenCalled();
  });

  it('uses timestamped Gemini audio transcription when captions are unavailable', async () => {
    captionsMock.mockRejectedValue(new Error('Transcript disabled'));
    audioMock.mockResolvedValue([{ text: 'Audio words', start: 3.5, duration: 1.25 }]);

    const result = await getYouTubeVideo('dQw4w9WgXcQ');

    expect(audioMock).toHaveBeenCalledWith('dQw4w9WgXcQ');
    expect(result.transcriptSource).toBe('gemini-audio');
    expect(result.transcript).toEqual([{ text: 'Audio words', start: 3.5, duration: 1.25 }]);
  });
});
