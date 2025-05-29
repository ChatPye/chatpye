import Anthropic from '@anthropic-ai/sdk';

// Define the structure for context items, ensuring consistency
interface TranscriptChunk {
  text: string;
  startTimestamp: string; // Assuming these are string representations of seconds
  endTimestamp: string;   // Assuming these are string representations of seconds
}

// Environment variable check
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY environment variable is not set. AnthropicService will fail if instantiated and used.');
}

export class AnthropicService {
  private anthropic: Anthropic;
  private model: string;

  constructor(model: string = "claude-3-opus-20240229") { // Default model, can be overridden
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('CRITICAL: AnthropicService cannot be instantiated without ANTHROPIC_API_KEY.');
    }
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = model;
  }

  public async generateAnswer(context: Array<TranscriptChunk>, question: string): Promise<string> {
    console.log("Anthropic: Generating answer for question:", question.substring(0,50)+"...");
    const contextString = context
      .map(c => `[${c.startTimestamp}s - ${c.endTimestamp}s] ${c.text}`)
      .join('\n\n'); // Using double newline for better separation

    // Construct the prompt for Anthropic, ensuring it follows the Human/Assistant turn structure
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

Assistant:`; // The model will generate content starting from here

    try {
      // console.log("Anthropic: Calling messages.create."); // Debug
      const completion = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048, // Increased max_tokens for potentially longer, well-formatted answers
        messages: [
          { role: "user", content: prompt }
          // Anthropic's new Messages API typically uses a list of messages.
          // The entire prompt including system instructions and the "Human: ..." turn
          // can be placed within a single user message like this.
        ]
      });

      // console.log("Anthropic: Response received."); // Debug

      // Ensure there is content and it's in the expected text format
      if (completion.content && completion.content.length > 0 && completion.content[0].type === "text") {
        return completion.content[0].text.trim();
      } else {
        console.error("Anthropic API returned no text response or unexpected format:", completion);
        throw new Error("No text response or unexpected format from Anthropic API.");
      }
    } catch (error: any) {
      console.error("Error generating answer from Anthropic:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate answer from Anthropic: ${error.message || 'Unknown error'}`);
    }
  }
}

// Create a singleton instance
export const anthropicService = new AnthropicService(); // Uses default "claude-3-opus-20240229"
// If you prefer another model like claude-3-sonnet-20240229 or claude-3-haiku-20240307 for different cost/speed:
// export const anthropicService = new AnthropicService("claude-3-sonnet-20240229");
