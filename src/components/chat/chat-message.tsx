"use client"

import React, { useState, Fragment } from "react" // Added useState, Fragment
import { cn } from "@/lib/utils"
import { MessageSquare, User, Copy, Check, PlayCircle, Share2 } from "lucide-react" // Added Copy, Check, PlayCircle, Share2
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Button } from "@/components/ui/button"; 
import { toast } from "sonner"; // Updated to use sonner toast
import { useVideoPlayer } from '@/contexts/video-player-context'; // Import useVideoPlayer
import type { Components } from 'react-markdown';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: number
}

interface ChatMessageProps {
  message: Message
}

// Helper function to format time in HH:MM
const formatTimeMMSS = (timestamp: number): string => {
  if (isNaN(timestamp) || timestamp < 0) {
    // Return current time if timestamp is invalid
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper function to parse message content for clickable timestamps
const parseMessageContentWithClickableTimestamps = (content: string): Array<string | { time: number; text: string }> => {
  const segments: Array<string | { time: number; text: string }> = [];
  // Updated regex to handle [MM:SS] format
  const regex = /\[(\d+):(\d+)(?:\.\d+)?\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const fullMatchText = match[0];
    let timeInSeconds = 0;

    // Push preceding text if any
    if (match.index > lastIndex) {
      segments.push(content.substring(lastIndex, match.index));
    }

    // Parse MM:SS format
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    timeInSeconds = minutes * 60 + seconds;
    
    segments.push({ time: timeInSeconds, text: fullMatchText });
    lastIndex = regex.lastIndex;
  }

  // Push remaining text if any
  if (lastIndex < content.length) {
    segments.push(content.substring(lastIndex));
  }

  return segments;
};

// Helper function to parse timestamp string to seconds
const parseTimestampToSeconds = (timestamp: string): number => {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 0;
  return Math.floor(date.getTime() / 1000);
};

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const { seekTo } = useVideoPlayer();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Shared from ChatPye",
        text: message.content,
        url: window.location.href,
      });
      setIsShared(true);
      toast.success("Message shared successfully");
      setTimeout(() => setIsShared(false), 2000);
    } catch (error) {
      toast.error("Failed to share message");
    }
  };

  const formattedTime = formatTimeMMSS(message.timestamp || 0);

  return (
    <div
      className={`flex ${
        message.isUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`${
          message.isUser
            ? "max-w-[80%] bg-[#1e293b] text-white"
            : "w-full bg-white border border-slate-200"
        } rounded-lg p-4`}
      >
        <div className="flex items-start gap-2">
          {!message.isUser && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          )}
          <div className="flex-1">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || "");
                    return !match ? (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        language={match[1]}
                        style={vscDarkPlus}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${message.isUser ? "text-slate-400" : "text-gray-500"}`}>
                {formattedTime}
              </span>
              {!message.isUser && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="h-8 w-8 p-0"
                  >
                    {isShared ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {message.isUser && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}