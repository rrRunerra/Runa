export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  const lynxApiUrl = process.env.LYNX_API_URL;

  const response = await fetch(`${lynxApiUrl}/dms/${channel}/stream`);

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
