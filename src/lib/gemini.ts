import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Please add your Gemini API key to .env.local');
}

export class GeminiService {
  private model;
  private embeddingModel;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    this.embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateAnswer(context: Array<{ text: string; startTimestamp: string; endTimestamp: string }>, question: string): Promise<string> {
    try {
      const contextString = context
        .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
        .join('\n\n'); // Join with double newline for better separation if needed

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

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const geminiService = new GeminiService(); 