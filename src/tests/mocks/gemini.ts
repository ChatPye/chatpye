import { GeminiService } from '../../lib/gemini';
import { verifyTranscriptVideoId } from '../../lib/mongodb';

type TranscriptContext = Parameters<GeminiService['generateAnswerStream']>[0][0];

export class MockGeminiService extends GeminiService {
  constructor() {
    // Skip the API key check in the parent constructor
    super();
  }

  async *generateAnswerStream(contexts: TranscriptContext[]): AsyncGenerator<string> {
    // Validate videoId if provided
    if (contexts.length > 0) {
      const context = contexts[0];
      const isValid = await verifyTranscriptVideoId(context.jobId, context.videoId);
      if (!isValid) {
        throw new Error('Transcript context does not match the provided videoId');
      }
    }

    // Mock implementation that yields a response based on the context
    const response = `This is a mock response for the question about the video. Context length: ${contexts.length}, VideoId: ${contexts[0]?.videoId}`;
    yield response;
  }
} 