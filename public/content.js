// Function to extract video ID from YouTube URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get("v")
}

// Function to create and inject the chat container
function injectChatContainer() {
  const videoId = getVideoId()
  if (!videoId) return

  // Create container if it doesn't exist
  let container = document.getElementById("chatpye-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "chatpye-container"
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      display: flex;
      flex-direction: column;
    `
    document.body.appendChild(container)
  }

  // Create iframe for the chat interface
  const iframe = document.createElement("iframe")
  iframe.src = `http://localhost:3000?videoId=${videoId}`
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `
  container.innerHTML = ""
  container.appendChild(iframe)
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleChat") {
    const container = document.getElementById("chatpye-container")
    if (container) {
      container.style.display = container.style.display === "none" ? "flex" : "none"
    } else {
      injectChatContainer()
    }
  }
})

// Initial injection when the page loads
if (window.location.hostname === "www.youtube.com") {
  injectChatContainer()
} 