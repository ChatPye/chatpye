import OpenAI from 'openai';

// Define the structure for context items, ensuring consistency
interface TranscriptChunk {
  text: string;
  startTimestamp: string; // Assuming these are string representations of seconds
  endTimestamp: string;   // Assuming these are string representations of seconds
}

// Environment variable check
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set. OpenAIService will fail if instantiated and used.');
}

export class OpenAIService {
  private openai: OpenAI;
  private model: string;

  constructor(model: string = "gpt-3.5-turbo") { // Default model, can be overridden
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('CRITICAL: OpenAIService cannot be instantiated without OPENAI_API_KEY.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model;
  }

  public async generateAnswer(context: Array<TranscriptChunk>, question: string): Promise<string> {
    console.log("OpenAI: Generating answer for question:", question.substring(0,50)+"...");
    const contextString = context
      .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
      .join('\n\n'); // Using double newline for better separation in prompt

    // System message defining the persona and general instructions
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

    // User message providing the specific context and question
    const userMessageContent = `TRANSCRIPT SEGMENTS:
${contextString}

QUESTION:
${question}

Answer (Formatted in Markdown):`;

    try {
      // console.log("OpenAI: Calling chat.completions.create."); // Debug
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemMessageContent },
          { role: "user", content: userMessageContent }
        ],
        // max_tokens can be adjusted as needed, e.g., 1024 or 1500
      });

      const textResponse = completion.choices[0]?.message?.content;
      if (!textResponse) {
        console.error("OpenAI API returned no text response:", completion);
        throw new Error("No text response from OpenAI API.");
      }
      // console.log("OpenAI: Response received."); // Debug
      return textResponse.trim();
    } catch (error: any) {
      console.error("Error generating answer from OpenAI:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate answer from OpenAI: ${error.message || 'Unknown error'}`);
    }
  }
}

// Create a singleton instance
export const openAIService = new OpenAIService(); // Uses default "gpt-3.5-turbo"
// If you want to use a different model by default, e.g., "gpt-4":
// export const openAIService = new OpenAIService("gpt-4");
