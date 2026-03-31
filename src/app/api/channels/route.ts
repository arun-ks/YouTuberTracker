import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export interface ChannelGroup {
  name: string;
  channels: string[];
}

interface GroupsData {
  groups: ChannelGroup[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "channels.default.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readGroups(): Promise<GroupsData> {
  try {
    const data = await readFile(CHANNELS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { groups: [] };
  }
}

async function writeGroups(data: GroupsData) {
  await ensureDataDir();
  await writeFile(CHANNELS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function normalize(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

export async function GET() {
  const data = await readGroups();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body as { action: string };
  const data = await readGroups();

  switch (action) {
    case "add-channel": {
      const { group, handle } = body as { group: string; handle: string };
      if (!group || !handle) {
        return NextResponse.json(
          { error: "group and handle are required" },
          { status: 400 }
        );
      }
      const g = data.groups.find(
        (g) => g.name.toLowerCase() === group.toLowerCase()
      );
      if (!g) {
        return NextResponse.json(
          { error: `Group "${group}" not found` },
          { status: 404 }
        );
      }
      const normalized = normalize(handle);
      if (!g.channels.includes(normalized)) {
        g.channels.push(normalized);
        await writeGroups(data);
      }
      break;
    }

    case "remove-channel": {
      const { handle } = body as { handle: string };
      if (!handle) {
        return NextResponse.json(
          { error: "handle is required" },
          { status: 400 }
        );
      }
      const normalized = normalize(handle);
      for (const g of data.groups) {
        g.channels = g.channels.filter((c) => c !== normalized);
      }
      await writeGroups(data);
      break;
    }

    case "add-group": {
      const { name } = body as { name: string };
      if (!name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 }
        );
      }
      if (data.groups.length >= 5) {
        return NextResponse.json(
          { error: "Maximum 5 groups allowed" },
          { status: 400 }
        );
      }
      if (
        data.groups.some(
          (g) => g.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        return NextResponse.json(
          { error: `Group "${name}" already exists` },
          { status: 400 }
        );
      }
      data.groups.push({ name, channels: [] });
      await writeGroups(data);
      break;
    }

    case "remove-group": {
      const { name } = body as { name: string };
      data.groups = data.groups.filter(
        (g) => g.name.toLowerCase() !== (name ?? "").toLowerCase()
      );
      await writeGroups(data);
      break;
    }

    case "rename-group": {
      const { name, newName } = body as { name: string; newName: string };
      if (!name || !newName) {
        return NextResponse.json(
          { error: "name and newName are required" },
          { status: 400 }
        );
      }
      const g = data.groups.find(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (!g) {
        return NextResponse.json(
          { error: `Group "${name}" not found` },
          { status: 404 }
        );
      }
      if (
        data.groups.some(
          (g) => g.name.toLowerCase() === newName.toLowerCase()
        )
      ) {
        return NextResponse.json(
          { error: `Group "${newName}" already exists` },
          { status: 400 }
        );
      }
      g.name = newName;
      await writeGroups(data);
      break;
    }

    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
  }

  return NextResponse.json(await readGroups());
}
