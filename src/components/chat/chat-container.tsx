"use client"

import React, { useState, useEffect, useRef } from "react"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendHorizontal } from "lucide-react"
import { VideoStatus } from "@/components/video/video-status"
import { Card } from "@/components/ui/card"

interface ChatContainerProps {
  jobId: string
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

export function ChatContainer({ jobId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [videoStatus, setVideoStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/video/status/${jobId}`)
        if (!response.ok) throw new Error("Failed to fetch status")
        const data = await response.json()
        setVideoStatus(data.status)
        setStatusMessage(data.message || "")
      } catch (error) {
        console.error("Error fetching video status:", error)
        setVideoStatus('failed')
        setStatusMessage("Failed to fetch video status")
      }
    }

    const interval = setInterval(pollStatus, 2000)
    return () => clearInterval(interval)
  }, [jobId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          jobId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.message }])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <VideoStatus status={videoStatus} message={statusMessage} />
        {videoStatus === 'processing' && (
          <p className="text-sm text-indigo-600 mt-2">
            This process typically takes 3-5 minutes. You can start asking questions once it's complete.
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-indigo-600">Example Prompts</h3>
            <div className="space-y-2">
              <button
                onClick={() => setInputValue("What are the key points in this video?")}
                className="w-full text-left text-sm text-gray-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 transition-colors"
              >
                What are the key points in this video?
              </button>
              <button
                onClick={() => setInputValue("Can you summarize this video?")}
                className="w-full text-left text-sm text-gray-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 transition-colors"
              >
                Can you summarize this video?
              </button>
              <button
                onClick={() => setInputValue("What are the main takeaways?")}
                className="w-full text-left text-sm text-gray-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 transition-colors"
              >
                What are the main takeaways?
              </button>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
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
            <div className="bg-indigo-50 text-indigo-600 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask a question about the video..."
            className="flex-1 focus:border-indigo-600 focus:ring-indigo-600"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
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