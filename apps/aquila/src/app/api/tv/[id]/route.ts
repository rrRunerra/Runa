import { NextRequest } from "next/server";
import { functional, IConnection } from "@runa/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const connection: IConnection = {
    host:
      process.env.NEST_API_URL ?? `http://localhost:${process.env.NEST_PORT}`,
  };

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "TV ID is required" }, { status: 400 });
  }

  const tvData = await functional.tv.getTv(connection, id);

  return Response.json(tvData);
}
