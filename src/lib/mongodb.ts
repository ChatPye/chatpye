import { Collection, Db, MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

// Define interfaces for your data structures
export interface VideoJob {
  _id?: ObjectId;
  jobId: string;
  youtubeUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptStatus?: 'processing' | 'found' | 'not_found' | 'failed' | 'error';
  progress?: string; // Optional progress message
  createdAt?: Date;
  updatedAt?: Date;
  // You might add more fields like videoTitle, duration, etc.
}

export interface TranscriptChunk {
  _id?: ObjectId;
  jobId: string;
  chunkId: string; // e.g., jobId-chunkIndex
  textContent: string;
  startTimestamp: string; // Store as string, consistent with current RAG use
  endTimestamp: string;   // Store as string
  embedding?: number[]; // Array of numbers for the embedding
  createdAt?: Date;
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

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'chatpye_db'; // Default DB name

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

let client: MongoClient | null = null;
let db: Db | null = null;

interface Collections {
  videoJobsCollection?: Collection<VideoJob>;
  transcriptChunksCollection?: Collection<TranscriptChunk>;
  cachedVideoQACollection?: Collection<CachedQAResponse>;
}

const collections: Collections = {};

async function connectToDatabase(): Promise<Db> {
  if (db && client) {
    // TODO: Verify client connection state if possible, e.g. client.isConnected()
    // For serverless, creating new connections per request or short-lived connections might be okay.
    // For long-running servers, maintaining a persistent connection is better.
    // This simple check assumes client remains connected.
    return db;
  }

  if (!MONGODB_URI) {
    throw new Error('MongoDB URI is not defined.');
  }

  client = new MongoClient(MONGODB_URI, {
    serverApi: ServerApiVersion.v1, // Or your specific server API version
    // Consider adding connection pool options, timeouts, etc.
    // useNewUrlParser: true, // Deprecated
    // useUnifiedTopology: true, // Deprecated
  });

  try {
    await client.connect();
    db = client.db(MONGODB_DB_NAME);
    console.log('Successfully connected to MongoDB.');

    // Initialize collections
    collections.videoJobsCollection = db.collection<VideoJob>('videoJobs');
    collections.transcriptChunksCollection = db.collection<TranscriptChunk>('transcriptChunks');
    collections.cachedVideoQACollection = db.collection<CachedQAResponse>('cachedVideoQA');
    
    // Create Indexes (idempotent - only creates if they don't exist)
    await collections.videoJobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await collections.transcriptChunksCollection.createIndex({ jobId: 1, chunkId: 1 }, { unique: true });
    await collections.transcriptChunksCollection.createIndex({ jobId: 1 }); // For fetching all chunks for a job
    // Index for Q&A cache
    await collections.cachedVideoQACollection.createIndex(
        { jobId: 1, questionTextNormalized: 1, modelUsed: 1, cacheType: 1 },
        { name: "user_question_cache_idx" }
    );
    await collections.cachedVideoQACollection.createIndex(
        { jobId: 1, analysisType: 1, modelUsed: 1, cacheType: 1 },
        { name: "proactive_analysis_cache_idx" }
    );

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // If connection fails, subsequent calls to getDb will also fail until successful.
    // Consider how to handle this in your application lifecycle.
    // For now, rethrow to make it clear connection failed.
    throw error; 
  }
}

// Export a function to get specific collections, ensuring DB connection
export async function getCollections(): Promise<Collections> {
  if (!db || !client) { // Or add more robust connection check
    await connectToDatabase();
  }
  if (!collections.videoJobsCollection || !collections.transcriptChunksCollection || !collections.cachedVideoQACollection) {
    // This might happen if connectToDatabase was called but collections weren't set (shouldn't occur with current logic)
    // Or if db connection was lost and re-established without re-setting collections object.
    // For simplicity, re-run connectToDatabase which also sets collections.
    await connectToDatabase();
  }
  return collections;
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
  await transcriptChunksCollection.insertMany(chunksToInsert);
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