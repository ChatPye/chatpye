"use client"

import React, { useEffect, useRef } from "react"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Loader2 } from "lucide-react"
import { VideoStatus } from "@/components/video/video-status"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { User } from "firebase/auth"

// Interface for messages, aligned with page.tsx and ChatTabs.tsx
export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp?: string 
  fromCache?: boolean
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed'

const examplePrompts = [
  "Give me insights from this video",
  "Explain this video to me like I am 5",
  "What are the key takeaways from this video"
]

interface ChatContainerProps {
  jobId: string | null
  videoId: string | null
  currentUser: User | null
  onSignInClick?: () => void
  disabled?: boolean
  messages: Message[]
  inputValue: string
  onInputChange: (value: string) => void
  onSendMessage: () => Promise<void>
  isLoading: boolean
  processingStatus: ProcessingStatus
  processingMessage?: string
}

export function ChatContainer({
  jobId,
  videoId,
  currentUser,
  onSignInClick,
  disabled,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isLoading,
  processingStatus,
  processingMessage
}: ChatContainerProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Video Status Section */}
      {processingStatus !== 'idle' && (
        <div className="flex-shrink-0 p-3 sm:p-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            {processingStatus === 'processing' && (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            )}
            <p className="text-sm text-gray-600">{processingMessage}</p>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        {messages.length === 0 ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => onInputChange(prompt)}
                  className="w-full p-3 text-left text-sm text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.timestamp && (
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input Section */}
      <div className="flex-shrink-0 p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSendMessage()
              }
            }}
            className="flex-1"
            disabled={disabled || isLoading}
          />
          <Button
            onClick={onSendMessage}
            disabled={!inputValue.trim() || disabled || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}