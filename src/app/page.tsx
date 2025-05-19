"use client"

import { useState, useEffect, useRef } from "react"
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
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const { toast } = useToast()
  const [selectedModel, setSelectedModel] = useState(models[0])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

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
    setIsProcessingVideo(true)
    setProcessingStatus("Loading video...")

    try {
      // Fetch video info using POST method
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Failed to process video')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.details || data.error)
      }

      setVideoInfo(data)
      setIsProcessingVideo(false)
      
      toast({
        title: "Success",
        description: "Video loaded successfully",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process video. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a placeholder AI response. The actual AI integration will be implemented soon.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Video Section and Recommended */}
          <div className="lg:col-span-3 order-1">
            <div className="flex flex-col gap-6">
              {/* Video Player Container */}
              <div className="w-full">
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
              </div>

              {/* Video Info Container */}
              {videoInfo && (
                <div className="w-full">
                  <Card className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                    <div className="p-6">
                      <h2 className="text-lg font-medium font-['Clarendon_Blk_BT'] text-[#1a1a1a] mb-4">
                        {videoInfo.title}
                      </h2>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex mb-2">
                          <span className="text-[#666666] font-medium">
                            {videoInfo.views} views - {videoInfo.publishedAt}
                          </span>
                        </div>
                        <p className="text-sm text-[#666666] line-clamp-3">
                          {videoInfo.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Recommended Videos Card - Desktop */}
              <div className="w-full hidden lg:block">
                <Card className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
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

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2 order-2">
            <div className="flex flex-col gap-6 h-[calc(100vh-8rem)] overflow-y-auto md:h-auto sm:h-[calc(100vh-8rem)] sm:pb-20">
              {/* Chat Title Card */}
              <Card className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#666666]">Model Selector</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {models.map((model) => (
                              <DropdownMenuItem
                                key={model.id}
                                className="flex flex-col items-start p-2 cursor-pointer"
                                onClick={() => setSelectedModel(model)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium">{model.name}</span>
                                  {selectedModel.id === model.id && (
                                    <span className="text-indigo-600">✓</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{model.description}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <span className="mr-1">+</span> New Chat
                    </Button>
                  </div>
                  
                  <h1 className="text-2xl font-semibold text-center font-['Space_Grotesk'] text-[#1a1a1a] tracking-tight">ChatPye</h1>
                  <p className="text-center text-sm text-[#666666] mt-1">Your Personal AI Tutor for Video Learning</p>
                </div>
              </Card>

              {/* Chat Interface Card */}
              <Card className="flex-1 bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
                  <TabsList className="w-full justify-start px-6 py-2 border-b border-gray-200">
                    <TabsTrigger value="chat" className="flex items-center gap-2 px-4 py-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex items-center gap-2 px-4 py-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="copy" className="flex items-center gap-2 px-4 py-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2 px-4 py-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat" className="flex-1 flex flex-col p-6">
                    {/* Processing Status */}
                    {isProcessingVideo && (
                      <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center text-indigo-700">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-700 mr-2"></div>
                          <span className="text-sm font-medium">{processingStatus}</span>
                        </div>
                      </div>
                    )}

                    <div 
                      ref={chatContainerRef}
                      className="flex-1 overflow-y-auto min-h-0 scroll-smooth"
                      style={{ maxHeight: 'calc(100vh - 16rem)' }}
                    >
                      {/* Example Prompts */}
                      <div className="space-y-3 mb-6">
                        <h3 className="text-sm font-medium text-[#666666] mb-2">Example Prompts</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {examplePrompts.map((prompt, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="w-full justify-start text-left border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 text-indigo-600 py-3 px-4"
                              onClick={() => setInputValue(prompt)}
                            >
                              {prompt}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="space-y-4">
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
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chat Input */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Other tab contents remain the same */}
                  <TabsContent value="timeline" className="p-6">
                    <div className="flex items-center justify-center h-full text-[#666666]">
                      <Clock className="h-8 w-8 mr-2" />
                      Timeline coming soon...
                    </div>
                  </TabsContent>

                  <TabsContent value="copy" className="p-6">
                    <div className="flex items-center justify-center h-full text-[#666666]">
                      <Copy className="h-8 w-8 mr-2" />
                      Copy feature coming soon...
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="p-6">
                    <div className="flex items-center justify-center h-full text-[#666666]">
                      <FileText className="h-8 w-8 mr-2" />
                      Notes feature coming soon...
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Recommended Videos Card - Mobile */}
              <div className="block lg:hidden w-full mt-4 order-2">
                <Card className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
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
        </div>
      </div>
      <Toaster />
    </main>
  )
} 