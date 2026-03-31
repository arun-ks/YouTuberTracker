"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface Video {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  channelHandle: string;
  channelName: string;
  url: string;
}

type SortField = "date" | "channel";
type SortDir = "asc" | "desc";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"videos" | "manage">("videos");
  const [channels, setChannels] = useState<string[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [addLoading, setAddLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        const data = await res.json();
        if (!cancelled) setChannels(data.channels ?? []);
      } catch {
        if (!cancelled) setChannels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAllVideos = useCallback(async (handles: string[]) => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      handles.map(async (handle) => {
        const res = await fetch(
          `/api/youtube?handle=${encodeURIComponent(handle)}`
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed for ${handle}`);
        }
        return res.json();
      })
    );

    const allVideos: Video[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        allVideos.push(...result.value.videos);
      } else {
        errors.push(`${handles[i]}: ${result.reason.message}`);
      }
    });

    setVideos(allVideos);
    if (errors.length > 0) {
      setError(`Failed to load: ${errors.join("; ")}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (channels.length > 0 && !fetchedRef.current) {
      fetchedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAllVideos(channels);
    }
  }, [channels, fetchAllVideos]);

  const addChannel = async () => {
    if (!newHandle.trim()) return;
    setAddLoading(true);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", handle: newHandle.trim() }),
    });
    const data = await res.json();
    setChannels(data.channels);
    setNewHandle("");
    setAddLoading(false);
  };

  const removeChannel = async (handle: string) => {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", handle }),
    });
    const data = await res.json();
    setChannels(data.channels);
  };

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortField === "date") {
      const diff =
        new Date(a.published).getTime() - new Date(b.published).getTime();
      return sortDir === "asc" ? diff : -diff;
    }
    const cmp = a.channelName.localeCompare(b.channelName);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">YouTube Tracker</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Track recent videos from your favorite creators
        </p>
      </header>

      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "videos"
              ? "border-b-2 border-red-500 text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Videos
        </button>
        <button
          onClick={() => setActiveTab("manage")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "manage"
              ? "border-b-2 border-red-500 text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Manage Channels
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "manage" && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChannel()}
                placeholder="@ChannelHandle"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                onClick={addChannel}
                disabled={addLoading || !newHandle.trim()}
                className="bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {addLoading ? "Adding..." : "Add"}
              </button>
            </div>

            {channels.length === 0 ? (
              <p className="text-neutral-500 text-sm py-8 text-center">
                No channels tracked yet. Add a channel handle above to start
                tracking.
              </p>
            ) : (
              <ul className="space-y-2">
                {channels.map((ch) => (
                  <li
                    key={ch}
                    className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3"
                  >
                    <a
                      href={`https://www.youtube.com/${ch}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-200 hover:text-red-400 transition-colors"
                    >
                      {ch}
                    </a>
                    <button
                      onClick={() => removeChannel(ch)}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "videos" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">Sort by:</span>
              <button
                onClick={() => toggleSort("date")}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  sortField === "date"
                    ? "bg-red-600/20 text-red-400 border border-red-600/30"
                    : "text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                }`}
              >
                Date{" "}
                {sortField === "date" && (sortDir === "desc" ? "\u2193" : "\u2191")}
              </button>
              <button
                onClick={() => toggleSort("channel")}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  sortField === "channel"
                    ? "bg-red-600/20 text-red-400 border border-red-600/30"
                    : "text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                }`}
              >
                Channel{" "}
                {sortField === "channel" &&
                  (sortDir === "desc" ? "\u2193" : "\u2191")}
              </button>
              <button
                onClick={() => fetchAllVideos(channels)}
                disabled={loading || channels.length === 0}
                className="ml-auto text-sm px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {loading && videos.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-red-500" />
                <p className="text-neutral-500 text-sm mt-3">
                  Fetching videos...
                </p>
              </div>
            )}

            {!loading && channels.length === 0 && (
              <p className="text-neutral-500 text-sm py-16 text-center">
                Add channels in the &quot;Manage Channels&quot; tab to start
                tracking videos.
              </p>
            )}

            {!loading &&
              channels.length > 0 &&
              videos.length === 0 &&
              !error && (
                <p className="text-neutral-500 text-sm py-16 text-center">
                  No videos found for tracked channels.
                </p>
              )}

            <div className="grid gap-4">
              {sortedVideos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors group"
                >
                  <div className="relative w-64 h-36 flex-shrink-0 bg-neutral-800">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                  </div>
                  <div className="flex flex-col justify-center py-3 pr-4 min-w-0">
                    <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-red-400 transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-2">
                      {video.channelName}
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      {formatDate(video.published)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
