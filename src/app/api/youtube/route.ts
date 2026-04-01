import { NextResponse } from "next/server";

interface Video {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  channelHandle: string;
  channelName: string;
  url: string;
  duration?: string;
}

async function resolveChannelId(handle: string): Promise<string | null> {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  try {
    const res = await fetch(`https://www.youtube.com/${cleanHandle}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const html = await res.text();

    let match = html.match(/"channelId":"(UC[\w-]{22})"/);
    if (match) return match[1];

    match = html.match(/"externalId":"(UC[\w-]{22})"/);
    if (match) return match[1];

    match = html.match(/channel_id=(UC[\w-]{22})/);
    if (match) return match[1];

    match = html.match(/\/channel\/(UC[\w-]{22})/);
    if (match) return match[1];

    return null;
  } catch {
    return null;
  }
}

async function fetchVideoDuration(videoId: string): Promise<string | undefined> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return undefined;

    const data = await res.json();
    // YouTube oEmbed doesn't include duration, so we'll need to parse from HTML
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const htmlRes = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const html = await htmlRes.text();

    // Look for duration in the HTML (approximateSeconds format)
    const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
    if (durationMatch) {
      const durationMs = parseInt(durationMatch[1]);
      const seconds = Math.floor(durationMs / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    }
  } catch {
    // Ignore errors and return undefined
  }
  return undefined;
}

async function fetchRssFeed(
  channelId: string
): Promise<{ videos: Video[]; channelName: string }> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(rssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  const xml = await res.text();

  const channelNameMatch = xml.match(
    /<name>([^<]+)<\/name>/
  );
  const channelName = channelNameMatch ? channelNameMatch[1] : channelId;

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

  const videos: Video[] = entries.map((entry) => {
    const idMatch =
      entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ||
      entry.match(/<media:yt:videoId>([^<]+)<\/media:yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const thumbnailMatch = entry.match(
      /<media:thumbnail url="([^"]+)"/
    );

    const videoId = idMatch ? idMatch[1] : "";
    const title = titleMatch
      ? titleMatch[1].replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
      : "Unknown Title";

    return {
      id: videoId,
      title,
      published: publishedMatch ? publishedMatch[1] : "",
      thumbnail: thumbnailMatch
        ? thumbnailMatch[1]
        : `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      channelHandle: "",
      channelName,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  });

  // Fetch durations for videos (limit to first 10 to avoid rate limiting)
  const videosWithDuration = await Promise.all(
    videos.slice(0, 10).map(async (video) => {
      const duration = await fetchVideoDuration(video.id);
      return { ...video, duration };
    })
  );

  // For videos beyond the first 10, return without duration
  const remainingVideos = videos.slice(10).map(video => ({ ...video }));

  return { videos: [...videosWithDuration, ...remainingVideos], channelName };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json(
      { error: "handle query param is required" },
      { status: 400 }
    );
  }

  const channelId = await resolveChannelId(handle);
  if (!channelId) {
    return NextResponse.json(
      { error: `Could not resolve channel for ${handle}` },
      { status: 404 }
    );
  }

  const { videos, channelName } = await fetchRssFeed(channelId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentVideos = videos.filter(
    (v) => new Date(v.published) >= sevenDaysAgo
  );

  const result =
    recentVideos.length >= 3
      ? recentVideos
      : videos.slice(0, Math.max(3, recentVideos.length));

  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  result.forEach((v) => {
    v.channelHandle = cleanHandle;
    v.channelName = channelName;
  });

  return NextResponse.json({ videos: result, channelName, channelId });
}
