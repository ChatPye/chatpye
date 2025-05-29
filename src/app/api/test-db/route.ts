import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET() {
  try {
    // Get MongoDB URI from environment variable
    const MONGODB_URI = process.env.MONGODB_URI
    
    if (!MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI is not defined in environment variables' },
        { status: 500 }
      )
    }

    // Create a new MongoClient
    const client = new MongoClient(MONGODB_URI)

    // Connect to MongoDB
    await client.connect()
    
    // Get database info
    const db = client.db()
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(col => col.name)
    
    // Get some basic stats
    const stats = await db.stats()
    
    // Close the connection
    await client.close()

    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to MongoDB',
      database: db.databaseName,
      collections: collectionNames,
      stats: {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize
      }
    })

  } catch (error) {
    console.error('MongoDB connection test failed:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to connect to MongoDB',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 