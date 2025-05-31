import React, { createContext, useContext, useState, useCallback } from 'react';

export type Message = {
  id: string;
  content: string;
  isUser: boolean;
};

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface ChatContextType {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (content: string) => void;
  isLoading: boolean;
  processingStatus: ProcessingStatus;
  processingMessage: string;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setProcessingMessage: (message: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingMessage, setProcessingMessage] = useState('');

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `This is a simulated response to: "${content}"`,
        isUser: false,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    messages,
    inputValue,
    setInputValue,
    sendMessage,
    isLoading,
    processingStatus,
    processingMessage,
    setProcessingStatus,
    setProcessingMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 