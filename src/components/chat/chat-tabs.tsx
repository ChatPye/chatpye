"use client"

import { useRef, useEffect, useState } from "react";
import { User } from "firebase/auth"; // Import User type
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button"; 
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { MessageSquare, Clock, FileText, Bot, Loader2, AlertTriangle, PlayCircle, Edit3, Trash2, UserCircle, MessageCircle, Copy } from "lucide-react"; 
import { ChatContainer, Message, ProcessingStatus } from "./chat-container";
import { useVideoPlayer } from '@/contexts/video-player-context';

// Define Chapter interface
interface Chapter {
  id: string;
  startTime: number; // in seconds
  title: string;
  summary: string;
}

// Define Note interface
interface Note {
  id: string;
  content: string;
  videoId: string; // To associate note with a video
  createdAt: Date;
  userId: string; // To associate note with a user
}

interface ChatTabsProps {
  jobId: string | null;
  videoId: string | null; 
  currentUser: User | null; // Added currentUser prop
  onSignInClick?: () => void; // Added onSignInClick prop
  disabled?: boolean;
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  isLoading: boolean;
  processingStatus: ProcessingStatus;
  processingMessage?: string;
}

export function ChatTabs({ 
  jobId, 
  videoId, 
  currentUser, // Destructure currentUser
  onSignInClick, // Destructure onSignInClick
  disabled,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isLoading,
  processingStatus,
  processingMessage 
}: ChatTabsProps) {
  const [activeTab, setActiveTab] = useState("chat");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [noteInput, setNoteInput] = useState("");
  const [savedNotes, setSavedNotes] = useState<Note[]>([]); // Initialize with empty array
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const { seekTo } = useVideoPlayer();

  useEffect(() => {
    if (activeTab === "timeline" && videoId) {
      const fetchChapters = async () => {
        setIsLoadingChapters(true);
        setChapterError(null);
        try {
          const response = await fetch(`/api/video/chapters?videoId=${videoId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch chapters: ${response.statusText}`);
          }
          const data: Chapter[] = await response.json();
          setChapters(data);
        } catch (error: any) {
          console.error("Error fetching chapters:", error);
          setChapterError(error.message || "An unknown error occurred.");
        } finally {
          setIsLoadingChapters(false);
        }
      };
      fetchChapters();
    }
  }, [activeTab, videoId]);

  // Helper to format seconds into MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-lg sm:text-xl font-semibold text-indigo-600">ChatPye</h2>
        <p className="text-xs sm:text-sm text-gray-500">Your AI-powered video learning companion</p>
      </div>
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-3 sm:px-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ChatContainer 
            jobId={jobId}
            videoId={videoId}
            currentUser={currentUser}
            onSignInClick={onSignInClick || (() => {})}
            disabled={disabled || false}
            messages={messages}
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            processingStatus={processingStatus}
            processingMessage={processingMessage}
          />
        </TabsContent>
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
    </div>
  )
} 