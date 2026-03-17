import { NextRequest, NextResponse } from "next/server";
import { functional, IConnection } from "@runa/api";

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

  const connection: IConnection = {
    host:
      process.env.NEST_API_URL ?? `http://localhost:${process.env.NEST_PORT}`,
  };

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

  switch (type) {
    case "anime":
      const anime = await functional.anime.search(connection, { name: query });
      return NextResponse.json(
        Array.isArray(anime)
          ? anime.map(mapItem)
          : ((anime as any).data?.map(mapItem) ?? anime),
      );
    case "manga":
      const manga = await functional.manga.search(connection, { name: query });
      return NextResponse.json(
        Array.isArray(manga)
          ? manga.map(mapItem)
          : ((manga as any).data?.map(mapItem) ?? manga),
      );
    case "movies":
      const movie = await functional.movie.search(connection, { name: query });
      return NextResponse.json(
        Array.isArray(movie)
          ? movie.map(mapItem)
          : ((movie as any).data?.map(mapItem) ?? movie),
      );
    case "tv":
      const tv = await functional.tv.search(connection, { name: query });
      return NextResponse.json(
        Array.isArray(tv)
          ? tv.map(mapItem)
          : ((tv as any).data?.map(mapItem) ?? tv),
      );
    case "game":
    //   const game = await functional.game.search(connection, { name: query });
    //   return NextResponse.json(game);
    case "book":
    //   const book = await functional.book.search(connection, { name: query });
    //   return NextResponse.json(book);
    case "music":
    //   const music = await functional.music.search(connection, { name: query });
    //   return NextResponse.json(music);
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
