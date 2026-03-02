import { NextResponse } from "next/server";
import { functional } from "@runa/api";
import type { IConnection } from "@runa/api";

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

  const connection: IConnection = {
    host: `http://localhost:${process.env.NEST_PORT}`,
  };

  try {
    const result = await functional.user.create(connection, {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: password,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.status) {
      return NextResponse.json(
        { message: error.message || "An error occurred" },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
