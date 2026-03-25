import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "TV ID is required" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/tv/${id}`);
  
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch TV show data" }, { status: res.status });
  }

  const tvData = await res.json();
  return NextResponse.json(tvData);
}
