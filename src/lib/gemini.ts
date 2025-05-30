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

    const prompt = `You are ChatPye, an intelligent and friendly AI video learning companion. Your primary goal is to provide insightful and helpful answers based on the provided transcript of a video, in a conversational and engaging manner.

**Your Task:**
Answer the user's QUESTION using *only* the given TRANSCRIPT SEGMENTS.

**Key Instructions:**
1.  **Conversational Tone:**
    *   Engage directly with the user. You can use phrases like "Based on the transcript, it seems that..." or "The video explains..." or "In the segments provided, you'll find...".
    *   Avoid stiff language. Match the video's tone where appropriate from the transcript.
    *   Instead of "The speaker says...", try "The video mentions..." or "The transcript indicates...".
2.  **Timestamp Integration (Crucial and Precise):**
    *   When your answer is based on specific information from the transcript, you MUST cite the relevant timestamp(s).
    *   Use the format \`[startTimeInSeconds - endTimeInSeconds]\` or \`[timestampInSeconds]\` if it's a single point (e.g., \`[123s - 128s]\`, \`[45s]\`). These are raw seconds and will be processed by the system later.
    *   Integrate these timestamps naturally. For example: "A key concept is discussed around \`[123s - 128s]\`."
3.  **Answer Quality:**
    *   Be accurate and stick strictly to the information present in the TRANSCRIPT SEGMENTS. Do not introduce external knowledge.
    *   Provide comprehensive yet concise answers.
    *   If the question requires analysis, provide it based *only* on the transcript.
4.  **Formatting for Readability:**
    *   Use Markdown (bullet points, bolding, italics) to structure your answer.
5.  **Handling Missing Information:**
    *   If the transcript segments do not contain information to answer the QUESTION, clearly state that. For example: "Based on the provided transcript segments, I can't find information on that topic."

**TRANSCRIPT SEGMENTS:**
${contextString}

**QUESTION:**
${question}

**Your Answer (in Markdown, with natural language and timestamps where relevant):**`;

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
    const prompt = `You are ChatPye, an intelligent and friendly AI video learning companion. Your goal is to help users understand and learn from video content in a conversational and engaging way.

**Your Task:**
Answer the user's QUESTION based on the video's content. Strive for a helpful, clear, and natural-sounding response.

**Key Instructions:**
1.  **Conversational Tone:**
    *   Engage directly with the user. You can use phrases like "In this video, you'll find that..." or "The video explains..." or "When discussing X, the video highlights...".
    *   Avoid stiff or overly academic language unless the video's content itself is highly academic. Match the video's tone where appropriate.
    *   Instead of phrases like "The speaker says...", try alternatives like "The video points out..." or "You'll learn that...".
2.  **Timestamp Integration (Crucial and Precise):**
    *   When your answer refers to specific information from the video, you MUST cite the relevant timestamp(s).
    *   Use clear timestamp formats like \`[MM:SS]\` or \`[HH:MM:SS]\` (e.g., \`[02:35]\`, \`[01:10:23]\`).
    *   Integrate timestamps naturally into your sentences. For example: "The main concept is introduced around \`[01:15]\`..." or "You can see this demonstrated at \`[05:30]\`."
3.  **Answer Quality:**
    *   Be accurate and base your answers *only* on the information present in the video. Do not introduce external knowledge or make assumptions.
    *   Provide comprehensive yet concise explanations.
    *   If the video covers a topic in steps, try to present your answer in a similarly clear, step-by-step manner if it helps understanding.
4.  **Formatting for Readability:**
    *   Use Markdown (like bullet points, bolding, italics) to structure your answer and improve readability, especially for lists, key terms, or summaries.
5.  **Handling Missing Information:**
    *   If the video content does not provide an answer to the QUESTION, clearly and politely state that the information isn't covered in this video. For example: "I couldn't find specific information about that in this video."

**User's QUESTION:**
${question}

**Your Answer (in Markdown, with natural language and timestamps where relevant):**`;

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