import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Youtube, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface VideoUploadProps {
  onVideoUpload: (file: File) => void
  onYouTubeUrlSubmit: (url: string) => void
  isAuthenticated: boolean
  isPaidUser: boolean
  disabled?: boolean
  userId?: string
}

export function VideoUpload({
  onVideoUpload,
  onYouTubeUrlSubmit,
  isAuthenticated,
  isPaidUser,
  disabled = false,
  userId = 'anonymous'
}: VideoUploadProps) {
  const [url, setUrl] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload videos.",
        variant: "destructive"
      })
      return
    }

    if (!isPaidUser) {
      toast({
        title: "Premium Feature",
        description: "Video upload is available for paid users only.",
        variant: "destructive"
      })
      return
    }

    onVideoUpload(file)
    setIsModalOpen(false)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    onYouTubeUrlSubmit(url)
    setUrl("")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upload videos.",
          variant: "destructive"
        })
        return
      }

      if (!isPaidUser) {
        toast({
          title: "Premium Feature",
          description: "Video upload is available for paid users only.",
          variant: "destructive"
        })
        return
      }

      onVideoUpload(file)
      setIsModalOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="Paste YouTube URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled}
          className="w-[400px]"
        />
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="bg-black text-white hover:bg-gray-800"
            >
              or Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Video</DialogTitle>
            </DialogHeader>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={disabled || !isAuthenticated || !isPaidUser}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-8 w-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Drag and drop your video here, or click to select
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: MP4, MOV, AVI
                </p>
              </label>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          type="submit"
          disabled={disabled || !url.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Start Learning
        </Button>
      </form>
    </div>
  )
} 