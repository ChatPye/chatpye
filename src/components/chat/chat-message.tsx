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
  timestamp: string
}

interface ChatMessageProps {
  message: Message
}

// Helper function to parse message content for clickable timestamps
const parseMessageContentWithClickableTimestamps = (content: string): Array<string | { time: number; text: string }> => {
  const segments: Array<string | { time: number; text: string }> = [];
  // Regex to find timestamps like [HH:MM:SS], [MM:SS], [M:SS], [SSs], [S.sss], [S.ss], [S.s], [Ss]
  // It also captures HH, MM, SS, and fractional seconds separately.
  const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})\]|\[(\d+\.?\d*)s\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const fullMatchText = match[0];
    let timeInSeconds = 0;

    // Push preceding text if any
    if (match.index > lastIndex) {
      segments.push(content.substring(lastIndex, match.index));
    }

    if (match[1] !== undefined || match[2] !== undefined || match[3] !== undefined) { // Format [HH:MM:SS] or [MM:SS]
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      timeInSeconds = (hours * 3600) + (minutes * 60) + seconds;
    } else if (match[4] !== undefined) { // Format [SSs] or [S.sss]
      timeInSeconds = parseFloat(match[4]);
    }

    segments.push({ time: timeInSeconds, text: fullMatchText });
    lastIndex = regex.lastIndex;
  }

  // Push remaining text if any
  if (lastIndex < content.length) {
    segments.push(content.substring(lastIndex));
  }

  return segments;
};

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { seekTo } = useVideoPlayer(); // Get seekTo function
  // const { toast } = useToast(); // useToast from sonner doesn't return an object
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false); // State for share button

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy message. Please try again.");
    }
  };

  const handleShare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(`Shared: ${text}`);
      setShared(true);
      toast.success("Message content prepared for sharing!");
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      toast.error("Failed to prepare content for sharing. Please try again.");
    }
  };

  const components: Components = {
    code({ node, inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return (
          <div className="relative group my-2">
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleCopy(codeString)}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <div className="rounded-md overflow-hidden">
              <SyntaxHighlighter
                language={match[1]}
                style={vscDarkPlus}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    p(props) { return <p className="mb-1" {...props} />; },
    ul(props) { return <ul className="list-disc pl-5 mb-1" {...props} />; },
    ol(props) { return <ol className="list-decimal pl-5 mb-1" {...props} />; },
  };

  const renderAiMessage = () => {
    const segments = parseMessageContentWithClickableTimestamps(message.content);
    return segments.map((segment, index) => {
      if (typeof segment === 'string') {
        return (
          <ReactMarkdown
            key={index}
            components={components}
          >
            {segment}
          </ReactMarkdown>
        );
      } else {
        return (
          <Button
            key={index}
            variant="link"
            className="p-0 h-auto text-sm text-indigo-600 hover:text-indigo-700 inline-block align-baseline"
            onClick={() => seekTo(segment.time)}
          >
            <PlayCircle className="h-4 w-4 mr-1 inline-block" />
            {segment.text}
          </Button>
        );
      }
    });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        message.isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
          message.isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "flex flex-col gap-1",
          message.isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm max-w-full overflow-x-auto",
            message.isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {message.isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <>
              <div className="whitespace-pre-wrap break-words">
                {renderAiMessage().map((item, index) => <Fragment key={index}>{item}</Fragment>)}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(message.content)}
                  title="Copy message"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShare(message.content)}
                  title="Share message"
                >
                  {shared ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                </Button>
              </div>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {message.timestamp && !isNaN(new Date(message.timestamp).getTime()) 
            ? new Date(message.timestamp).toLocaleTimeString() 
            : new Date().toLocaleTimeString()} 
        </span>
      </div>
    </div>
  )
}