// app/api/getMessages/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { guild, guild_channel } = Object.fromEntries(searchParams.entries());

  const res = await fetch(
    `${process.env.LYNX_API_URL}/guilds/${guild}/channels/${guild_channel}/getMessages`,
  );
  const data = await res.json();

  return NextResponse.json(data);
}
