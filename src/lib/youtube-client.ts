export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:&[^&\n]*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?[^&\n]*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]
  return patterns.some(pattern => pattern.test(url))
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
} 