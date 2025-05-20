declare namespace YT {
  interface PlayerEvent {
    target: Player
    data: number
  }

  interface PlayerOptions {
    videoId?: string
    playerVars?: {
      autoplay?: 0 | 1
      modestbranding?: 0 | 1
      rel?: 0 | 1
      showinfo?: 0 | 1
      [key: string]: any
    }
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: PlayerEvent) => void
      onError?: (event: PlayerEvent) => void
    }
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    destroy(): void
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    getPlayerState(): number
    getCurrentTime(): number
    getDuration(): number
  }

  interface PlayerState {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
    UNSTARTED: number
  }
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | HTMLElement, options: YT.PlayerOptions) => YT.Player
      PlayerState: YT.PlayerState
    }
    onYouTubeIframeAPIReady: () => void
  }
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  thumbnails: {
    default: {
      url: string
      width: number
      height: number
    }
    medium: {
      url: string
      width: number
      height: number
    }
    high: {
      url: string
      width: number
      height: number
    }
  }
  statistics: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
  contentDetails: {
    duration: string
  }
}

export interface YouTubeSearchResult {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    description: string
    channelTitle: string
    publishedAt: string
    thumbnails: {
      default: {
        url: string
        width: number
        height: number
      }
      medium: {
        url: string
        width: number
        height: number
      }
      high: {
        url: string
        width: number
        height: number
      }
    }
  }
} 