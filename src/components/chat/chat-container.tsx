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
  jobId?: string | null // Retained for potential direct use if ever needed, but primary status via props
  messages: Message[]
  inputValue: string
  onInputChange: (value: string) => void
  onSendMessage: () => Promise<void> // This is the callback from parent (page.tsx via ChatTabs.tsx)
  isLoading: boolean // True when AI is responding or an action is in progress
  processingStatus: ProcessingStatus // Status of video processing
  processingMessage?: string // Message related to video processing
  onExamplePromptClick?: (prompt: string) => void // Handler for example prompts
}

export function ChatContainer({ 
  // jobId, // Not directly used for fetching status anymore
  messages,
  inputValue,
  onInputChange,
  onSendMessage, // Renamed from handleSendMessage in props
  isLoading,
  processingStatus,
  processingMessage,
  onExamplePromptClick 
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Removed internal state for messages, inputValue, isLoading, processingStatus
  // Removed useEffect for jobId based status polling

  const handleInitiateSendMessage = async () => {
    if (!inputValue.trim() || processingStatus !== 'completed' || isLoading) return;
    // Call the onSendMessage prop passed from the parent
    await onSendMessage();
  }
  
  const handlePromptClick = (prompt: string) => {
    if (onExamplePromptClick) {
      onExamplePromptClick(prompt);
    } else {
      onInputChange(prompt); // Fallback if no specific handler
    }
  }

  const formatMessageContent = (content: string) => {
    // Replace timestamp patterns with formatted timestamps
    const formattedContent = content.replace(/\[(\d+)s - (\d+)s\]/g, (_, start, end) => {
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      };
      return `[${formatTime(parseInt(start))} - ${formatTime(parseInt(end))}]`;
    });

    return formattedContent;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Main content area with fixed height and proper spacing */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Status section - always visible */}
        <div className="flex-none p-4 border-b">
          {/* Video Status */}
          {processingStatus !== 'idle' && (
            <div className="p-4 border rounded-lg bg-gradient-to-r from-gray-900/5 to-indigo-950/5 shadow-sm">
              <VideoStatus status={processingStatus} message={processingMessage} />
              {(processingStatus === 'processing' && !processingMessage) && (
                <p className="text-sm text-gray-600 mt-2">
                  Video analysis is underway. This might take a few moments.
                </p>
              )}
              {(processingStatus === 'completed' && !processingMessage) && (
                <p className="text-sm text-indigo-600 mt-2">
                  Analysis complete. You can now interact with the chat.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Messages and Prompts section - scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Example Prompts - show when no messages and processing is complete */}
            {messages.length === 0 && processingStatus === 'completed' && (
              <div className="space-y-3">
                <h3 className="text-base font-medium text-gray-900">Example Questions</h3>
                <div className="grid gap-2">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handlePromptClick(prompt)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-600 hover:bg-gradient-to-r hover:from-gray-900/5 hover:to-indigo-950/5 transition-colors text-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={{
                    ...message,
                    content: formatMessageContent(message.content),
                    timestamp: message.timestamp || new Date().toLocaleTimeString(),
                  }}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-gray-900/5 to-indigo-950/5 text-indigo-600 rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Input area - fixed at bottom with minimal padding */}
      <div className="flex-none p-2 border-t bg-white shadow-sm">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isLoading && handleInitiateSendMessage()}
            placeholder={processingStatus === 'completed' ? "Ask a question about the video..." : (processingStatus === 'processing' ? "Processing video..." : "Please submit a video first")}
            className="flex-1 h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600"
            disabled={isLoading || processingStatus !== 'completed'}
          />
          <Button
            onClick={handleInitiateSendMessage}
            disabled={isLoading || !inputValue.trim() || processingStatus !== 'completed'}
            size="icon"
            className="h-10 w-10 bg-gradient-to-r from-gray-900 to-indigo-950 hover:from-gray-800 hover:to-indigo-900 text-white"
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