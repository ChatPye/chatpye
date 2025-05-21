"use client"

import React, { useState } from "react" // Added useState
import { cn } from "@/lib/utils"
import { MessageSquare, User, Copy, Check } from "lucide-react" // Added Copy, Check
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Using ESM for Next.js
import { Button } from "@/components/ui/button"; // Added Button
import { useToast } from "@/components/ui/use-toast"; // Added useToast

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
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
            "rounded-lg px-4 py-2 text-sm",
            message.isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {message.isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const [copied, setCopied] = useState(false);
                  const { toast } = useToast();

                  const handleCopy = () => {
                    navigator.clipboard.writeText(codeString).then(() => {
                      setCopied(true);
                      toast({ title: "Copied!", description: "Code copied to clipboard." });
                      setTimeout(() => setCopied(false), 2000);
                    }).catch(err => {
                      toast({ variant: "destructive", title: "Copy failed", description: "Could not copy code to clipboard." });
                      console.error('Failed to copy code: ', err);
                    });
                  };

                  return !inline && match ? (
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCopy}
                        aria-label="Copy code"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <SyntaxHighlighter
                        style={Prism}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md" // Added for better visual container
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {/* Ensure timestamp is valid before creating Date object */}
          {message.timestamp && !isNaN(new Date(message.timestamp).getTime()) 
            ? new Date(message.timestamp).toLocaleTimeString() 
            : new Date().toLocaleTimeString()} 
        </span>
      </div>
    </div>
  )
} 