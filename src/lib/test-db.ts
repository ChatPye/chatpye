import { MongoClient, MongoError } from 'mongodb'
import clientPromise from './mongodb'

export async function testConnection() {
  try {
    const client = await clientPromise
    console.log('Successfully connected to MongoDB!')
    
    // Test database operations
    const db = client.db('chatpye')
    const result = await db.collection('test').insertOne({
      test: 'connection',
      timestamp: new Date()
    })
    
    console.log('Test document inserted:', result)
    
    // Clean up test document
    await db.collection('test').deleteOne({ _id: result.insertedId })
    
    return true
  } catch (error) {
    if (error instanceof MongoError) {
      console.error('MongoDB connection error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errorLabels: error.errorLabels
      })
    } else {
      console.error('Unknown error:', error)
    }
    return false
  }
} 