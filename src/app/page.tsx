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
import { Settings, Youtube, LogIn, UserPlus, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
// DropdownMenu components are not used directly on this page after sidebar integration for settings (if any were planned there)
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// VideoStatus is now primarily shown inside ChatContainer, not directly on page.tsx
// import { VideoStatus } from "@/components/video/video-status" 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import AppSidebar from "@/components/layout/AppSidebar"; // Import the new sidebar

// Firebase Imports
import { auth, googleProvider } from "@/lib/firebaseClient"
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  signInWithPopup,
  User 
} from "firebase/auth"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: number
  fromCache?: boolean
}

interface VideoInfo {
  id: string
  title?: string
}

const examplePrompts = [
  "Give me insights from this video",
  "What are the highlights of this video",
  "Explain this video like I am 5"
]

// Simplify the models array to only include Gemini, as selection is being disabled.
const models = [
  { id: "gemini", name: "Gemini", description: "Google's latest AI model" }
  // { id: "openai", name: "GPT-4", description: "OpenAI's most advanced model" }, // Removed
  // { id: "anthropic", name: "Claude", description: "Anthropic's model" }, // Removed
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

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setAuthLoading(false)
    });
    return () => unsubscribe();
  }, [])

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
          setProcessingMessage('Video processed and ready for chat.')
          clearInterval(pollInterval)
        } else if (data.status === 'failed') {
          setProcessingStatus('failed')
          setProcessingMessage('Failed to process video.')
          clearInterval(pollInterval)
        } else {
          setProcessingStatus('processing')
          setProcessingMessage(data.progress || 'Processing video transcript...')
        }
      } catch (error) {
        console.error('Error polling status:', error)
        setProcessingStatus('failed')
        setProcessingMessage('Error checking processing status.')
        clearInterval(pollInterval)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [jobId, processingStatus])

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidYouTubeUrl(url)) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid YouTube URL" })
      return
    }

    const id = extractVideoId(url)
    if (!id) {
      toast({ variant: "destructive", title: "Error", description: "Could not extract video ID from URL" })
      return
    }

    setIsLoading(true)
    setVideoId(id)
    setMessages([])
    setProcessingStatus('processing')
    setProcessingMessage("Starting video processing...")
    setJobId(null)
    setVideoInfo({ id })

    try {
      // Fetch video info first
      const infoResponse = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: url }),
      });
      
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setVideoInfo(prev => ({...prev, ...infoData}));
      } else {
        console.warn("Could not fetch video info:", await infoResponse.text());
      }

      // Then start processing
      const processResponse = await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({message: "Failed to start video processing"}));
        throw new Error(errorData.error || "Processing request failed");
      }

      const processData = await processResponse.json()
      setJobId(processData.jobId)
      setProcessingMessage(processData.message || "Video processing started. Waiting for updates...");
      
      toast({ title: "Processing Started", description: "Video processing initiated. You can start chatting once it's ready." })
    } catch (error: any) {
      console.error('Error submitting URL:', error)
      setProcessingStatus('failed')
      setProcessingMessage(error.message || 'Failed to process video. Please try again.')
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to process video." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // For non-Gemini models, require jobId and completed processing
    if (selectedModel.id !== 'gemini' && (!jobId || processingStatus !== 'completed')) {
      toast({ 
        variant: "destructive", 
        title: "Video Not Ready", 
        description: "Please wait for video processing to complete before chatting." 
      });
      return;
    }

    // For Gemini model, require either jobId (with completed processing) or videoId
    if (selectedModel.id === 'gemini') {
      if (!jobId && !videoId) {
        toast({ 
          variant: "destructive", 
          title: "No Video", 
          description: "Please submit a YouTube URL first to chat with Gemini." 
        });
        return;
      }
      if (jobId && processingStatus !== 'completed') {
        toast({ 
          variant: "destructive", 
          title: "Video Processing", 
          description: "Please wait for video processing to complete for better responses." 
        });
        return;
      }
    }

    const userMessageContent = inputValue;
    const userMessage: Message = {
      id: uuidv4(),
      content: userMessageContent,
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsAiResponding(true);

    const thinkingMessageId = uuidv4();
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      content: "AI is thinking...",
      isUser: false,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessageContent,
          jobId,
          modelId: selectedModel.id,
          videoId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from AI');
      }

      // Remove the thinking message
      setMessages((prev) => prev.filter(msg => msg.id !== thinkingMessageId));

      // Check if the response is a stream
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/plain')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response stream');
        }

        const decoder = new TextDecoder();
        const aiMessageId = uuidv4();
        let accumulatedText = '';

        // Add initial empty AI message
        setMessages(prev => [...prev, {
          id: aiMessageId,
          content: '',
          isUser: false,
          timestamp: Date.now(),
        }]);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;

            // Update the AI message with accumulated text
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: accumulatedText }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error reading stream:', error);
          throw error;
        } finally {
          reader.releaseLock();
        }
      } else {
        // Handle non-streaming response
        const data = await response.json();
        const aiMessage: Message = {
          id: uuidv4(),
          content: data.message,
          isUser: false,
          timestamp: Date.now(),
          fromCache: data.fromCache,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get response from AI",
      });
    } finally {
      setIsAiResponding(false);
    }
  };

  // Firebase Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      toast({ title: "Success", description: "Signed in with Google successfully!" });
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      let errorMessage = "Failed to sign in with Google";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign in was cancelled. Please try again.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Pop-up was blocked. Please allow pop-ups for this site.";
      }
      toast({ 
        variant: "destructive", 
        title: "Sign In Error", 
        description: errorMessage 
      });
    }
  };

  const handleSignUp = async () => {
    if (!authEmail || !authPassword) {
      toast({ 
        variant: "destructive", 
        title: "Missing Information", 
        description: "Please enter both email and password" 
      });
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      toast({ title: "Success", description: "Account created successfully!" });
      setAuthEmail("");
      setAuthPassword("");
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      let errorMessage = "Failed to create account";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      toast({ variant: "destructive", title: "Sign Up Error", description: errorMessage });
    }
  };

  const handleSignIn = async () => {
    if (!authEmail || !authPassword) {
      toast({ 
        variant: "destructive", 
        title: "Missing Information", 
        description: "Please enter both email and password" 
      });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      toast({ title: "Success", description: "Signed in successfully!" });
      setAuthEmail("");
      setAuthPassword("");
    } catch (error: any) {
      console.error("Sign In Error:", error);
      let errorMessage = "Failed to sign in";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      toast({ variant: "destructive", title: "Sign In Error", description: errorMessage });
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({ title: "Success", description: "Signed out successfully!" });
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      toast({ variant: "destructive", title: "Sign Out Error", description: "Failed to sign out" });
    }
  };

  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)

  const handleOpenSignInDialog = () => {
    setIsSignInOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Navigation Bar */}
        <nav className="border-b bg-white">
          <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-8"> {/* Reduced horizontal padding for smaller screens */}
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                {/* Hamburger menu icon can be added here to toggle AppSidebar on small screens if needed */}
                <Youtube className="h-7 w-7 sm:h-8 sm:w-8 text-black" /> {/* Slightly smaller icon on mobile */}
                <span className="ml-2 text-lg sm:text-xl font-bold text-black">ChatPye</span> {/* Adjusted font size */}
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2"> {/* Reduced space on mobile */}
                {authLoading ? (
                  <p className="text-xs sm:text-sm text-gray-600">Loading auth...</p>
                ) : currentUser ? (
                  <>
                    <p className="text-xs sm:text-sm text-gray-700 hidden md:block"> {/* Show welcome on md+ */}
                      Welcome, {currentUser.displayName || currentUser.email?.split('@')[0]} {/* Shorter email */}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2">
                      <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Dialog open={isSignInOpen} onOpenChange={setIsSignInOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center text-black hover:text-gray-700 px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2">
                          <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Sign In</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md"> {/* Ensure dialog content is not too wide */}
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Sign In</DialogTitle> {/* Responsive title */}
                          <DialogDescription>
                            Enter your email and password to sign in to your account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 sm:gap-4 py-4"> {/* Slightly reduced gap */}
                          <div className="grid gap-1.5 sm:gap-2">
                            <label htmlFor="email" className="text-xs sm:text-sm font-medium">Email</label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full text-sm sm:text-base"
                            />
                          </div>
                          <div className="grid gap-1.5 sm:gap-2">
                            <label htmlFor="password" className="text-xs sm:text-sm font-medium">Password</label>
                            <Input
                              id="password"
                              type="password"
                              placeholder="Enter your password"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full text-sm sm:text-base"
                            />
                          </div>
                          <Button onClick={handleSignIn} className="w-full text-sm sm:text-base">Sign In</Button>
                          <div className="relative my-2"> {/* Added margin */}
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                          </div>
                          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full text-sm sm:text-base">
                            <img src="/google.svg" alt="Google" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Sign in with Google
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center border-black text-black hover:bg-gray-50 px-2 py-1 text-xs sm:text-sm sm:px-3 sm:py-2">
                          <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Sign Up</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md"> {/* Ensure dialog content is not too wide */}
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Create an Account</DialogTitle> {/* Responsive title */}
                          <DialogDescription>
                            Enter your email and password to create a new account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 sm:gap-4 py-4"> {/* Slightly reduced gap */}
                          <div className="grid gap-1.5 sm:gap-2">
                            <label htmlFor="signup-email" className="text-xs sm:text-sm font-medium">Email</label>
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="Enter your email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full text-sm sm:text-base"
                            />
                          </div>
                          <div className="grid gap-1.5 sm:gap-2">
                            <label htmlFor="signup-password" className="text-xs sm:text-sm font-medium">Password</label>
                            <Input
                              id="signup-password"
                              type="password"
                              placeholder="Create a password"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full text-sm sm:text-base"
                            />
                          </div>
                          <Button onClick={handleSignUp} className="w-full text-sm sm:text-base">Create Account</Button>
                          <div className="relative my-2"> {/* Added margin */}
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                          </div>
                          <Button variant="outline" onClick={handleGoogleSignIn} className="w-full text-sm sm:text-base">
                            <img src="/google.svg" alt="Google" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Sign up with Google
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Search Section */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4"> {/* Reduced padding */}
            <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-4"> {/* Reduced gap */}
              <Input
                type="text"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 text-sm sm:text-base" /* Adjusted font size */
                aria-label="YouTube URL Input"
              />
              <Button 
                type="submit" 
                disabled={isLoading || authLoading} 
                className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto text-sm sm:text-base px-3 py-2 sm:px-4" /* Adjusted padding & font */
              >
                {isLoading ? "Loading..." : "Start Learning"}
              </Button>
            </form>
          </div>
        </div>

        {/* Main Content Area Grid - wrapped in a main tag for semantics */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6"> {/* Reduced padding */}
          <div className="max-w-[1920px] mx-auto"> {/* This ensures content within doesn't exceed max width */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6"> {/* Reduced gap */}
              {/* Left Column - Video Section and Info */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-6 order-1"> {/* Adjusted column span for potentially more chat space */}
                <Card className="rounded-lg sm:rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
                  <div className="w-full">
                    {videoId ? (
                      <div className="w-full aspect-video bg-black relative">
                        <VideoPlayer videoId={videoId} />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-black/90 relative flex flex-col items-center justify-center p-4 text-center">
                        <Youtube className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-2 sm:mb-4" />
                        <h2 className="text-md sm:text-lg md:text-xl font-medium text-white mb-1 sm:mb-2">Welcome to ChatPye</h2>
                        <p className="text-xs sm:text-sm md:text-base text-gray-300">Paste a YouTube URL above to begin.</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Video Info - Title can be shown here */}
                {videoInfo?.title && videoId && (
                  <Card className="rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white shadow-sm border border-slate-100">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">{videoInfo.title}</h2>
                  </Card>
                )}
              </div>

              {/* Right Column - Chat */}
              <div className="lg:col-span-5 xl:col-span-4 order-2">
                <Card className="bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                  <ChatTabs 
                    jobId={jobId}
                    videoId={videoId} 
                    currentUser={currentUser}
                    onSignInClick={handleOpenSignInDialog}
                    disabled={!jobId && selectedModel.id !== 'gemini'} 
                    messages={messages}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    onSendMessage={handleSendMessage}
                    isLoading={isAiResponding}
                    processingStatus={processingStatus}
                    processingMessage={processingMessage}
                  />
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </div>
  )
}