import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid or missing Anime ID" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/anime/${id}`);
  
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch anime data" }, { status: res.status });
  }

  const animeData = await res.json();
  return NextResponse.json(animeData);
}
