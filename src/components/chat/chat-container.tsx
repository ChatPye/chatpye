"use client"

import React, { useEffect, useRef, ChangeEvent, KeyboardEvent } from "react"
import { ChatMessage } from "./chat-message"
// ChatInput is not used directly, Input and Button are used instead
// import { ChatInput } from "./chat-input" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendHorizontal, Loader2 } from "lucide-react"
import { VideoStatus } from "@/components/video/video-status"
// Card is not used directly
// import { Card } from "@/components/ui/card" 
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useChat } from "@/contexts/chat-context"
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    inputValue,
    setInputValue,
    isProcessing,
    processingStatus,
  } = useChat()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handlePromptClick = (prompt: string) => setInputValue(prompt)
  const handleSend = () => {
    // Your send logic here (call API, update context, etc.)
  }

  // Only enable scroll if there are more than 3 messages
  const enableScroll = messages.length > 3

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-l">
      {/* VideoStatus always visible when relevant */}
      {processingStatus !== 'idle' && (
        <div className="mb-4 sm:mb-6 p-4 border rounded-lg bg-gray-50">
          <VideoStatus status={processingStatus as any} />
        </div>
      )}
      {/* Example prompts always visible when no messages */}
      {messages.length === 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 px-1 mb-2">Try these examples:</h3>
          <div className="w-full grid grid-cols-1 gap-2">
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(prompt)}
                className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-xs sm:text-sm text-gray-700 hover:text-indigo-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Message list, scrollable only if overflow */}
      <div className={`flex-1 flex flex-col min-h-0 ${enableScroll ? 'overflow-y-auto' : ''}`}> 
        <div className="space-y-4 flex flex-col">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={{ ...message, timestamp: message.timestamp ? String(message.timestamp) : new Date().toLocaleTimeString() }}
            />
          ))}
          {isProcessing && (
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
      {/* Chat input always at the bottom */}
      <div className="shrink-0 p-0.5 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isProcessing && handleSend()}
            placeholder={
              processingStatus === 'completed' 
                ? "Ask a question about the video..." 
                : processingStatus === 'processing' 
                  ? "Processing video, please wait..." 
                  : processingStatus === 'failed'
                    ? "Video processing failed. Please try another URL."
                    : "Submit a YouTube URL to start"
            }
            className="flex-1 focus:border-indigo-600 focus:ring-indigo-600 text-sm sm:text-base"
            disabled={isProcessing || (processingStatus !== 'completed' && processingStatus !== 'idle')}
          />
          <Button
            onClick={handleSend}
            disabled={isProcessing || !inputValue.trim() || (processingStatus !== 'completed' && processingStatus !== 'idle')}
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
// Removed the direct ReactMarkdown rendering here as it's encapsulated within ChatMessage
// ChatMessage is now expected to handle the markdown rendering.
// If ChatMessage does not handle markdown, the ReactMarkdown logic would need to be
// re-integrated within the messages.map loop, similar to the original code,
// but using the message.content from the mapped messages.