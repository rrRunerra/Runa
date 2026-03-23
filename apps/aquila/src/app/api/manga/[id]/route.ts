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
    return NextResponse.json({ error: "Manga ID is required" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/manga/${id}`);
  
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch manga data" }, { status: res.status });
  }

  const mangaData = await res.json();
  return NextResponse.json(mangaData);
}
