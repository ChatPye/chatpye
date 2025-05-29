import { MongoClient, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export interface VideoJob {
  jobId: string;
  youtubeUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptStatus: 'found' | 'not_found' | 'processing' | 'error';
  progress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptChunk {
  jobId: string;
  chunkId: string;
  textContent: string;
  startTimestamp: string;
  endTimestamp: string;
  embedding: number[];
}

let videoJobsCollection: Collection<VideoJob>;
let transcriptChunksCollection: Collection<TranscriptChunk>;

export async function getCollections() {
  if (!videoJobsCollection || !transcriptChunksCollection) {
    const client = await clientPromise;
    const db = client.db('chatpye');
    
    videoJobsCollection = db.collection<VideoJob>('videoJobs');
    transcriptChunksCollection = db.collection<TranscriptChunk>('transcriptChunks');
    
    // Create indexes if they don't exist
    await videoJobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await transcriptChunksCollection.createIndex({ jobId: 1 });
  }
  
  return { videoJobsCollection, transcriptChunksCollection };
}

export async function getVideoJob(jobId: string): Promise<VideoJob | null> {
  const { videoJobsCollection } = await getCollections();
  return videoJobsCollection.findOne({ jobId });
}

export async function createVideoJob(job: Omit<VideoJob, 'createdAt' | 'updatedAt'>): Promise<VideoJob> {
  const { videoJobsCollection } = await getCollections();
  const now = new Date();
  const newJob: VideoJob = {
    ...job,
    createdAt: now,
    updatedAt: now
  };
  
  await videoJobsCollection.insertOne(newJob);
  return newJob;
}

export async function updateVideoJob(jobId: string, update: Partial<VideoJob>): Promise<void> {
  const { videoJobsCollection } = await getCollections();
  await videoJobsCollection.updateOne(
    { jobId },
    { 
      $set: { 
        ...update,
        updatedAt: new Date()
      }
    }
  );
}

export async function createTranscriptChunks(chunks: TranscriptChunk[]): Promise<void> {
  if (!chunks || chunks.length === 0) {
    return;
  }
  const { transcriptChunksCollection } = await getCollections();
  await transcriptChunksCollection.insertMany(chunks);
}

export async function getTranscriptChunks(jobId: string): Promise<TranscriptChunk[]> {
  const { transcriptChunksCollection } = await getCollections();
  return transcriptChunksCollection.find({ jobId }).toArray();
}

export async function updateTranscriptChunkEmbeddings(jobId: string, chunkId: string, embedding: number[]): Promise<void> {
  const { transcriptChunksCollection } = await getCollections();
  await transcriptChunksCollection.updateOne(
    { jobId, chunkId },
    { $set: { embedding } }
  );
}

export async function closeDatabaseConnection() {
  const client = await clientPromise;
  await client.close();
} 