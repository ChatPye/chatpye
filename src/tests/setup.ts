import { beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { getCollections } from '../lib/mongodb'

let mongod: MongoMemoryServer

// Set up in-memory MongoDB before all tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()

  // Set environment variables for tests
  process.env.MONGODB_URI = uri
  process.env.GOOGLE_AI_KEY = process.env.TEST_GOOGLE_AI_KEY || 'test-key'
  
  // The test environment is automatically set by Vitest
  // We don't need to set NODE_ENV manually
})

// Clean up after all tests
afterAll(async () => {
  await mongod.stop()
})

// Clean up collections before each test
beforeEach(async () => {
  const { videoJobsCollection, transcriptChunksCollection } = await getCollections()
  
  if (!videoJobsCollection || !transcriptChunksCollection) {
    throw new Error('Required collections not initialized')
  }

  // Delete all documents from collections
  await videoJobsCollection.deleteMany({})
  await transcriptChunksCollection.deleteMany({})
}) 