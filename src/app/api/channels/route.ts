import { NextResponse } from "next/server";
import { readGroups, writeGroups } from "./store";

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
      if (data.groups.length >= 20) {
        return NextResponse.json(
          { error: "Maximum 20 groups allowed" },
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
