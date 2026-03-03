import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@astral/database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { useSession } from "next-auth/react";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: Please login to continue" },
      { status: 401 },
    );
  }

  // 2. Validate Input
  try {
    const body = await req.json();
    const { guildId, channels } = body;

    if (!guildId || typeof guildId !== "string") {
      return NextResponse.json({ error: "Invalid guildId" }, { status: 400 });
    }

    if (!channels) {
      return NextResponse.json(
        { error: "Missing channels data" },
        { status: 400 },
      );
    }

    // Validate channels is valid JSON (it comes as object if req.json() worked,
    // but if user sends stringified JSON in a field, we might need to parse.
    // Assuming the client sends a JSON object structure).
    // Prisma Json type expects an object/array.

    // 3. Upsert HomeWorkChannels
    const result = await prisma.lynxHomeWorkChannels.upsert({
      where: { guildId },
      update: { channels },
      create: { guildId, channels },
    });

    return NextResponse.json({
      message: "Configuration saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving HomeWorkChannels:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
