// app/api/getMessages/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const res = await fetch(`${process.env.LYNX_API_URL}/guilds`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data);
}
