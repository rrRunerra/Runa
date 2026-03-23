import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

const validTypes = [
  "anime",
  "manga",
  "movies",
  "tv",
  "games",
  "books",
  "music",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type")?.toLocaleLowerCase();

  if (!query || !type) {
    return NextResponse.json(
      { error: "Missing query or type" },
      { status: 400 },
    );
  }
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const mapItem = (item: any) => ({
    id: item.id.toString(),
    title: {
      romaji: item.title?.romaji ?? "",
      english: item.title?.english ?? "",
    },
    coverImage: {
      large: item.coverImage?.large ?? "",
    },
    format: item.format ?? "",
    status: item.status ?? "",
    isAdult: !!item.isAdult,
  });

  const endpointMap: Record<string, string> = {
    anime: "anime",
    manga: "manga",
    movies: "movie",
    tv: "tv",
  };

  const endpoint = endpointMap[type];
  if (!endpoint) {
    return NextResponse.json({ error: "Type not implemented" }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/${endpoint}/search?name=${encodeURIComponent(query)}`);

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: res.status });
  }

  const data = await res.json();
  
  return NextResponse.json(
    Array.isArray(data)
      ? data.map(mapItem)
      : (data.data?.map(mapItem) ?? data),
  );
}
