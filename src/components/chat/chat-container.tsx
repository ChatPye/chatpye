"use client"

import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendHorizontal, Loader2 } from "lucide-react"
import { VideoStatus } from "@/components/video/video-status"
import { Card } from "@/components/ui/card"
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ChatContainerProps {
  jobId?: string | null
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed'

const examplePrompts = [
  "Give me insights from this video",
  "Explain this video to me like I am 5",
  "What are the key takeaways from this video"
]

export function ChatContainer({ jobId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/video/status/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        setProcessingStatus(data.status as ProcessingStatus);
      } catch (error) {
        console.error('Error checking video status:', error);
        setProcessingStatus('failed');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !jobId || processingStatus !== 'completed') return;

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
          jobId,
          modelId: 'gemini'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Create a new message for the AI response
      const aiMessageId = Date.now().toString();
      setMessages((prev: Message[]) => [...prev, {
        id: aiMessageId,
        content: '',
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      }]);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedContent += chunk;

        // Update the AI message with accumulated content
        setMessages((prev: Message[]) => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
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
        {processingStatus !== 'idle' && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <VideoStatus status={processingStatus} />
            {processingStatus === 'processing' && (
              <p className="text-sm text-gray-500 mt-2">
                Processing may take 3-5 minutes. You can ask questions once it's complete.
              </p>
            )}
            {processingStatus === 'completed' && (
              <p className="text-sm text-green-600 mt-2">
                Video processing complete! You can now ask questions about the video.
              </p>
            )}
          </div>
        )}
        
        {messages.length === 0 && processingStatus === 'completed' && (
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
                {message.isUser ? (
                  message.content
                ) : (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none"
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {formatMessageContent(message.content)}
                  </ReactMarkdown>
                )}
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

      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSendMessage()}
            placeholder={processingStatus === 'completed' ? "Ask a question about the video..." : "Processing video..."}
            className="flex-1 focus:border-indigo-600 focus:ring-indigo-600"
            disabled={isLoading || processingStatus !== 'completed'}
          />
          <Button
            onClick={handleSendMessage}
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