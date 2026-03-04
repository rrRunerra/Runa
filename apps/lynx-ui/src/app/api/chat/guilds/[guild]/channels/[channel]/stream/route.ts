export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guild: string; channel: string }> },
) {
  const { guild, channel } = await params;
  const lynxApiUrl = process.env.LYNX_API_URL;

  const response = await fetch(
    `${lynxApiUrl}/guilds/${guild}/channels/${channel}/stream`,
  );

  const stream = response.body;

  if (!stream) {
    return new Response("Stream not available", { status: 500 });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
