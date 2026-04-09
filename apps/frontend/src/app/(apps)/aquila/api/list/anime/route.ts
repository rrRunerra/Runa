import { auth } from "@runa/auth";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function GET(req: NextRequest) {}

export async function POST(req: NextRequest) {
  const {
    userId,
    animeId,
    status,
    progress,
    score,
    startDate,
    endDate,
    notes,
    rewatched,
  } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "User ID is required" },
      { status: 400 },
    );
  }

  if (!animeId) {
    return NextResponse.json(
      { success: false, message: "Anime ID is required" },
      { status: 400 },
    );
  }

  if (!req.headers.get("Authorization")) {
    return NextResponse.json(
      { success: false, message: "No authentication token found" },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/list/anime/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization")!,
    },
    body: JSON.stringify({
      userId,
      animeId,
      status,
      progress,
      score,
      startDate,
      endDate,
      notes,
      rewatched,
    }),
  });
  const data = await res.json();

  console.log(data);

  return NextResponse.json(data, { status: res.status });
}
