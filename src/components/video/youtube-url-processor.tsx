import { useState, useEffect } from "react"
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
  const [jobId, setJobId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (jobId) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/video/status/${jobId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch job status');
          }

          const data = await response.json();
          onProcessingStatus(data.progress || 'Processing...');

          if (data.status === 'completed') {
            clearInterval(intervalId);
            setJobId(null);
            const videoId = extractVideoId(url);
            if (videoId) {
              onVideoProcessed(videoId, data);
            }
            toast({
              title: "Success",
              description: "Video processed successfully",
            });
          } else if (data.status === 'failed') {
            clearInterval(intervalId);
            setJobId(null);
            toast({
              variant: "destructive",
              title: "Error",
              description: data.progress || "Failed to process video",
            });
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, url, onVideoProcessed, onProcessingStatus, toast]);

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

    onProcessingStatus("Starting video processing...")

    try {
      const response = await fetch('/api/video/process', {
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

      setJobId(data.jobId)
      setUrl("")
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
        disabled={disabled || jobId !== null}
        className="w-[400px]"
      />
      <Button
        type="submit"
        disabled={disabled || !url.trim() || jobId !== null}
        className={`${
          url.trim() && jobId === null
            ? 'bg-indigo-600 hover:bg-indigo-700' 
            : 'bg-gray-300 cursor-not-allowed'
        } transition-colors`}
      >
        {jobId ? 'Processing...' : 'Start Learning'}
      </Button>
    </form>
  )
} 