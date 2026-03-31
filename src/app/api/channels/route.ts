import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "channels.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readChannels(): Promise<string[]> {
  try {
    const data = await readFile(CHANNELS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeChannels(channels: string[]) {
  await ensureDataDir();
  await writeFile(CHANNELS_FILE, JSON.stringify(channels, null, 2), "utf-8");
}

export async function GET() {
  const channels = await readChannels();
  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, handle } = body as {
    action: "add" | "remove";
    handle: string;
  };

  if (!handle || typeof handle !== "string") {
    return NextResponse.json(
      { error: "handle is required" },
      { status: 400 }
    );
  }

  const normalized = handle.startsWith("@") ? handle : `@${handle}`;
  const channels = await readChannels();

  if (action === "add") {
    if (!channels.includes(normalized)) {
      channels.push(normalized);
      await writeChannels(channels);
    }
  } else if (action === "remove") {
    const filtered = channels.filter((c) => c !== normalized);
    await writeChannels(filtered);
  } else {
    return NextResponse.json(
      { error: "action must be 'add' or 'remove'" },
      { status: 400 }
    );
  }

  return NextResponse.json({ channels: await readChannels() });
}
