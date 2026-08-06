import { NextRequest, NextResponse } from "next/server";

function formatMalNode(item: any) {
  const englishTitle = item.alternative_titles?.en?.trim();
  const mainTitle = item.title?.trim();
  const displayTitle = englishTitle || mainTitle || "Untitled";

  return {
    id: item.id.toString(),
    title: displayTitle,
    image: item.main_picture?.medium || item.main_picture?.large || "",
    format: item.media_type ? item.media_type.toUpperCase() : undefined,
    episodes: item.num_episodes,
    chapters: item.num_chapters,
  };
}

async function fetchMalOfficial(url: string, clientId: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "X-MAL-CLIENT-ID": clientId,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Official MAL API fetch error:", err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim();
  const type = (searchParams.get("type") || "anime").toLowerCase() === "manga" ? "manga" : "anime";

  if (!query) {
    return NextResponse.json([]);
  }

  const clientId =
    process.env.NEXT_PUBLIC_MAL_CLIENT_ID || process.env.MAL_CLIENT_ID || "";

  if (!clientId) {
    return NextResponse.json(
      { error: "MAL Client ID is not configured (NEXT_PUBLIC_MAL_CLIENT_ID / MAL_CLIENT_ID missing)" },
      { status: 400 }
    );
  }

  const fields =
    type === "anime"
      ? "id,title,main_picture,alternative_titles,media_type,num_episodes"
      : "id,title,main_picture,alternative_titles,media_type,num_chapters,num_volumes";

  // 1. Direct ID or MAL URL lookup
  const malUrlMatch = query.match(/myanimelist\.net\/(anime|manga)\/(\d+)/i);
  const directId = malUrlMatch ? malUrlMatch[2] : /^\d+$/.test(query) ? query : null;

  if (directId) {
    const data = await fetchMalOfficial(
      `https://api.myanimelist.net/v2/${type}/${directId}?fields=${fields}`,
      clientId
    );
    if (data && data.id) {
      return NextResponse.json([formatMalNode(data)]);
    }
  }

  // 2. Search Strategy 1: Exact query search (if length >= 3)
  if (query.length >= 3) {
    const searchUrl = `https://api.myanimelist.net/v2/${type}?q=${encodeURIComponent(query)}&limit=10&fields=${fields}`;
    const data = await fetchMalOfficial(searchUrl, clientId);
    const results = (data?.data || []).map((entry: any) => formatMalNode(entry.node || entry));

    if (results.length > 0) {
      return NextResponse.json(results);
    }
  }

  // 3. Search Strategy 2: Sanitized query search (stripping punctuation/special characters)
  const sanitized = query.replace(/[:\-_\/\\'"!?,.~#@$%^&*()+=<>]/g, " ").replace(/\s+/g, " ").trim();
  if (sanitized && sanitized !== query && sanitized.length >= 3) {
    const searchUrl = `https://api.myanimelist.net/v2/${type}?q=${encodeURIComponent(sanitized)}&limit=10&fields=${fields}`;
    const data = await fetchMalOfficial(searchUrl, clientId);
    const results = (data?.data || []).map((entry: any) => formatMalNode(entry.node || entry));
    if (results.length > 0) {
      return NextResponse.json(results);
    }
  }

  // 4. Search Strategy 3: Leading core terms fallback (first 2-3 words if long query)
  const words = (sanitized || query).split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    const leadingQuery = words.slice(0, 3).join(" ");
    if (leadingQuery.length >= 3 && leadingQuery !== sanitized && leadingQuery !== query) {
      const searchUrl = `https://api.myanimelist.net/v2/${type}?q=${encodeURIComponent(leadingQuery)}&limit=10&fields=${fields}`;
      const data = await fetchMalOfficial(searchUrl, clientId);
      const results = (data?.data || []).map((entry: any) => formatMalNode(entry.node || entry));
      if (results.length > 0) {
        return NextResponse.json(results);
      }
    }
  }

  return NextResponse.json([]);
}

