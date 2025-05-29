"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp?: string
  fromCache?: boolean
}

interface ChatContextType {
  selectedModel: {
    id: string
    name: string
    description: string
  }
  setSelectedModel: (model: { id: string; name: string; description: string }) => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  inputValue: string
  setInputValue: (value: string) => void
  isProcessing: boolean
  setIsProcessing: (value: boolean) => void
  processingStatus: string
  setProcessingStatus: (value: string) => void
}

const defaultModel = {
  id: "gemini",
  name: "Gemini",
  description: "Google's latest AI model"
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState(defaultModel)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")

  return (
    <ChatContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        messages,
        setMessages,
        inputValue,
        setInputValue,
        isProcessing,
        setIsProcessing,
        processingStatus,
        setProcessingStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
} 