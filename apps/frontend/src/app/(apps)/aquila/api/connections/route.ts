import { NextResponse } from "next/server";
import { auth } from "@runa/auth";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT || 4000}`;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/connections`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/connections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(await req.json()),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return NextResponse.json(data);
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

  const res = await fetch(`${API_URL}/connections/${provider}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message);
  }

  return NextResponse.json(data);
}
