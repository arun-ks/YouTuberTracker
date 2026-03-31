import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export interface ChannelGroup {
  name: string;
  channels: string[];
}

export interface GroupsData {
  groups: ChannelGroup[];
}

const KV_KEY = "youtube-tracker:channels";

const DATA_DIR = path.join(process.cwd(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "channels.default.json");

function hasKv(): boolean {
  return !!process.env.KV_REST_API_URL;
}

async function readFromFile(): Promise<GroupsData> {
  try {
    const data = await readFile(CHANNELS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { groups: [] };
  }
}

async function writeToFile(data: GroupsData) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CHANNELS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function readGroups(): Promise<GroupsData> {
  if (hasKv()) {
    const { kv } = await import("@vercel/kv");
    const data = await kv.get<GroupsData>(KV_KEY);
    if (data) return data;
    // Seed KV from local file on first use
    const seed = await readFromFile();
    await kv.set(KV_KEY, seed);
    return seed;
  }
  return readFromFile();
}

export async function writeGroups(data: GroupsData) {
  if (hasKv()) {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, data);
    return;
  }
  await writeToFile(data);
}
