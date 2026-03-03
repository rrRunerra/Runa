// app/api/sendMessage/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { guild, channel, content } = await req.json();

  const res = await fetch(
    `${process.env.LYNX_API_URL}/guilds/${guild}/channels/${channel}/send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );

  const data = await res.json();
  return NextResponse.json(data);
}
