import { NextResponse } from "next/server";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

export async function POST(req: Request) {
  const { email, password, username } = (await req.json()) as {
    email: string;
    password: string;
    username: string;
  };

  if (process.env.ENABLE_REGISTRATION !== "true") {
    return NextResponse.json(
      { message: ["Registration is disabled"] },
      { status: 403 },
    );
  }

  const res = await fetch(`${API_URL}/user/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
