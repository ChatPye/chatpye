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
      const prompt = `Given the following context from a video transcript, answer the question.
      If possible, also include the timestamp(s) from the context where the answer can be found.

      Context:
      ${context.map(c => `[${c.startTimestamp} - ${c.endTimestamp}] ${c.text}`).join('\n')}

      Question: ${question}

      Answer:`;

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