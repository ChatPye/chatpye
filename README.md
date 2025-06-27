# ChatPye - YouTube Video Chat Assistant

ChatPye is a personalized, AI-native tutor designed to revolutionise video-based learning and upskilling.

## Features

- Real-time chat interface for YouTube videos
- AI-powered responses using Gemini
- Clean and modern UI design
- Tab-based interface for chat and future features

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatpye.git
cd chatpye
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building the Extension

1. Build the project:
```bash
npm run build
# or
yarn build
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory from the project

## Usage

1. Navigate to any YouTube video
2. Click the ChatPye extension icon
3. Start chatting with the AI assistant about the video content

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
