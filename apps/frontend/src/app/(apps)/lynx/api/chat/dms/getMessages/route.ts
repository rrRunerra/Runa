import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 },
    );
  }

  const lynxApiUrl = process.env.LYNX_API_URL;
  try {
    const res = await fetch(
      `${lynxApiUrl}/dms/getMessages?channelId=${channelId}`,
      {
        cache: "no-store",
      },
    );
    const messages = await res.json();
    return NextResponse.json(messages);
  } catch (err) {
    console.error("Failed to fetch DM messages:", err);
    return NextResponse.json(
      { error: "Failed to fetch DM messages" },
      { status: 500 },
    );
  }
}
