import Anthropic from '@anthropic-ai/sdk';

// Define the structure for context items
interface TranscriptChunk {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
}

export class AnthropicService {
  private anthropic: Anthropic;
  private model: string;

  constructor(model: string = "claude-3-opus-20240229") {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = model;
  }

  public async generateAnswer(context: Array<TranscriptChunk>, question: string): Promise<string> {
    const contextString = context
      .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
      .join('\n\n'); // Join with double newline for better separation

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

Human: ${question}

Assistant:`; // The model will start its response here.

    try {
      const completion = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024, // Adjust as needed
        messages: [
          { role: "user", content: prompt }
        ]
      });

      // Ensure there is content and it's in the expected format
      if (completion.content && completion.content.length > 0 && completion.content[0].type === "text") {
        return completion.content[0].text.trim();
      } else {
        throw new Error("No text response or unexpected format from Anthropic API.");
      }
    } catch (error) {
      console.error("Error generating answer from Anthropic:", error);
      throw new Error("Failed to generate answer from Anthropic.");
    }
  }
}

export const anthropicService = new AnthropicService();
