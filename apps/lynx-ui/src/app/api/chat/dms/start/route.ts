import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const lynxApiUrl = process.env.LYNX_API_URL || "http://localhost:4444";
  try {
    const res = await fetch(`${lynxApiUrl}/dms/start?userId=${userId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to start DM:", err);
    return NextResponse.json({ error: "Failed to start DM" }, { status: 500 });
  }
}
