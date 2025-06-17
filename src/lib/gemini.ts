import { GoogleGenerativeAI, GenerateContentResponse, Part, GenerativeModel, GenerationConfig, Content } from "@google/generative-ai";
import { getEnvVar, isTestEnvironment } from './env';
import { verifyTranscriptVideoId } from './mongodb';

// It's good practice to ensure API keys are checked before class instantiation if possible,
// or at least make it very clear in documentation that the service will fail without them.
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY environment variable is not set. GeminiService will fail if instantiated and used.');
}

// Define the TranscriptContext interface to be used by the service
export interface TranscriptContext {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
  jobId: string;
  videoId: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private generationConfig: GenerationConfig;

  constructor() {
    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Define the generation config
    this.generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    // Initialize the model
    try {
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: this.generationConfig 
      });
    } catch (error) {
      console.error("Failed to initialize Gemini model:", error);
      throw new Error("Could not initialize Gemini model. Please check your API key and model name.");
    }
  }

  private async validateContexts(contexts: TranscriptContext[], videoId: string): Promise<void> {
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

  // Unified function for generating answers. Handles both RAG and direct-to-video.
  async *generateAnswerStream(
    contexts: Array<TranscriptContext>, 
    question: string, 
    videoId: string,
    videoTitle?: string,
    videoDescription?: string
  ): AsyncGenerator<string> {
    
    // We still validate if context is provided, to ensure data integrity if it exists.
    if (contexts.length > 0) {
      await this.validateContexts(contexts, videoId);
    } else if (!videoId) {
      // If there's no context, we MUST have a videoId to proceed.
      throw new Error("Cannot generate answer without transcript context or a videoId.");
    }

    try {
      if (contexts.length === 0) {
        // --- Direct-to-video prompt when no transcript is available ---
        // This now uses the official method for prompting with a YouTube URL.
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const result = await this.model.generateContentStream([
          question,
          {
            fileData: {
              mimeType: "video/youtube",
              fileUri: videoUrl,
            },
          },
        ]);
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          yield chunkText;
        }
        return; // Exit the generator after handling the direct-to-video case
      }
      
      // This part of the code is now only for the RAG-based approach
      const chat = this.model.startChat({
        history: [],
        generationConfig: this.generationConfig
      });
      
      const transcriptSegments = contexts.map(c => 
        `[${c.startTimestamp} - ${c.endTimestamp}] ${c.text}`
      ).join('\n');

      const ragPrompt = `
        You are a helpful AI assistant. Answer the user's question based *only* on the following transcript segments from the video.
        Do not use any prior knowledge. If the answer is not in the provided segments, say "I cannot answer that based on the provided transcript."
        When you use information from a segment, cite the start timestamp in your answer, like this: [01:23].
        
        Transcript Segments:
        ---
        ${transcriptSegments}
        ---
        
        User Question: ${question}
      `;
      
      const result = await chat.sendMessageStream(ragPrompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }
    } catch (error) {
      console.error('Error generating answer stream:', error);
      yield "Sorry, I encountered an error while trying to answer your question.";
    }
  }

  // This function is now redundant and will be removed.
  /*
  async *generateAnswerFromYouTubeUrlDirectly(youtubeUrl: string, question: string): AsyncGenerator<string> {
    try {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL provided.');
      }

      const prompt = `
        Please answer the following question about the YouTube video at this URL: ${youtubeUrl}.
        Question: ${question}
      `;
      
      const result = await this.model.generateContentStream([prompt]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }
    } catch (error) {
      console.error('Error in generateAnswerFromYouTubeUrlDirectly:', error);
      yield "Sorry, there was an error processing the video directly.";
    }
  }
  */
}

export const geminiService = new GeminiService(); 