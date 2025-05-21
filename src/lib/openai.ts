import OpenAI from 'openai';

// Define the structure for context items
interface TranscriptChunk {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set.");
}

export class OpenAIService {
  private openai: OpenAI;
  private model: string;

  constructor(model: string = "gpt-3.5-turbo") {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model;
  }

  public async generateAnswer(context: Array<TranscriptChunk>, question: string): Promise<string> {
    const contextString = context
      .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
      .join('\n\n'); // Join with double newline for better separation

    const systemMessageContent = `You are ChatPye, an AI-powered video learning companion. Your primary goal is to provide intelligent, insightful, and helpful answers based on the provided transcript of a video.

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
    *   If the transcript segments do not contain information to answer the QUESTION, clearly state that the information is not found in the provided context. Do not try to answer from external knowledge.`;

    const userMessageContent = `TRANSCRIPT SEGMENTS:
${contextString}

QUESTION:
${question}

Answer (Formatted in Markdown):`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemMessageContent },
          { role: "user", content: userMessageContent }
        ],
        // max_tokens can be adjusted as needed
      });

      const textResponse = completion.choices[0]?.message?.content;
      if (!textResponse) {
        throw new Error("No text response from OpenAI API.");
      }
      return textResponse.trim();
    } catch (error) {
      console.error("Error generating answer from OpenAI:", error);
      throw new Error("Failed to generate answer from OpenAI.");
    }
  }
}

export const openAIService = new OpenAIService();
