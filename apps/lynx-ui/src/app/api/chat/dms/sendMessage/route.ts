import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, channelId, content } = body;

  if (!content || (!userId && !channelId)) {
    return NextResponse.json(
      { error: "content and either userId or channelId are required" },
      { status: 400 },
    );
  }

  const lynxApiUrl = process.env.LYNX_API_URL;
  try {
    const res = await fetch(`${lynxApiUrl}/dms/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, channelId, content }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to send DM:", err);
    return NextResponse.json({ error: "Failed to send DM" }, { status: 500 });
  }
}
