"use client"

import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from 'uuid';
import { VideoPlayer } from "@/components/video/video-player"
import { VideoInfo } from "@/components/video/video-info"
import { ChatTabs } from "@/components/chat/chat-tabs"
import { Card } from "@/components/ui/card"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { extractVideoId, isValidYouTubeUrl } from "@/lib/youtube"
import { Button } from "@/components/ui/button"
import { Settings, Youtube, LogIn, UserPlus, Send, MessageSquare, Clock, Copy, FileText, ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VideoStatus } from "@/components/video/video-status"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp?: string
}

interface VideoInfo {
  id: string
  title: string
  description: string
  views: string
  publishedAt: string
  url: string
}

const examplePrompts = [
  "Give me insights from this video",
  "What are the highlights of this video",
  "Explain this video like I am 5"
]

const models = [
  { id: "gemini", name: "Gemini", description: "Google's latest AI model" },
  { id: "gpt4", name: "GPT-4", description: "OpenAI's most advanced model" },
  { id: "gpt35", name: "GPT-3.5", description: "Fast and efficient" },
]

export default function Home() {
  const [url, setUrl] = useState("")
  const [videoId, setVideoId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [processingMessage, setProcessingMessage] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const { toast } = useToast()
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [isAiResponding, setIsAiResponding] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Poll for job status
  useEffect(() => {
    if (!jobId || processingStatus === 'completed' || processingStatus === 'failed') return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/status/${jobId}`)
        if (!response.ok) throw new Error('Failed to fetch status')
        
        const data = await response.json()
        
        if (data.status === 'completed') {
          setProcessingStatus('completed')
          setProcessingMessage('Video processed and ready for chat')
          clearInterval(pollInterval)
        } else if (data.status === 'failed') {
          setProcessingStatus('failed')
          setProcessingMessage('Failed to process video')
          clearInterval(pollInterval)
        } else {
          setProcessingStatus('processing')
          setProcessingMessage('Processing video transcript...')
        }
      } catch (error) {
        console.error('Error polling status:', error)
        setProcessingStatus('failed')
        setProcessingMessage('Error checking processing status')
        clearInterval(pollInterval)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [jobId, processingStatus])

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidYouTubeUrl(url)) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
      })
      return
    }

    const id = extractVideoId(url)
    if (!id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not extract video ID from URL",
      })
      return
    }

    setIsLoading(true)
    setVideoId(id)
    setProcessingStatus('processing')
    setProcessingMessage("Starting video processing...")

    try {
      // Start video processing
      const processResponse = await fetch('/api/video/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!processResponse.ok) {
        throw new Error('Failed to start video processing')
      }

      const processData = await processResponse.json()
      setJobId(processData.jobId)

      // Fetch video info
      const infoResponse = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!infoResponse.ok) {
        throw new Error('Failed to fetch video info')
      }

      const infoData = await infoResponse.json()
      setVideoInfo(infoData)
      
      toast({
        title: "Success",
        description: "Video processing started",
      })
    } catch (error) {
      console.error('Error:', error)
      setProcessingStatus('failed')
      setProcessingMessage('Failed to process video')
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process video. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!jobId) {
      toast({
        variant: "destructive",
        title: "Video Not Processed",
        description: "Please process a video before sending messages.",
      });
      return;
    }

    const userInputValue = inputValue;
    const newMessage: Message = {
      id: uuidv4(),
      content: userInputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsAiResponding(true);

    // Optional: Add a temporary "AI is thinking..." message
    const thinkingMessageId = uuidv4();
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      content: "AI is thinking...",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInputValue,
          jobId: jobId,
          modelId: selectedModel.id,
        }),
      });

      // Remove the "AI is thinking..." message
      setMessages((prev) => prev.filter(msg => msg.id !== thinkingMessageId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const responseData = await response.json();

      const aiResponseMessage: Message = {
        id: uuidv4(),
        content: responseData.message,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiResponseMessage]);

    } catch (error) {
      // Ensure "AI is thinking..." message is removed on error too
      setMessages((prev) => prev.filter(msg => msg.id !== thinkingMessageId));
      
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI.",
      });
    } finally {
      setIsAiResponding(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Youtube className="h-8 w-8 text-black" />
              <span className="ml-2 text-xl font-bold text-black">ChatPye</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center text-black hover:text-gray-700">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              <Button variant="outline" size="sm" className="flex items-center border-black text-black hover:bg-gray-50">
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
              <Button variant="ghost" size="icon" className="text-black">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Section */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="text"
              placeholder="Paste YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
              {isLoading ? "Loading..." : "Start Learning"}
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Video Section and Info */}
          <div className="lg:col-span-8 space-y-6 order-1">
            {/* Video Player */}
            <Card className="rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className="w-full">
                {videoId ? (
                  <div className="w-full aspect-video bg-black relative">
                    <VideoPlayer videoId={videoId} />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-black relative flex flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-[18px] sm:text-[20px] font-medium text-black mb-2">Welcome to ChatPye</h2>
                    <p className="text-[14px] sm:text-[16px] text-[#666666]">Your AI-powered video learning companion</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Video Info */}
            {videoId && (
              <Card className="rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
                <VideoInfo videoId={videoId} />
              </Card>
            )}
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-4 order-2">
            <Card className="rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 h-[calc(100vh-12rem)]">
              {/* Video Status */}
              {processingStatus !== 'idle' && (
                <div className="border-b border-slate-100">
                  <VideoStatus 
                    status={processingStatus} 
                    message={processingMessage} 
                  />
                </div>
              )}
              <ChatTabs jobId={jobId} disabled={!jobId} />
            </Card>
          </div>

          {/* Recommended Videos - Full width on mobile, left column on desktop */}
          <div className="lg:col-span-8 order-3">
            <Card className="rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className="p-6">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">Recommended Videos</h3>
                <div className="space-y-4">
                  {/* Placeholder for recommended videos */}
                  <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="w-40 h-24 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#1a1a1a] mb-1">Loading recommendations...</h4>
                      <p className="text-sm text-[#666666]">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </main>
  )
} 