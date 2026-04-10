import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const animeId = url.searchParams.get("animeId");

  if (!userId || !animeId) {
    return NextResponse.json(
      { success: false, message: "User ID and Anime ID are required" },
      { status: 400 },
    );
  }

  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      userId,
    );
  const isNumeric = /^\d+$/.test(animeId);

  if (!isUuid || !isNumeric) {
    return NextResponse.json(
      { success: false, message: "Invalid User ID or Anime ID format" },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/list/anime/${userId}/${animeId}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

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

  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      userId,
    );
  const isNumeric = /^\d+$/.test(animeId);

  if (!isUuid || !isNumeric) {
    return NextResponse.json(
      { success: false, message: "Invalid ID format" },
      { status: 400 },
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

  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const animeId = url.searchParams.get("animeId");

  if (!userId || !animeId) {
    return NextResponse.json(
      { success: false, message: "User ID and Anime ID are required" },
      { status: 400 },
    );
  }

  if (!req.headers.get("Authorization")) {
    return NextResponse.json(
      { success: false, message: "No authentication token found" },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/list/anime/${userId}/${animeId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization")!,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
