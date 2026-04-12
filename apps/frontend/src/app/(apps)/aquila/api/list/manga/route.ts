import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const mangaId = url.searchParams.get("mangaId");

  if (!userId || !mangaId) {
    return NextResponse.json(
      { success: false, message: "User ID and Manga ID are required" },
      { status: 400 },
    );
  }

  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      userId,
    );
  const isNumeric = /^\d+$/.test(mangaId);

  if (!isUuid || !isNumeric) {
    return NextResponse.json(
      { success: false, message: "Invalid User ID or Manga ID format" },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/list/manga/${userId}/${mangaId}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const {
    userId,
    mangaId,
    status,
    chapters,
    volumes,
    score,
    startDate,
    endDate,
    notes,
    reread,
    updateConnection,
    connections,
  } = await req.json();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "User ID is required" },
      { status: 400 },
    );
  }

  if (!mangaId) {
    return NextResponse.json(
      { success: false, message: "Manga ID is required" },
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
  const isNumeric = /^\d+$/.test(String(mangaId));

  if (!isUuid || !isNumeric) {
    return NextResponse.json(
      { success: false, message: "Invalid ID format" },
      { status: 400 },
    );
  }

  const res = await fetch(`${API_URL}/list/manga/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization")!,
    },
    body: JSON.stringify({
      userId,
      mangaId,
      status,
      chapters,
      volumes,
      score,
      startDate,
      endDate,
      notes,
      reread,
      updateConnection,
      connections,
    }),
  });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const mangaId = url.searchParams.get("mangaId");

  if (!userId || !mangaId) {
    return NextResponse.json(
      { success: false, message: "User ID and Manga ID are required" },
      { status: 400 },
    );
  }

  if (!req.headers.get("Authorization")) {
    return NextResponse.json(
      { success: false, message: "No authentication token found" },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/list/manga/${userId}/${mangaId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization")!,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
