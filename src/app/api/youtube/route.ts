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
  isShort?: boolean;
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

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function fetchVideoDuration(videoId: string): Promise<string | undefined> {
  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return undefined;
    const html = await res.text();

    // Try approxDurationMs first
    let match = html.match(/"approxDurationMs":"(\d+)"/);
    if (match) {
      return formatDuration(Math.floor(parseInt(match[1]) / 1000));
    }

    // Try lengthSeconds
    match = html.match(/"lengthSeconds":"(\d+)"/);
    if (match) {
      return formatDuration(parseInt(match[1]));
    }

    // Try ISO 8601 duration (PT1H2M3S)
    match = html.match(/"duration":"(PT[^"]+)"/);
    if (match) {
      const iso = match[1];
      const hMatch = iso.match(/(\d+)H/);
      const mMatch = iso.match(/(\d+)M/);
      const sMatch = iso.match(/(\d+)S/);
      const h = hMatch ? parseInt(hMatch[1]) : 0;
      const m = mMatch ? parseInt(mMatch[1]) : 0;
      const s = sMatch ? parseInt(sMatch[1]) : 0;
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
  } catch {
    // Silently ignore — duration is optional
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

  // Fetch durations concurrently (limit to first 5 to stay within timeout)
  // If duration >= 60s, it's NOT a short (override title check)
  const toFetch = videos.slice(0, 5);
  const rest = videos.slice(5);
  const withDuration = await Promise.all(
    toFetch.map(async (v) => {
      const duration = await fetchVideoDuration(v.id);
      const durationSecs = duration
        ? duration
            .split(":")
            .reduce((acc: number, t: string) => acc * 60 + parseInt(t), 0)
        : 0;
      // Shorts are under 3 minutes (180 seconds)
      const isShort = durationSecs > 0 && durationSecs < 180;
      return { ...v, duration, isShort };
    })
  );
  return { videos: [...withDuration, ...rest], channelName };
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
