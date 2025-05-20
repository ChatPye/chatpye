import { Card } from "@/components/ui/card"
import { Clock, CheckCircle2, AlertCircle, Loader2, CheckCircle, XCircle } from "lucide-react"

interface VideoStatusProps {
  status: string
}

export function VideoStatus({ status }: VideoStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'processing' && (
        <div className="flex items-center gap-2 text-indigo-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing video...</span>
        </div>
      )}
      {status === 'completed' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Processing complete</span>
        </div>
      )}
      {status === 'failed' && (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span>Processing failed</span>
        </div>
      )}
    </div>
  )
} 