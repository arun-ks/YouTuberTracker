# YouTube Tracker

A web application to track recent videos from your favorite YouTube creators, organized by custom groups. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

### Video Tracking
- **Recent Videos**: Displays videos from the last 7 days, or the latest 3 videos if fewer recent ones exist
- **Group Filtering**: Filter videos by custom channel groups using checkboxes
- **Sorting Options**: Sort by date (newest/oldest) or channel name
- **Video Duration**: Shows video length in HH:MM:SS or MM:SS format (fetched from YouTube embed pages)
- **Watch Later**: One-click button to open a video on YouTube (adds to Watch Later via YouTube's built-in flow)

### Channel Management
- **Custom Groups**: Organize channels into groups (defined in `data/channels.default.json`)
- **Search**: Search through groups and channels in the Channels & Groups tab
- **Persistent Storage**: Channel list is stored in `data/channels.default.json` and committed to git

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 (dark theme)
- **Data**: YouTube RSS feeds (no API key required)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+ or Bun

### Installation

```bash
git clone https://github.com/arun-ks/YouTuberTracker.git
cd YouTuberTracker
bun install
```

### Run Locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

1. Push your repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Deploy — no environment variables needed

## Project Structure

```
├── data/
│   └── channels.default.json   # Channel groups (committed to git)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── channels/
│   │   │   │   ├── route.ts    # Channel groups CRUD API
│   │   │   │   └── store.ts    # File-based storage
│   │   │   └── youtube/
│   │   │       └── route.ts    # YouTube video fetch API
│   │   ├── error.tsx           # Error boundary
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   └── components/
│       └── Dashboard.tsx       # Main dashboard component
├── next.config.ts              # Image remote patterns config
└── README.md
```

## How It Works

1. **Channel Groups**: Defined in `data/channels.default.json`. Edit this file to add/remove channels or groups.
2. **Video Fetching**: The API resolves each channel handle to a YouTube channel ID, then fetches the RSS feed at `https://www.youtube.com/feeds/videos.xml?channel_id=...`.
3. **Duration**: Fetched by scraping YouTube's embed page (`youtube.com/embed/{id}`) — no API key needed.
4. **Watch Later**: Opens `youtube.com/watch?v={id}&action=watchlater` in a new tab.

## Configuration

### Channel Groups

Edit `data/channels.default.json`:

```json
{
  "groups": [
    {
      "name": "Tech",
      "channels": ["@mkbhd", "@LinusTechTips"]
    },
    {
      "name": "Science",
      "channels": ["@Vsauce", "@kurzgesagt"]
    }
  ]
}
```

### Image Domains

Thumbnail domains are configured in `next.config.ts` under `images.remotePatterns`.

## Scripts

```bash
bun run dev        # Start development server
bun run build      # Production build
bun run start      # Start production server
bun run lint       # Run ESLint
bun run typecheck  # Run TypeScript compiler
```
