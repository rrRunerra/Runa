import { NextResponse } from "next/server";

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

  const res = await fetch(
    `http://localhost:${process.env.NEST_PORT}/user/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: password,
      }),
    },
  );

  if (res.ok) {
    return NextResponse.json({ success: true }, { status: res.status });
  } else {
    return NextResponse.json(await res.json(), { status: res.status });
  }
}
