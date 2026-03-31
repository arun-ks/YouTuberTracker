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

function hasTurso(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
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

import type { Client } from "@libsql/client";

let tursoClient: Client | null = null;

async function getTursoClient() {
  if (!tursoClient) {
    const { createClient } = await import("@libsql/client");
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    await tursoClient.execute(
      `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      )`
    );
  }
  return tursoClient;
}

export async function readGroups(): Promise<GroupsData> {
  if (hasTurso()) {
    const client = await getTursoClient();
    const result = await client.execute(
      "SELECT data FROM channels WHERE id = 1"
    );
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].data as string);
    }
    // Seed from local file on first use
    const seed = await readFromFile();
    await client.execute({
      sql: "INSERT INTO channels (id, data) VALUES (1, ?)",
      args: [JSON.stringify(seed)],
    });
    return seed;
  }
  return readFromFile();
}

export async function writeGroups(data: GroupsData) {
  if (hasTurso()) {
    const client = await getTursoClient();
    await client.execute({
      sql: "UPDATE channels SET data = ? WHERE id = 1",
      args: [JSON.stringify(data)],
    });
    return;
  }
  await writeToFile(data);
}
