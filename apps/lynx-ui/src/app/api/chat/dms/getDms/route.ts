import { NextResponse } from "next/server";

export async function GET() {
  const lynxApiUrl = process.env.LYNX_API_URL || "http://localhost:4444";
  try {
    const res = await fetch(`${lynxApiUrl}/dms/getDms`, {
      cache: "no-store",
    });
    const dms = await res.json();
    return NextResponse.json(dms);
  } catch (err) {
    console.error("Failed to fetch DMs:", err);
    return NextResponse.json({ error: "Failed to fetch DMs" }, { status: 500 });
  }
}
