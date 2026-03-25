// app/api/sendMessage/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { guild, channel, content } = await req.json();

  if (
    !guild ||
    !channel ||
    !/^\d{17,20}$/.test(guild) ||
    !/^\d{17,20}$/.test(channel)
  ) {
    return NextResponse.json(
      { error: "Invalid guild or channel format" },
      { status: 400 },
    );
  }

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
