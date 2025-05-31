"use client"

import React, { ChangeEvent, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendHorizontal } from "lucide-react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => Promise<void>
  isLoading: boolean
  processingStatus: 'idle' | 'processing' | 'completed' | 'failed'
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  processingStatus
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading && processingStatus === 'completed') {
      onSend();
    }
  };

  const getPlaceholder = () => {
    switch (processingStatus) {
      case 'completed':
        return "Ask a question about the video...";
      case 'processing':
        return "Processing video...";
      default:
        return "Please submit a video first";
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 p-4 border-t bg-white shadow-sm">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="flex-1 focus:border-indigo-600 focus:ring-indigo-600"
          disabled={isLoading || processingStatus !== 'completed'}
        />
        <Button
          onClick={onSend}
          disabled={isLoading || !value.trim() || processingStatus !== 'completed'}
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 