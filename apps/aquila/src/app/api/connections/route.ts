import { NextResponse } from "next/server";
import { auth } from "@runa/auth";
import api, { IConnection } from "@runa/api";

const NEST_URL =
  process.env.NEST_API_URL ||
  `http://localhost:${process.env.NEST_PORT || 4000}`;

const getApiConfig = (userId?: string): IConnection => ({
  host: NEST_URL,
  headers: {
    "x-api-key": process.env.INTERNAL_API_KEY!,
    ...(userId ? { "x-user-id": userId } : {}),
  },
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await api.functional.connection.findAll(
      getApiConfig(session.user.id),
      "AQUILA" as any,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Unknown error" },
      { status: err.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await api.functional.connection.upsert(getApiConfig(), {
      ...body,
      userId: session.user.id,
      linkedTo: "AQUILA" as any,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Unknown error" },
      { status: err.status || 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.json({ message: "Missing provider" }, { status: 400 });
  }

  try {
    await api.functional.connection.remove(getApiConfig(), provider, {
      userId: session.user.id,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Unknown error" },
      { status: err.status || 500 },
    );
  }
}
