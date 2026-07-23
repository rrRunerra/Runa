import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const type = (searchParams.get("type") || "anime").toLowerCase();

  if (!query) {
    return NextResponse.json([]);
  }

  const clientId =
    process.env.NEXT_PUBLIC_MAL_CLIENT_ID || process.env.MAL_CLIENT_ID || "";
  const fields =
    type === "anime"
      ? "id,title,main_picture,alternative_titles,media_type,num_episodes"
      : "id,title,main_picture,alternative_titles,media_type,num_chapters,num_volumes";

  if (clientId) {
    try {
      const res = await fetch(
        `https://api.myanimelist.net/v2/${type}?q=${encodeURIComponent(query)}&limit=10&fields=${fields}`,
        {
          headers: {
            "X-MAL-CLIENT-ID": clientId,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.data || []).map((entry: any) => {
          const item = entry.node || entry;
          return {
            id: item.id.toString(),
            title: item.alternative_titles?.en || item.title,
            image: item.main_picture?.medium || item.main_picture?.large,
            format: item.media_type ? item.media_type.toUpperCase() : undefined,
            episodes: item.num_episodes,
            chapters: item.num_chapters,
          };
        });
        return NextResponse.json(results);
      }
    } catch (err) {
      console.warn(
        "Official MAL API search error in route handler, trying Jikan fallback:",
        err
      );
    }
  }

  // Fallback to Jikan API on server side
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&limit=10`
    );
    if (res.ok) {
      const data = await res.json();
      const results = (data.data || []).map((item: any) => ({
        id: item.mal_id.toString(),
        title: item.title_english || item.title,
        image: item.images?.jpg?.image_url,
        format: item.type,
        episodes: item.episodes,
        chapters: item.chapters,
      }));
      return NextResponse.json(results);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `MAL search failed: ${err.message || err}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "MAL search returned no results" },
    { status: 404 }
  );
}
