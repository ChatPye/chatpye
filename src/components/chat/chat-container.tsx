"use client"

import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendHorizontal, Loader2 } from "lucide-react"
import { VideoStatus } from "@/components/video/video-status"
import { Card } from "@/components/ui/card"

interface ChatContainerProps {
  jobId?: string | null
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

const examplePrompts = [
  "What are the key points in this video?",
  "Can you summarize this video?",
  "What are the main takeaways?"
]

export function ChatContainer({ jobId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !jobId) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages((prev: Message[]) => [...prev, newMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          jobId
        }),
      })

      const data = await response.json()
      
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExamplePrompt = (prompt: string) => {
    setInputValue(prompt)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {processingStatus && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <VideoStatus status={processingStatus} />
            <p className="text-sm text-gray-500 mt-2">
              Processing may take 3-5 minutes. You can ask questions once it's complete.
            </p>
          </div>
        )}
        
        {messages.length === 0 && !processingStatus && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900">Example Questions</h3>
            <div className="space-y-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExamplePrompt(prompt)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-indigo-50 text-indigo-600 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask a question about the video..."
            className="flex-1 focus:border-indigo-600 focus:ring-indigo-600"
            disabled={isLoading || !!processingStatus}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim() || !!processingStatus}
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 