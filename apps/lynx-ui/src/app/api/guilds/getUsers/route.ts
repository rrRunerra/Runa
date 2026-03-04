import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");

  if (!guildId) {
    return NextResponse.json({ error: "guildId is required" }, { status: 400 });
  }

  const lynxApiUrl = process.env.LYNX_API_URL;
  try {
    const res = await fetch(`${lynxApiUrl}/guilds/${guildId}/getUsers`, {
      cache: "no-store",
    });
    const users = await res.json();
    return NextResponse.json(users);
  } catch (err) {
    console.error("Failed to fetch guild users:", err);
    return NextResponse.json(
      { error: "Failed to fetch guild users" },
      { status: 500 },
    );
  }
}
