import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ChatProvider } from "@/contexts/chat-context"
import { VideoPlayerProvider } from "@/contexts/video-player-context" // Import the new provider
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChatPye - YouTube Video Chat",
  description: "Chat with your YouTube videos using AI",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChatProvider>
          <VideoPlayerProvider>{children}</VideoPlayerProvider>
        </ChatProvider>
        <Toaster />
      </body>
    </html>
  )
}