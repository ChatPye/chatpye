import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { isValidYouTubeUrl, extractVideoId } from "@/lib/youtube"

interface YouTubeUrlProcessorProps {
  onVideoProcessed: (videoId: string, videoInfo: any) => void
  onProcessingStatus: (status: string) => void
  disabled?: boolean
}

export function YouTubeUrlProcessor({
  onVideoProcessed,
  onProcessingStatus,
  disabled = false
}: YouTubeUrlProcessorProps) {
  const [url, setUrl] = useState("")
  const { toast } = useToast()

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidYouTubeUrl(url)) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
      })
      return
    }

    const id = extractVideoId(url)
    if (!id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not extract video ID from URL",
      })
      return
    }

    onProcessingStatus("Loading video...")

    try {
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Failed to process video')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.details || data.error)
      }

      onVideoProcessed(id, data)
      setUrl("")
      
      toast({
        title: "Success",
        description: "Video loaded successfully",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process video. Please try again.",
      })
    }
  }

  return (
    <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
      <Input
        type="url"
        placeholder="Paste YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={disabled}
        className="w-[400px]"
      />
      <Button
        type="submit"
        disabled={disabled || !url.trim()}
        className={`${
          url.trim() 
            ? 'bg-indigo-600 hover:bg-indigo-700' 
            : 'bg-gray-300 cursor-not-allowed'
        } transition-colors`}
      >
        Start Learning
      </Button>
    </form>
  )
} 