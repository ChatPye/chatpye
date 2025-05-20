import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptChunk } from './mongodb';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function findRelevantChunks(
  query: string,
  chunks: TranscriptChunk[],
  topK: number = 3
): Promise<TranscriptChunk[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity scores for each chunk
    const chunksWithScores = chunks.map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by similarity score and get top K chunks
    const relevantChunks = chunksWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);

    return relevantChunks;
  } catch (error) {
    console.error('Error finding relevant chunks:', error);
    throw error;
  }
} 