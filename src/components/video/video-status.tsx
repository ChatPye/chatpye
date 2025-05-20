import { Card } from "@/components/ui/card"
import { Clock, CheckCircle2, AlertCircle } from "lucide-react"

interface VideoStatusProps {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  message?: string
}

export function VideoStatus({ status, message }: VideoStatusProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Clock className="h-6 w-6 text-indigo-600 animate-spin" />,
          text: message || "Processing video transcript...",
          color: "text-indigo-600"
        }
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-indigo-600" />,
          text: message || "Video processed and ready for chat",
          color: "text-indigo-600"
        }
      case 'failed':
        return {
          icon: <AlertCircle className="h-6 w-6 text-red-500" />,
          text: message || "Failed to process video",
          color: "text-red-500"
        }
      default:
        return null
    }
  }

  const statusContent = getStatusContent()
  if (!statusContent) return null

  return (
    <Card className="p-4 bg-white shadow-sm border border-indigo-100 rounded-xl">
      <div className="flex items-center gap-3">
        {statusContent.icon}
        <span className={`font-medium ${statusContent.color}`}>
          {statusContent.text}
        </span>
      </div>
    </Card>
  )
} 