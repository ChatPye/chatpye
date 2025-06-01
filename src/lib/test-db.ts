import { MongoClient, MongoError } from 'mongodb'
import { connectToDatabase, closeDatabaseConnection } from './mongodb'

export async function testConnection() {
  try {
    const db = await connectToDatabase()
    console.log('Successfully connected to MongoDB!')
    
    // Test database operations
    const result = await db.collection('test').insertOne({
      test: 'connection',
      timestamp: new Date()
    })
    
    console.log('Test document inserted:', result)
    
    // Clean up test document
    await db.collection('test').deleteOne({ _id: result.insertedId })
    
    // Close the connection
    await closeDatabaseConnection()
    
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