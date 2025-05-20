"use client"

import { useRef, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Clock, Copy, FileText, Send, Bot, ListTodo } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChat } from "@/contexts/chat-context"
import { isValidYouTubeUrl } from "@/lib/youtube"
import { ChatContainer } from "./chat-container"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

interface ChatTabsProps {
  jobId: string | null
  disabled?: boolean
}

export function ChatTabs({ jobId, disabled }: ChatTabsProps) {
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isProcessing,
    processingStatus
  } = useChat()
  
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Poll for job status
  useEffect(() => {
    if (!currentJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/status/${currentJobId}`);
        const status = await response.json();

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setCurrentJobId(null);
          // Enable Q&A
          setMessages((prev: Message[]) => [...prev, {
            id: Date.now().toString(),
            content: "Video processing completed! You can now ask questions about the video.",
            isUser: false,
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setCurrentJobId(null);
          setMessages((prev: Message[]) => [...prev, {
            id: Date.now().toString(),
            content: `Video processing failed: ${status.message}`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJobId, setMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    // Check if input is a YouTube URL
    if (isValidYouTubeUrl(inputValue)) {
      try {
        const response = await fetch('/api/video/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ youtubeUrl: inputValue }),
        });

        const { jobId } = await response.json();
        setCurrentJobId(jobId);

        setMessages((prev: Message[]) => [...prev, {
          id: Date.now().toString(),
          content: "Processing video... This may take a few minutes.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } catch (error) {
        console.error('Error processing video:', error);
        setMessages((prev: Message[]) => [...prev, {
          id: Date.now().toString(),
          content: "Failed to process video. Please try again.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
      return;
    }

    // Handle regular Q&A
    try {
      const response = await fetch('/api/video/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: currentJobId,
          question: inputValue
        }),
      });

      const { answer } = await response.json();
      
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: answer,
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error('Error getting answer:', error);
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I couldn't process your question. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-indigo-600 mb-2">ChatPye</h2>
        <p className="text-sm text-gray-500">Your AI-powered video learning companion</p>
      </div>
      <Tabs defaultValue="chat" className="flex-1">
        <TabsList className="w-full justify-start border-b rounded-none bg-white sticky top-[5.5rem] z-10 p-0">
          <TabsTrigger value="chat" className="data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="agents" className="data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2 text-base">
            <Bot className="h-5 w-5" />
            Agents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="h-[calc(100%-8.5rem)] m-0">
          <ChatContainer jobId={jobId} />
        </TabsContent>
        <TabsContent value="timeline" className="h-[calc(100%-8.5rem)] m-0">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Video Timeline</h3>
            <p className="text-sm text-gray-500">Timeline view coming soon...</p>
          </div>
        </TabsContent>
        <TabsContent value="notes" className="h-[calc(100%-8.5rem)] m-0">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Your Notes</h3>
            <p className="text-sm text-gray-500">Notes feature coming soon...</p>
          </div>
        </TabsContent>
        <TabsContent value="agents" className="h-[calc(100%-8.5rem)] m-0">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">AI Agents</h3>
            <p className="text-sm text-gray-500">AI agents feature coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 