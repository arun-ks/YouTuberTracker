import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export interface ChannelGroup {
  name: string;
  channels: string[];
}

export interface GroupsData {
  groups: ChannelGroup[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "channels.default.json");

async function readFromFile(): Promise<GroupsData> {
  try {
    const data = await readFile(CHANNELS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { groups: [] };
  }
}

export async function readGroups(): Promise<GroupsData> {
  return readFromFile();
}

export async function writeGroups(data: GroupsData) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CHANNELS_FILE, JSON.stringify(data, null, 2), "utf-8");
}
