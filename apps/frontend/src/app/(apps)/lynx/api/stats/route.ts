import { NextResponse } from "next/server";

export async function GET() {
  try {
    const port = process.env.LYNX_PORT || 4444;
    const backendUrl = `http://localhost:${port}/stats`;

    // Use no-store to always fetch the freshest data (status might change often)
    const res = await fetch(backendUrl, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 503) {
        return NextResponse.json(
          { error: "Bot is currently offline or starting" },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch stats from backend" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching lynx stats:", error);
    return NextResponse.json(
      { error: "Could not connect to Lynx backend" },
      { status: 500 },
    );
  }
}
