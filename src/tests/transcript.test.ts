import { describe, it, expect, beforeEach } from 'vitest';
import { getTranscriptChunksByVideoId, verifyTranscriptVideoId, getCollections } from '../lib/mongodb';
import { MockGeminiService } from './mocks/gemini';
import { GeminiService } from '../lib/gemini';

type TranscriptContext = Parameters<GeminiService['generateAnswerStream']>[0][0];

describe('Transcript Isolation Tests', () => {
  const geminiService = new MockGeminiService();
  const videoId1 = 'test_video_1';
  const videoId2 = 'test_video_2';
  const userId = 'test_user';

  beforeEach(async () => {
    const collections = await getCollections();
    const { videoJobsCollection, transcriptChunksCollection } = collections;
    
    if (!videoJobsCollection || !transcriptChunksCollection) {
      throw new Error('Required collections not initialized');
    }
    
    // Clean up existing test data
    await videoJobsCollection.deleteMany({});
    await transcriptChunksCollection.deleteMany({});

    // Create test job for video 1
    await videoJobsCollection.insertOne({
      jobId: 'job1',
      youtubeUrl: `https://youtube.com/watch?v=${videoId1}`,
      userId,
      status: 'completed',
      transcriptStatus: 'found',
      processingMetadata: {
        videoId: videoId1
      }
    });

    // Create test job for video 2
    await videoJobsCollection.insertOne({
      jobId: 'job2',
      youtubeUrl: `https://youtube.com/watch?v=${videoId2}`,
      userId,
      status: 'completed',
      transcriptStatus: 'found',
      processingMetadata: {
        videoId: videoId2
      }
    });

    // Create test transcript chunks for video 1
    await transcriptChunksCollection.insertOne({
      jobId: 'job1',
      userId,
      chunkId: 'job1-0',
      textContent: 'This is from video 1',
      startTimestamp: '0',
      endTimestamp: '10',
      segmentCount: 1,
      embedding: [],
      metadata: {
        processingVersion: 1,
        videoId: videoId1
      }
    });

    // Create test transcript chunks for video 2
    await transcriptChunksCollection.insertOne({
      jobId: 'job2',
      userId,
      chunkId: 'job2-0',
      textContent: 'This is from video 2',
      startTimestamp: '0',
      endTimestamp: '10',
      segmentCount: 1,
      embedding: [],
      metadata: {
        processingVersion: 1,
        videoId: videoId2
      }
    });
  });

  it('should maintain transcript isolation between different videos', async () => {
    const chunks1 = await getTranscriptChunksByVideoId(videoId1, userId);
    const chunks2 = await getTranscriptChunksByVideoId(videoId2, userId);

    expect(chunks1).not.toEqual(chunks2);
    expect(chunks1[0].metadata.videoId).toBe(videoId1);
    expect(chunks2[0].metadata.videoId).toBe(videoId2);
  });

  it('should prevent transcript mixing in QA responses', async () => {
    const question = 'What is the content?';
    
    // Test with correct videoId
    const validResponse = await geminiService.generateAnswerStream(
      [{
        text: 'Test content',
        startTimestamp: '0',
        endTimestamp: '10',
        jobId: 'job1',
        videoId: videoId1
      } as TranscriptContext]
    ).next();

    expect(validResponse.done).toBe(false);
    expect(validResponse.value).toContain(videoId1);

    // Test with incorrect videoId
    await expect(
      geminiService.generateAnswerStream(
        [{
          text: 'Test content',
          startTimestamp: '0',
          endTimestamp: '10',
          jobId: 'job1',
          videoId: videoId2
        } as TranscriptContext]
      ).next()
    ).rejects.toThrow('Transcript context does not match the provided videoId');
  });

  it('should verify transcript ownership and videoId match', async () => {
    const isValid = await verifyTranscriptVideoId('job1', videoId1);
    expect(isValid).toBe(true);

    const isInvalid = await verifyTranscriptVideoId('job1', videoId2);
    expect(isInvalid).toBe(false);
  });
}); 