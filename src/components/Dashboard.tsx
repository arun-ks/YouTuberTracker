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

interface ChannelGroup {
  name: string;
  channels: string[];
}

type SortField = "date" | "channel";
type SortDir = "asc" | "desc";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"videos" | "manage">("videos");
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const fetchedRef = useRef(false);

  // New channel input state
  const [newHandle, setNewHandle] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // New group input state
  const [newGroupName, setNewGroupName] = useState("");
  const [addGroupLoading, setAddGroupLoading] = useState(false);

  // Inline rename state
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const allHandles = groups.flatMap((g) => g.channels);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/channels");
        const data = await res.json();
        if (!cancelled) {
          setGroups(data.groups ?? []);
          if ((data.groups ?? []).length > 0) {
            setTargetGroup(data.groups[0].name);
          }
        }
      } catch {
        if (!cancelled) setGroups([]);
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
    if (allHandles.length > 0 && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAllVideos(allHandles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, fetchAllVideos]);

  const refreshGroups = async () => {
    const res = await fetch("/api/channels");
    const data = await res.json();
    setGroups(data.groups ?? []);
  };

  const addChannel = async () => {
    if (!newHandle.trim() || !targetGroup) return;
    setAddLoading(true);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-channel",
        handle: newHandle.trim(),
        group: targetGroup,
      }),
    });
    await refreshGroups();
    setNewHandle("");
    setAddLoading(false);
  };

  const removeChannel = async (handle: string) => {
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-channel", handle }),
    });
    await refreshGroups();
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    setAddGroupLoading(true);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-group", name: newGroupName.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setGroups(data.groups ?? []);
    }
    setNewGroupName("");
    setAddGroupLoading(false);
  };

  const removeGroup = async (name: string) => {
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-group", name }),
    });
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    await refreshGroups();
  };

  const renameGroup = async (oldName: string) => {
    if (!renameValue.trim()) return;
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rename-group",
        name: oldName,
        newName: renameValue.trim(),
      }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setGroups(data.groups ?? []);
      setSelectedGroups((prev) => {
        if (prev.has(oldName)) {
          const next = new Set(prev);
          next.delete(oldName);
          next.add(renameValue.trim());
          return next;
        }
        return prev;
      });
    }
    setRenamingGroup(null);
    setRenameValue("");
  };

  const toggleGroupFilter = (name: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Build handle -> group name map for filtering
  const handleToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const ch of g.channels) {
      handleToGroup.set(ch, g.name);
    }
  }

  const filteredHandles =
    selectedGroups.size === 0
      ? allHandles
      : allHandles.filter((h) => selectedGroups.has(handleToGroup.get(h) ?? ""));

  const filteredVideos =
    selectedGroups.size === 0
      ? videos
      : videos.filter((v) =>
          selectedGroups.has(handleToGroup.get(v.channelHandle) ?? "")
        );

  const sortedVideos = [...filteredVideos].sort((a, b) => {
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
            {/* Add group row */}
            <div className="flex gap-3">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
                placeholder="New group name"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                onClick={addGroup}
                disabled={
                  addGroupLoading || !newGroupName.trim() || groups.length >= 5
                }
                className="bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {addGroupLoading ? "Adding..." : "Add Group"}
              </button>
            </div>
            {groups.length >= 5 && (
              <p className="text-xs text-neutral-600">Maximum 5 groups reached</p>
            )}

            {/* Groups list */}
            {groups.length === 0 ? (
              <p className="text-neutral-500 text-sm py-8 text-center">
                No groups yet. Create a group above, then add channels to it.
              </p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div
                    key={group.name}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                      {renamingGroup === group.name ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameGroup(group.name);
                              if (e.key === "Escape") setRenamingGroup(null);
                            }}
                            className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-red-500"
                            autoFocus
                          />
                          <button
                            onClick={() => renameGroup(group.name)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRenamingGroup(null)}
                            className="text-xs text-neutral-500 hover:text-neutral-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-semibold text-neutral-200">
                            {group.name}
                            <span className="text-neutral-600 font-normal ml-2">
                              ({group.channels.length})
                            </span>
                          </h3>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setRenamingGroup(group.name);
                                setRenameValue(group.name);
                              }}
                              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => removeGroup(group.name)}
                              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              Delete Group
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Add channel to this group */}
                    <div className="flex gap-2 px-4 py-2 border-b border-neutral-800">
                      <input
                        type="text"
                        value={targetGroup === group.name ? newHandle : ""}
                        onChange={(e) => {
                          setTargetGroup(group.name);
                          setNewHandle(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setTargetGroup(group.name);
                            addChannel();
                          }
                        }}
                        placeholder="@ChannelHandle"
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      />
                      <button
                        onClick={() => {
                          setTargetGroup(group.name);
                          addChannel();
                        }}
                        disabled={
                          addLoading ||
                          !(targetGroup === group.name && newHandle.trim())
                        }
                        className="bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:text-neutral-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        {addLoading ? "..." : "Add"}
                      </button>
                    </div>

                    {/* Channel list */}
                    {group.channels.length === 0 ? (
                      <p className="text-neutral-600 text-xs px-4 py-3">
                        No channels in this group
                      </p>
                    ) : (
                      <ul>
                        {group.channels.map((ch) => (
                          <li
                            key={ch}
                            className="flex items-center justify-between px-4 py-2 hover:bg-neutral-800/50 transition-colors"
                          >
                            <a
                              href={`https://www.youtube.com/${ch}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-neutral-300 hover:text-red-400 transition-colors"
                            >
                              {ch}
                            </a>
                            <button
                              onClick={() => removeChannel(ch)}
                              className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "videos" && (
          <div className="space-y-4">
            {/* Group filter checkboxes + sort controls */}
            <div className="flex flex-wrap items-center gap-3">
              {groups.length > 0 && (
                <>
                  <span className="text-sm text-neutral-500">Filter:</span>
                  {groups.map((group) => (
                    <label
                      key={group.name}
                      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                        selectedGroups.has(group.name)
                          ? "bg-red-600/20 text-red-400 border border-red-600/30"
                          : "text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.name)}
                        onChange={() => toggleGroupFilter(group.name)}
                        className="accent-red-500"
                      />
                      {group.name}
                    </label>
                  ))}
                  <span className="text-neutral-700">|</span>
                </>
              )}
              <span className="text-sm text-neutral-500">Sort:</span>
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
                onClick={() => fetchAllVideos(filteredHandles)}
                disabled={loading || filteredHandles.length === 0}
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

            {!loading && allHandles.length === 0 && (
              <p className="text-neutral-500 text-sm py-16 text-center">
                Add channels in the &quot;Manage Channels&quot; tab to start
                tracking videos.
              </p>
            )}

            {!loading &&
              allHandles.length > 0 &&
              filteredVideos.length === 0 &&
              !error && (
                <p className="text-neutral-500 text-sm py-16 text-center">
                  {selectedGroups.size > 0
                    ? "No videos found for the selected groups."
                    : "No videos found for tracked channels."}
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
                    {handleToGroup.has(video.channelHandle) && (
                      <span className="text-xs text-neutral-700 mt-1">
                        {handleToGroup.get(video.channelHandle)}
                      </span>
                    )}
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
