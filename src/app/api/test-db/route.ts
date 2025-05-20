import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/test-db'

export async function GET() {
  try {
    const isConnected = await testConnection()
    
    if (isConnected) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Successfully connected to MongoDB!' 
      })
    } else {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Failed to connect to MongoDB' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error testing MongoDB connection:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error testing MongoDB connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 