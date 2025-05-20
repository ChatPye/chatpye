"use client"

import { Card } from "@/components/ui/card"
import { Clock, ThumbsUp, Eye } from "lucide-react"
import { useState, useEffect } from "react"

interface VideoInfoProps {
  videoId: string
}

export function VideoInfo({ videoId }: VideoInfoProps) {
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const response = await fetch(`/api/video-info?videoId=${videoId}`)
        if (!response.ok) throw new Error('Failed to fetch video info')
        const data = await response.json()
        setVideoInfo(data)
      } catch (error) {
        console.error('Error fetching video info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (videoId) {
      fetchVideoInfo()
    }
  }, [videoId])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!videoInfo) {
    return null
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-[#1a1a1a] mb-4">
        {videoInfo.title}
      </h2>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex mb-2">
          <span className="text-[#666666] font-medium">
            {videoInfo.views} views - {videoInfo.publishedAt}
          </span>
        </div>
        <p className="text-sm text-[#666666] line-clamp-3">
          {videoInfo.description}
        </p>
      </div>
    </div>
  )
} 