"use client"

import { useRef, useEffect, useState } from "react";
import { User } from "firebase/auth"; // Import User type
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button"; 
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { MessageSquare, Clock, FileText, Bot, Loader2, AlertTriangle, PlayCircle, Edit3, Trash2, UserCircle } from "lucide-react"; 
import { ChatContainer } from "./chat-container";
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
  currentUser: User | null;
  onSignInClick?: () => void;
  disabled?: boolean;
}

export function ChatTabs({ 
  jobId, 
  videoId, 
  currentUser,
  onSignInClick,
  disabled
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
      <div className="p-2 border-b bg-white sticky top-0 z-10"> {/* Reduced from p-3 sm:p-4 */}
        <h2 className="text-lg sm:text-xl font-semibold text-indigo-600 mb-1">ChatPye</h2>
        <p className="text-xs sm:text-sm text-gray-500">Your AI-powered video learning companion</p>
      </div>
      <Tabs 
        defaultValue="chat" 
        className="flex-1 flex flex-col"
        onValueChange={setActiveTab} 
      >
        <TabsList className="w-full justify-start border-b rounded-none bg-white z-10 p-0">
          <TabsTrigger 
            value="chat" 
            className="px-2 py-1 text-xs sm:px-2 sm:py-1.5 sm:text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1 sm:gap-2"
          >
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="timeline" 
            className="px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1 sm:gap-2"
          >
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger 
            value="notes" 
            className="px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1 sm:gap-2"
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Notes
          </TabsTrigger>
          <TabsTrigger 
            value="agents" 
            className="px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-1 sm:gap-2"
          >
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            Agents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ChatContainer />
        </TabsContent>
        <TabsContent value="timeline" className="flex-1 flex flex-col m-0 p-1 sm:p-2 overflow-y-auto bg-slate-50">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Video Chapters</h3>
          {isLoadingChapters && (
            <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
              Loading chapters...
            </div>
          )}
          {chapterError && (
            <div className="flex flex-col items-center justify-center text-red-600">
              <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 mb-1.5 sm:mb-2" />
              <p className="font-medium text-sm sm:text-base">Error loading chapters:</p>
              <p className="text-xs sm:text-sm">{chapterError}</p>
            </div>
          )}
          {!isLoadingChapters && !chapterError && chapters.length === 0 && (
            <p className="text-center text-xs sm:text-sm text-gray-500">No chapters available for this video.</p>
          )}
          {!isLoadingChapters && !chapterError && chapters.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="p-2.5 sm:p-4 shadow-sm bg-white">
                  <h4 className="font-semibold text-indigo-700 text-sm sm:text-md mb-0.5 sm:mb-1">{chapter.title}</h4>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 hover:underline mb-1 sm:mb-2 flex items-center"
                    onClick={() => seekTo(chapter.startTime)}
                  >
                    <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    Go to: {formatTime(chapter.startTime)}
                  </Button>
                  <p className="text-xs sm:text-sm text-gray-700 leading-normal sm:leading-relaxed">{chapter.summary}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="notes" className="flex-1 flex flex-col m-0 p-2 sm:p-4 overflow-y-auto bg-slate-50 space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">My Notes</h3>
          
          {!currentUser && (
            <Card className="p-4 sm:p-6 flex flex-col items-center justify-center text-center bg-white">
              <UserCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-2 sm:mb-3" />
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600">Please sign in to create and view your notes for this video.</p>
              {onSignInClick && (
                <Button onClick={onSignInClick} variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                  Sign In
                </Button>
              )}
            </Card>
          )}

          {currentUser && !videoId && (
            <Card className="p-4 sm:p-6 text-center bg-white">
              <p className="text-xs sm:text-sm text-gray-600">Please load a video to take and view notes.</p>
            </Card>
          )}

          {currentUser && videoId && (
            <>
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Type your note here..."
                  className="w-full min-h-[70px] sm:min-h-[100px] mb-2 sm:mb-3 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
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
                  disabled={!noteInput.trim() || isSavingNote || !videoId}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <><Edit3 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Save Note</>
                  )}
                </Button>
              </div>

              <div className="mt-4 sm:mt-6">
                <h4 className="text-md sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Saved Notes for this Video:</h4>
                {savedNotes.filter(note => note.videoId === videoId && note.userId === currentUser.uid).length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 bg-white p-3 sm:p-4 rounded-lg shadow text-center">You have no notes for this video yet.</p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {savedNotes
                      .filter(note => note.videoId === videoId && note.userId === currentUser.uid)
                      .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()) 
                      .map(note => (
                        <Card key={note.id} className="p-2.5 sm:p-3 bg-white shadow">
                          <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words">{note.content}</p>
                          <div className="flex justify-between items-center mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-200">
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 sm:h-7 sm:w-7 text-red-500 hover:bg-red-100"
                              onClick={() => {
                                setSavedNotes(prev => prev.filter(n => n.id !== note.id));
                              }}
                              aria-label="Delete note"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="agents" className="flex-1 flex flex-col m-0 p-2 sm:p-4 overflow-y-auto bg-slate-50">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">AI Agents</h3>
            <p className="text-xs sm:text-sm text-gray-500">AI agents feature coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 