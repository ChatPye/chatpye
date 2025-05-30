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
      <div className="flex-1 overflow-y-auto p-4">
        {/* VideoStatus now uses props directly */}
        {processingStatus !== 'idle' && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <VideoStatus status={processingStatus} message={processingMessage} />
             {/* Informative text can be part of processingMessage or added here if generic */}
            {(processingStatus === 'processing' && !processingMessage) && (
              <p className="text-sm text-gray-500 mt-2">
                Video analysis is underway. This might take a few moments.
              </p>
            )}
            {(processingStatus === 'completed' && !processingMessage) && (
              <p className="text-sm text-green-600 mt-2">
                Analysis complete. You can now interact with the chat.
              </p>
            )}
          </div>
        )}
        
        {/* Example prompts display logic remains, uses handlePromptClick */}
        {messages.length === 0 && processingStatus === 'completed' && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900">Example Questions</h3>
            <div className="space-y-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Render messages using ChatMessage component */}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={{
                ...message, // Pass all message properties
                content: formatMessageContent(message.content), // Apply formatting
                timestamp: message.timestamp || new Date().toLocaleTimeString(), // Ensure timestamp
              }}
            />
          ))}
          {/* Display "Thinking..." message based on isLoading prop */}
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

      {/* Input area uses props for value, onChange, and sending messages */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onInputChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isLoading && handleInitiateSendMessage()}
            placeholder={processingStatus === 'completed' ? "Ask a question about the video..." : (processingStatus === 'processing' ? "Processing video..." : "Please submit a video first")}
            className="flex-1 focus:border-indigo-600 focus:ring-indigo-600"
            disabled={isLoading || processingStatus !== 'completed'}
          />
          <Button
            onClick={handleInitiateSendMessage}
            disabled={isLoading || !inputValue.trim() || processingStatus !== 'completed'}
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