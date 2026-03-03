// app/api/getMessages/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const guild = req.nextUrl.searchParams.get("guild");
  if (!guild) {
    return NextResponse.json({ error: "GuildID is required" }, { status: 400 });
  }
  const token = process.env.LYNX_TOKEN!;

  const res = await fetch(
    `https://discord.com/api/guilds/${guild}/channels?limit=500`,
    {
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  const data = await res.json();
  if (data.length <= 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
