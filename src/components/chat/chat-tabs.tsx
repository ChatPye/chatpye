"use client"

import { useRef, useEffect, useState } from "react";
import { User } from "firebase/auth"; // Import User type
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button"; 
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { 
  MessageSquare, 
  Clock, 
  FileText, 
  Bot, 
  Loader2, 
  AlertTriangle, 
  PlayCircle, 
  Edit3, 
  Trash2, 
  UserCircle 
} from "@/components/ui/icons";
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
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-gray-900/5 to-indigo-950/5 sticky top-0 z-10">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-indigo-950 bg-clip-text text-transparent mb-1">ChatPye</h2>
        <p className="text-sm text-gray-600">Your AI-powered video learning companion</p>
      </div>
      <Tabs 
        defaultValue="chat" 
        className="flex-1 flex flex-col"
        onValueChange={setActiveTab} 
      >
        <TabsList className="w-full justify-start border-b rounded-none bg-white z-10 px-4">
          <TabsTrigger 
            value="chat" 
            className="px-4 py-2.5 text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
          >
            <MessageSquare className="h-5 w-5" />
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="timeline" 
            className="px-4 py-2.5 text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
          >
            <Clock className="h-5 w-5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="px-4 py-2.5 text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
          >
            <FileText className="h-5 w-5" />
            Notes
          </TabsTrigger>
          <TabsTrigger 
            value="agents" 
            className="px-4 py-2.5 text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
          >
            <Bot className="h-5 w-5" />
            Agents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ChatContainer 
            jobId={jobId}
            messages={messages}
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            processingStatus={processingStatus}
            processingMessage={processingMessage}
            onExamplePromptClick={onInputChange}
          />
        </TabsContent>
        <TabsContent value="timeline" className="flex-1 flex flex-col m-0 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-indigo-50/30">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Video Chapters</h3>
          {isLoadingChapters && (
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading chapters...
            </div>
          )}
          {chapterError && (
            <div className="flex flex-col items-center justify-center text-red-600">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-medium text-base">Error loading chapters:</p>
              <p className="text-sm">{chapterError}</p>
            </div>
          )}
          {!isLoadingChapters && !chapterError && chapters.length === 0 && (
            <p className="text-center text-sm text-gray-500">No chapters available for this video.</p>
          )}
          {!isLoadingChapters && !chapterError && chapters.length > 0 && (
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="p-4 shadow-sm bg-white">
                  <h4 className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-base mb-1">{chapter.title}</h4>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-indigo-600 hover:text-indigo-800 hover:underline mb-2 flex items-center"
                    onClick={() => seekTo(chapter.startTime)}
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    Go to: {formatTime(chapter.startTime)}
                  </Button>
                  <p className="text-sm text-gray-700 leading-relaxed">{chapter.summary}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="notes" className="flex-1 flex flex-col m-0 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-indigo-50/30 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">My Notes</h3>
          
          {!currentUser && (
            <Card className="p-6 flex flex-col items-center justify-center text-center bg-white">
              <UserCircle className="h-12 w-12 text-indigo-400 mb-3" />
              <p className="mb-3 text-sm text-gray-600">Please sign in to create and view your notes for this video.</p>
              {onSignInClick && (
                <Button onClick={onSignInClick} variant="default" className="bg-gradient-to-r from-gray-900 to-indigo-950 hover:from-gray-800 hover:to-indigo-900 text-sm px-4 py-2">
                  Sign In
                </Button>
              )}
            </Card>
          )}

          {currentUser && !videoId && (
            <Card className="p-6 text-center bg-white">
              <p className="text-sm text-gray-600">Please load a video to take and view notes.</p>
            </Card>
          )}

          {currentUser && videoId && (
            <>
              <div className="bg-white p-4 rounded-lg shadow">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Type your note here..."
                  className="w-full min-h-[100px] mb-3 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-base"
                  rows={3}
                />
                <Button
                  onClick={() => {
                    if (!noteInput.trim() || !videoId || !currentUser) return;
                    setIsSavingNote(true);
                    const newNote: Note = {
                      id: uuidv4(),
                      content: noteInput.trim(),
                      videoId: videoId,
                      createdAt: new Date(),
                      userId: currentUser.uid 
                    };
                    setTimeout(() => {
                      setSavedNotes(prevNotes => [...prevNotes, newNote]);
                      setNoteInput("");
                      setIsSavingNote(false);
                    }, 500);
                  }}
                  disabled={!noteInput.trim() || isSavingNote}
                  className="w-full bg-gradient-to-r from-gray-900 to-indigo-950 hover:from-gray-800 hover:to-indigo-900 text-white"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Note'
                  )}
                </Button>
              </div>
              <div className="space-y-3">
                {savedNotes.map((note) => (
                  <Card key={note.id} className="p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-gray-500">
                        {note.createdAt.toLocaleString()}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        onClick={() => {
                          setSavedNotes(prevNotes => 
                            prevNotes.filter(n => n.id !== note.id)
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="agents" className="flex-1 flex flex-col m-0 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-indigo-50/30">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">AI Agents</h3>
            <p className="text-sm text-gray-500">AI agents feature coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 