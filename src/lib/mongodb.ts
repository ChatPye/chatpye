import { Collection, Db, MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { getEnvVar, getOptionalEnvVar, isTestEnvironment } from './env';

// Define interfaces for your data structures
export interface VideoJob {
  _id?: ObjectId;
  jobId: string;
  youtubeUrl: string;
  userId: string;           // Add user ID to track ownership
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptStatus?: 'processing' | 'found' | 'not_found' | 'failed' | 'error';
  progress?: string; // Optional progress message
  createdAt?: Date;
  updatedAt?: Date;
  processingMetadata?: {
    videoId: string;
    videoTitle?: string;
    processingStartTime?: Date;
    processingEndTime?: Date;
    transcriptSource?: 'youtube' | 'manual' | 'reused';
    originalJobId?: string;  // If this is a reused transcript, track the original job
  };
  // You might add more fields like videoTitle, duration, etc.
}

export interface TranscriptChunk {
  _id?: ObjectId;
  jobId: string;
  userId: string;
  chunkId: string;
  textContent: string;
  startTimestamp: string;
  endTimestamp: string;
  segmentCount: number;
  embedding: number[];
  metadata: {
    processingVersion: number;
    videoId: string;
    originalJobId?: string;
  };
}

export interface CachedQAResponse {
  _id?: ObjectId;
  jobId: string; // References the VideoJob.jobId (identifies the video)
  cacheType: 'user_question' | 'proactive_analysis';
  questionTextNormalized?: string; // For user_question type
  analysisType?: string; // For proactive_analysis type (e.g., "proactive_summary_topics_takeaways")
  responseText: string;
  modelUsed: string; // e.g., "gemini-1.5-pro-direct-youtube"
  createdAt: Date;
  updatedAt: Date; // To know when it was last updated (for upsert)
  // sourceLanguage?: string; // Future use
  // structuredResponseData?: any; // Future use for structured proactive analysis
}

// MongoDB connection state
let client: MongoClient | null = null;
let db: Db | null = null;

// Collection references with proper typing
let videoJobsCollection: Collection<VideoJob> | null = null;
let transcriptChunksCollection: Collection<TranscriptChunk> | null = null;
let cachedVideoQACollection: Collection<CachedQAResponse> | null = null;

/**
 * Connects to the MongoDB database
 * @throws Error if connection fails or required environment variables are missing
 */
export async function connectToDatabase() {
  if (db && client) {
    return { db, client };
  }

  try {
    // Get MongoDB URI from environment
    const uri = isTestEnvironment() 
      ? process.env.MONGODB_URI 
      : getEnvVar('MONGODB_URI');

    if (!uri) {
      throw new Error('MONGODB_URI is not set');
    }

    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();

    // Get database name from environment or use default
    const dbName = getOptionalEnvVar('MONGODB_DB_NAME');
    db = client.db(dbName);

    // Initialize collections with proper typing
    videoJobsCollection = db.collection<VideoJob>('videoJobs');
    transcriptChunksCollection = db.collection<TranscriptChunk>('transcriptChunks');
    cachedVideoQACollection = db.collection<CachedQAResponse>('cachedQAResponses');

    // Create indexes
    await videoJobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await videoJobsCollection.createIndex({ 'processingMetadata.videoId': 1 });
    await transcriptChunksCollection.createIndex({ jobId: 1 });
    await transcriptChunksCollection.createIndex({ 'metadata.videoId': 1 });

    return { db, client };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Export a function to get specific collections, ensuring DB connection
export async function getCollections(): Promise<{
  videoJobsCollection?: Collection<VideoJob>;
  transcriptChunksCollection?: Collection<TranscriptChunk>;
  cachedVideoQACollection?: Collection<CachedQAResponse>;
}> {
  if (!db || !client) {
    await connectToDatabase();
  }

  // Return collections with proper typing
  return {
    videoJobsCollection: videoJobsCollection || undefined,
    transcriptChunksCollection: transcriptChunksCollection || undefined,
    cachedVideoQACollection: cachedVideoQACollection || undefined
  };
}

// --- Video Job Functions ---
export async function createVideoJob(jobData: Omit<VideoJob, '_id' | 'createdAt' | 'updatedAt'>): Promise<VideoJob> {
  const { videoJobsCollection } = await getCollections();
  if (!videoJobsCollection) throw new Error("videoJobsCollection not initialized");

  const newJob: VideoJob = {
    ...jobData,
    status: jobData.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await videoJobsCollection.insertOne(newJob);
  if (!result.insertedId) {
    throw new Error('Failed to create video job.');
  }
  return { ...newJob, _id: result.insertedId };
}

export async function getVideoJob(jobId: string): Promise<VideoJob | null> {
  const { videoJobsCollection } = await getCollections();
  if (!videoJobsCollection) throw new Error("videoJobsCollection not initialized");
  return videoJobsCollection.findOne({ jobId });
}

export async function updateVideoJob(jobId: string, updates: Partial<VideoJob>): Promise<boolean> {
  const { videoJobsCollection } = await getCollections();
  if (!videoJobsCollection) throw new Error("videoJobsCollection not initialized");

  const result = await videoJobsCollection.updateOne(
    { jobId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

// --- Transcript Chunk Functions ---
export async function createTranscriptChunks(chunksData: TranscriptChunk[]): Promise<void> {
  const { transcriptChunksCollection } = await getCollections();
  if (!transcriptChunksCollection) throw new Error("transcriptChunksCollection not initialized");
  if (chunksData.length === 0) return;

  const chunksToInsert = chunksData.map(chunk => ({
    ...chunk,
    createdAt: new Date()
  }));

  try {
    // First, delete any existing chunks for this job and user
    if (chunksToInsert.length > 0) {
      await transcriptChunksCollection.deleteMany({ 
        jobId: chunksToInsert[0].jobId,
        userId: chunksToInsert[0].userId 
      });
    }

    // Then insert the new chunks
    const result = await transcriptChunksCollection.insertMany(chunksToInsert);
    console.log(`Successfully inserted ${result.insertedCount} transcript chunks`);
  } catch (error) {
    console.error('Error in createTranscriptChunks:', error);
    throw new Error(`Failed to create transcript chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getTranscriptChunks(jobId: string): Promise<TranscriptChunk[]> {
  const { transcriptChunksCollection } = await getCollections();
  if (!transcriptChunksCollection) throw new Error("transcriptChunksCollection not initialized");
  return transcriptChunksCollection.find({ jobId }).sort({ startTimestamp: 1 }).toArray(); // Sort by start time
}

export async function updateTranscriptChunkEmbeddings(jobId: string, chunkId: string, embedding: number[]): Promise<boolean> {
    const { transcriptChunksCollection } = await getCollections();
    if (!transcriptChunksCollection) throw new Error("transcriptChunksCollection not initialized");

    const result = await transcriptChunksCollection.updateOne(
        { jobId, chunkId },
        { $set: { embedding } }
    );
    return result.modifiedCount > 0;
}

// Add a new function to get user-specific transcript chunks
export async function getUserTranscriptChunks(jobId: string, userId: string): Promise<TranscriptChunk[]> {
  const { transcriptChunksCollection } = await getCollections();
  if (!transcriptChunksCollection) throw new Error("transcriptChunksCollection not initialized");
  
  return transcriptChunksCollection
    .find({ jobId, userId })
    .sort({ startTimestamp: 1 })
    .toArray();
}

// Add a function to verify transcript ownership
export async function verifyTranscriptOwnership(jobId: string, userId: string): Promise<boolean> {
  const { videoJobsCollection } = await getCollections();
  if (!videoJobsCollection) throw new Error("videoJobsCollection not initialized");
  
  const job = await videoJobsCollection.findOne({ jobId, userId });
  return !!job;
}

// Add type-safe transcript retrieval function
export async function getTranscriptChunksByVideoId(videoId: string, userId: string): Promise<TranscriptChunk[]> {
  const { transcriptChunksCollection } = await getCollections();
  if (!transcriptChunksCollection) throw new Error("transcriptChunksCollection not initialized");
  
  return transcriptChunksCollection.find({
    'metadata.videoId': videoId,
    userId
  }).toArray();
}

// Add function to verify transcript-videoId match
export async function verifyTranscriptVideoId(jobId: string, videoId: string): Promise<boolean> {
  const { videoJobsCollection } = await getCollections();
  if (!videoJobsCollection) throw new Error("videoJobsCollection not initialized");
  
  const job = await videoJobsCollection.findOne({ 
    jobId,
    'processingMetadata.videoId': videoId 
  });
  return !!job;
}

// --- Q&A Cache Functions ---
export async function getCachedQAResponse(
  jobId: string, 
  normalizedQuestionText: string, 
  modelUsed: string
): Promise<CachedQAResponse | null> {
  const { cachedVideoQACollection } = await getCollections();
  if (!cachedVideoQACollection) throw new Error("cachedVideoQACollection not initialized");
  
  // console.log(`CACHE_LOOKUP: jobId=${jobId}, question='${normalizedQuestionText}', model='${modelUsed}'`); // Debug
  const response = await cachedVideoQACollection.findOne({
    jobId,
    questionTextNormalized: normalizedQuestionText, // Ensure this matches the field name used in saveQAResponse
    modelUsed,
    cacheType: 'user_question'
  });
  // if (response) console.log("CACHE_HIT"); else console.log("CACHE_MISS"); // Debug
  return response;
}

export async function getCachedProactiveAnalysis(
  jobId: string,
  analysisType: string,
  modelUsed: string
): Promise<CachedQAResponse | null> {
  const { cachedVideoQACollection } = await getCollections();
  if (!cachedVideoQACollection) throw new Error("cachedVideoQACollection not initialized");
  return cachedVideoQACollection.findOne({
    jobId,
    analysisType,
    modelUsed,
    cacheType: 'proactive_analysis'
  });
}

export async function saveQAResponse(
  jobId: string, 
  questionOrAnalysisType: string, // For user_question, this is normalizedQuestionText; for proactive, it's analysisType
  modelUsed: string, 
  responseText: string,
  cacheType: 'user_question' | 'proactive_analysis' = 'user_question' // Default to user_question
): Promise<void> {
  const { cachedVideoQACollection } = await getCollections();
  if (!cachedVideoQACollection) throw new Error("cachedVideoQACollection not initialized");

  const now = new Date();
  let filter: any;
  let updateData: any;

  if (cacheType === 'user_question') {
    filter = { jobId, questionTextNormalized: questionOrAnalysisType, modelUsed, cacheType };
    updateData = {
      $set: { responseText, updatedAt: now },
      $setOnInsert: { jobId, questionTextNormalized: questionOrAnalysisType, modelUsed, cacheType, createdAt: now }
    };
  } else { // proactive_analysis
    filter = { jobId, analysisType: questionOrAnalysisType, modelUsed, cacheType };
    updateData = {
      $set: { responseText, updatedAt: now },
      $setOnInsert: { jobId, analysisType: questionOrAnalysisType, modelUsed, cacheType, createdAt: now }
    };
  }
  
  try {
    // console.log(`CACHE_SAVE: jobId=${jobId}, key='${questionOrAnalysisType}', model='${modelUsed}', type='${cacheType}'`); // Debug
    await cachedVideoQACollection.updateOne(filter, updateData, { upsert: true });
    // console.log("CACHE_SAVE successful"); // Debug
  } catch (error) {
    console.error("Error saving Q&A response to cache:", error);
    // Decide if this error should be propagated or just logged
    // For async background saves, logging might be sufficient.
  }
}

// Optional: Function to clear MongoDB client connection (e.g., for graceful shutdown)
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed.');
  }
} 