# YouTube Tracker

A modern web application to track recent videos from your favorite YouTube creators, organized by custom groups. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

### 📺 Video Tracking
- **Recent Videos**: Displays videos from the last 7 days, or the latest 3 videos if fewer recent ones exist
- **Group Filtering**: Filter videos by custom channel groups using checkboxes
- **Sorting Options**: Sort by date (newest/oldest) or channel name
- **Video Duration**: Shows video length in HH:MM:SS or MM:SS format
- **Watch Later**: One-click button to add videos to YouTube's Watch Later playlist

### 👥 Channel Management
- **Custom Groups**: Organize channels into up to 20 groups
- **Persistent Storage**: Channel data persists across deployments using Turso (SQLite)
- **Search Functionality**: Search through groups and channels in the manage tab

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Turso (SQLite with edge replication)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS with dark theme

## Getting Started

### Prerequisites
- Node.js 18+
- A [Turso](https://turso.tech) account for database storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/youtube-tracker.git
   cd youtube-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up Turso Database**
   - Create a Turso database: `turso db create youtube-tracker`
   - Get your database URL and auth token
   - Add environment variables to `.env.local`:
     ```
     TURSO_DATABASE_URL=your-database-url
     TURSO_AUTH_TOKEN=your-auth-token
     ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

### Deployment

1. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add the Turso environment variables in Vercel's dashboard
   - Deploy!

2. **Database Setup**
   - The app will automatically create the necessary tables on first run
   - Default channel groups are loaded from `data/channels.default.json`

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── channels/
│   │   │   │   ├── route.ts     # Channel management API
│   │   │   │   └── store.ts     # Database abstraction
│   │   │   └── youtube/
│   │   │       └── route.ts     # YouTube RSS feed API
│   │   ├── error.tsx            # Error boundary
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Home page
│   └── components/
│       └── Dashboard.tsx        # Main dashboard component
├── data/
│   └── channels.default.json    # Default channel configuration
├── next.config.ts               # Next.js configuration
└── tailwind.config.ts          # Tailwind CSS configuration
```

## API Endpoints

### `/api/channels`
- **GET**: Retrieve all channel groups
- **POST**: Manage channel groups
  - `add-channel`: Add a channel to a group
  - `remove-channel`: Remove a channel from all groups
  - `add-group`: Create a new group
  - `remove-group`: Delete a group
  - `rename-group`: Rename a group

### `/api/youtube?handle=@ChannelHandle`
- **GET**: Fetch recent videos for a channel
- Returns: Channel info and up to 10 recent videos with duration

## Configuration

### Channel Groups
Edit `data/channels.default.json` to customize default channel groups:

```json
{
  "groups": [
    {
      "name": "Tech",
      "channels": ["@mkbhd", "@LinusTechTips"]
    }
  ]
}
```

### Environment Variables
- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Your Turso authentication token

## How It Works

1. **Data Storage**: Channel groups are stored in Turso (SQLite) for persistence
2. **Video Fetching**: Uses YouTube's free RSS feeds (no API key required)
3. **Duration Parsing**: Scrapes video duration from YouTube pages
4. **Watch Later**: Uses YouTube's built-in `&action=watchlater` URL parameter

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run typecheck && npm run lint`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- YouTube for providing RSS feeds
- Turso for the excellent SQLite platform
- Vercel for seamless deployment