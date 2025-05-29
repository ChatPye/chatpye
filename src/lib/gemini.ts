import { GoogleGenerativeAI, GenerateContentResponse, Part } from "@google/generative-ai";

// It's good practice to ensure API keys are checked before class instantiation if possible,
// or at least make it very clear in documentation that the service will fail without them.
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY environment variable is not set. GeminiService will fail if instantiated and used.');
}

export class GeminiService {
  private model;
  private embeddingModel;
  private genAIInstance: GoogleGenerativeAI; // Renamed for clarity

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('CRITICAL: GeminiService cannot be instantiated without GEMINI_API_KEY.');
    }
    this.genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Consider making model name configurable (e.g., via env var or constructor param)
    this.model = this.genAIInstance.getGenerativeModel({ model: "gemini-1.5-pro" }); 
    this.embeddingModel = this.genAIInstance.getGenerativeModel({ model: "embedding-001" });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error: any) {
      console.error('Error generating Gemini embedding:', JSON.stringify(error, null, 2));
      throw new Error(`Gemini Embedding Error: ${error.message || 'Failed to generate embedding'}`);
    }
  }

  // RAG-based answer generation (streaming) - Retained for potential non-YouTube file use or specific scenarios
  async * generateAnswer(context: Array<{ text: string; startTimestamp: string; endTimestamp: string }>, question: string): AsyncGenerator<string, void, undefined> {
    console.log("Gemini RAG: Generating answer for question:", question.substring(0, 50) + "..."); // Log snippet
    const contextString = context
      .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
      .join('\n\n');

    const prompt = `You are ChatPye, an AI-powered video learning companion. Your primary goal is to provide intelligent, insightful, and helpful answers based on the provided transcript of a video.

**Your Task:**
Answer the user's QUESTION using only the given TRANSCRIPT SEGMENTS.

**Key Instructions:**
1.  **Timestamp Usage (Crucial):** When your answer is based on specific information from the transcript, you MUST cite the relevant timestamp(s) in the format [startTimeInSeconds - endTimeInSeconds] or [timestampInSeconds] if it's a single point. Integrate these timestamps naturally into your response. For example: "The speaker mentions a key concept at [123s - 128s]."
2.  **Answer Quality:**
    *   Be accurate and stick to the information present in the transcript.
    *   Provide comprehensive yet concise answers.
    *   If the question requires analysis, provide it based *only* on the transcript. Do not infer outside information.
    *   Aim for a conversational, engaging, and intelligent tone suitable for a learning environment.
3.  **Formatting:**
    *   Use Markdown (like bullet points, bolding, italics) to structure your answer and improve readability, especially for complex information or lists.
4.  **Handling Missing Information:**
    *   If the transcript segments do not contain information to answer the QUESTION, clearly state that the information is not found in the provided context. Do not try to answer from external knowledge.

**TRANSCRIPT SEGMENTS:**
${contextString}

**QUESTION:**
${question}

**Answer (Formatted in Markdown):**`;

    try {
      // console.log("Gemini RAG: Calling generateContentStream with prompt."); // Debug
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      yield text;
      // console.log("Gemini RAG: Stream generation complete."); // Debug
    } catch (error: any) {
      console.error('Detailed Gemini API Error in RAG service (generateAnswer):', JSON.stringify(error, null, 2));
      throw new Error(`Gemini API RAG Error: ${error.message || 'Failed to get response from Gemini'}`);
    }
  }

  // Direct YouTube URL based answer generation (streaming)
  async * generateAnswerFromYouTubeUrlDirectly(youtubeUrl: string, question: string): AsyncGenerator<string, void, undefined> {
    console.log("Gemini Direct: Generating answer for YouTube URL:", youtubeUrl, "Question:", question.substring(0,50)+"...");
    
    // Instead of trying to process the URL directly, we'll use the RAG approach
    // with the transcript chunks that were already processed
    const prompt = `You are ChatPye, an AI-powered video learning companion. Your task is to answer the user's QUESTION based on the video content.

Key Instructions:
1.  **Timestamp Usage (Crucial):** When your answer is based on specific information from the video, you MUST cite the relevant timestamp(s) (e.g., [MM:SS] or [HH:MM:SS]). Integrate these timestamps naturally.
2.  **Answer Quality:** Be accurate. Provide comprehensive yet concise answers based *only* on the video's content. Do not infer outside information.
3.  **Formatting:** Use Markdown for structure and readability.
4.  **Handling Missing Information:** If the video does not contain information to answer the QUESTION, clearly state that.

QUESTION: ${question}

Answer (Formatted in Markdown, with timestamps where relevant):`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      yield text;
    } catch (error: any) {
      console.error('Detailed Gemini API Error in service (generateAnswerFromYouTubeUrlDirectly):', JSON.stringify(error, null, 2));
      throw new Error(`Gemini API Error: ${error.message || 'Failed to get response from Gemini'}`);
    }
  }
}

// Create a singleton instance
export const geminiService = new GeminiService(); 