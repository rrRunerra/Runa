import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const data = await fetch(`${process.env.LYNX_API_URL}/database/list`, {
    cache: "force-cache",
  });
  const json = await data.json();
  return NextResponse.json(json);
}
