import { GoogleGenerativeAI, GenerateContentResponse, Part } from "@google/generative-ai";
import { getEnvVar, isTestEnvironment } from './env';
import { verifyTranscriptVideoId } from './mongodb';

// It's good practice to ensure API keys are checked before class instantiation if possible,
// or at least make it very clear in documentation that the service will fail without them.
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY environment variable is not set. GeminiService will fail if instantiated and used.');
}

interface TranscriptContext {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
  jobId: string;
  videoId: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for GeminiService');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    try {
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    } catch (error) {
      console.error('Error initializing Gemini model:', error);
      throw new Error('Failed to initialize Gemini model. Please check your API key and model name.');
    }
  }

  private async validateContexts(contexts: TranscriptContext[]): Promise<void> {
    if (!contexts || contexts.length === 0) {
      throw new Error('No transcript context provided');
    }

    // Get the videoId from the first context
    const expectedVideoId = contexts[0].videoId;
    if (!expectedVideoId) {
      throw new Error('No videoId found in transcript context');
    }

    // Verify that all contexts have the same videoId
    const mismatchedContexts = contexts.filter(context => context.videoId !== expectedVideoId);
    if (mismatchedContexts.length > 0) {
      console.error('Found contexts with mismatched videoId:', {
        expectedVideoId,
        mismatchedContexts: mismatchedContexts.map(c => ({
          jobId: c.jobId,
          actualVideoId: c.videoId
        }))
      });
      throw new Error('Transcript contexts contain mismatched video IDs');
    }

    // Verify that the videoId matches the job for each context
    for (const context of contexts) {
      const isValid = await verifyTranscriptVideoId(context.jobId, expectedVideoId);
      if (!isValid) {
        console.error('Invalid transcript context:', {
          jobId: context.jobId,
          videoId: context.videoId,
          expectedVideoId
        });
        throw new Error(`Transcript context does not match the provided videoId: ${expectedVideoId}`);
      }
    }

    // Verify timestamp continuity
    const sortedContexts = [...contexts].sort((a, b) => 
      parseFloat(a.startTimestamp) - parseFloat(b.startTimestamp)
    );

    for (let i = 1; i < sortedContexts.length; i++) {
      const prevEnd = parseFloat(sortedContexts[i-1].endTimestamp);
      const currStart = parseFloat(sortedContexts[i].startTimestamp);
      
      if (currStart < prevEnd) {
        console.error('Found overlapping timestamps:', {
          previous: {
            jobId: sortedContexts[i-1].jobId,
            end: prevEnd
          },
          current: {
            jobId: sortedContexts[i].jobId,
            start: currStart
          }
        });
        throw new Error('Transcript contexts contain overlapping timestamps');
      }
    }
  }

  async *generateAnswerStream(contexts: TranscriptContext[]): AsyncGenerator<string> {
    try {
      // Validate contexts before processing
      await this.validateContexts(contexts);

      // Construct the prompt with strict instructions
      const prompt = `You are an AI assistant answering questions about a specific YouTube video.
The video ID is: ${contexts[0].videoId}

IMPORTANT RULES:
1. ONLY use information from the provided transcript segments
2. If the answer cannot be found in the transcript, say so
3. Include timestamps in [MM:SS] format for any information you reference
4. Do not make assumptions or use information from other videos
5. If you're unsure about something, say so

Here are the relevant transcript segments:

${contexts.map(ctx => `[${ctx.startTimestamp}s - ${ctx.endTimestamp}s] ${ctx.text}`).join('\n\n')}

Please provide a clear and concise answer based ONLY on these transcript segments.`;

      const result = await this.model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error('Error in generateAnswerStream:', error);
      throw error;
    }
  }

  async *generateAnswerFromYouTubeUrlDirectly(youtubeUrl: string, question: string): AsyncGenerator<string> {
    try {
      const prompt = `You are an AI assistant answering questions about a YouTube video.
The video URL is: ${youtubeUrl}

IMPORTANT RULES:
1. ONLY use information from the video content
2. If you cannot answer based on the video content, say so
3. Do not make assumptions or use information from other videos
4. If you're unsure about something, say so

Question: ${question}

Please provide a clear and concise answer based ONLY on the video content.`;

      const result = await this.model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error('Error in generateAnswerFromYouTubeUrlDirectly:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService(); 