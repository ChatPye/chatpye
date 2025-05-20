"use client"

import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface VideoCardProps {
  videoId: string
  title: string
  thumbnail: string
  duration: string
  onClick?: () => void
}

export function VideoCard({ videoId, title, thumbnail, duration, onClick }: VideoCardProps) {
  return (
    <Card
      className="flex gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="relative w-40 h-24 flex-shrink-0">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
          {duration}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 line-clamp-2">{title}</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <Clock className="h-4 w-4 mr-1" />
          <span>{duration}</span>
        </div>
      </div>
    </Card>
  )
} 