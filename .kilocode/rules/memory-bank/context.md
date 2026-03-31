# Active Context: YouTube Tracker Dashboard

## Current State

**Status**: YouTube Tracker Dashboard with channel groups

The application is a YouTube tracker dashboard that monitors recent videos from a persistent list of favorite creators organized in groups. It uses YouTube RSS feeds (no API key required) to fetch video data.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] YouTube Tracker Dashboard with two tabs (Videos + Manage Channels)
- [x] API route for fetching YouTube videos via RSS feeds
- [x] Sorting by date and channel name
- [x] next/image integration for YouTube thumbnails (wildcard *.ytimg.com)
- [x] Error handling fix for client-side exception in channels fetch
- [x] error.tsx error boundary for graceful error recovery
- [x] Channel groups support (max 5 groups)
- [x] Group filter checkboxes in Videos tab
- [x] Group CRUD in Manage Channels tab (add/remove/rename groups, add/remove channels per group)
- [x] All channel data persisted in data/channels.default.json

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page (renders Dashboard) | Ready |
| `src/app/layout.tsx` | Root layout | Ready |
| `src/app/globals.css` | Global styles | Ready |
| `src/app/error.tsx` | Error boundary | Ready |
| `src/app/api/channels/route.ts` | Channel groups CRUD API | Ready |
| `src/app/api/youtube/route.ts` | YouTube video fetch API | Ready |
| `src/components/Dashboard.tsx` | Main dashboard component | Ready |
| `data/channels.default.json` | Channel groups data (committed) | Ready |
| `.kilocode/` | AI context & recipes | Ready |

## How It Works

1. **Videos Tab**: Displays recent videos from tracked channels. Group filter checkboxes allow selecting which groups to show. Supports sorting by date or channel name.
2. **Manage Channels Tab**: Organize channels into up to 5 groups. Each group shows its channels with add/remove. Groups can be renamed or deleted.
3. **Data Format**: `data/channels.default.json` stores `{ "groups": [{ "name": "...", "channels": ["@handle", ...] }] }`. All writes go directly to this file.
4. **Video Fetching**: Server-side API resolves channel handle to channel ID by fetching the YouTube page, then retrieves the RSS feed at `https://www.youtube.com/feeds/videos.xml?channel_id=...`.

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-03-31 | Added YouTube Tracker Dashboard with channel management, video fetching via RSS, sorting, and persistent channel list |
| 2026-03-31 | Fixed client-side exception, added error.tsx boundary, preset channels via channels.default.json |
| 2026-03-31 | Added channel groups (max 5), group filter checkboxes in Videos tab, group CRUD in Manage tab, all data in channels.default.json |
