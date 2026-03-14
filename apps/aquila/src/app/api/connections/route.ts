import { NextResponse } from "next/server";

async function GET() {
  return NextResponse.json([
    {
      id: "1",
      provider: "ANIMEPAHE",
      username: "username",
    },
    {
      id: "2",
      provider: "HIANIME",
      username: "username2",
    },
  ]);
}

export { GET };
