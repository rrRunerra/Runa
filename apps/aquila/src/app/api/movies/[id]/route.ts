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
    return Response.json({ error: "Movie ID is required" }, { status: 400 });
  }

  const movieData = await functional.movie.getMovie(connection, id);

  return Response.json(movieData);
}
