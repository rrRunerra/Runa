import { NextResponse } from "next/server";
import { auth } from "@runa/auth";

const PROVIDERS: Record<string, { authUrl: string; clientId: string }> = {
  anilist: {
    authUrl: "https://anilist.co/api/v2/oauth/authorize",
    clientId: process.env.ANILIST_CLIENT_ID!,
  },
  mal: {
    authUrl: "https://myanimelist.net/v1/oauth2/authorize",
    clientId: process.env.MAL_CLIENT_ID!,
  },
  simkl: {
    authUrl: "https://simkl.com/oauth/authorize",
    clientId: process.env.SIMKL_CLIENT_ID!,
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { provider: providerParam } = await params;
  const providerId = providerParam.toLowerCase();
  const provider = PROVIDERS[providerId];

  if (!provider) {
    return NextResponse.json({ message: "Invalid provider" }, { status: 400 });
  }

  const clientId = provider.clientId?.trim().replace(/^"|"$/g, "");

  if (!clientId) {
    console.error(`Missing client ID for provider: ${providerId}`);
    return NextResponse.json(
      { message: "Missing configuration" },
      { status: 500 },
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/polaris/api/connections/${providerId}/callback`;

  const url = new URL(provider.authUrl);
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");

  if (providerId === "mal") {
    const codeChallenge = (
      process.env.MAL_CODE_CHALLANGE_STRING ||
      "fghnxfu5zer5uze5uzrthzfdhze5yherthd4rtze4g463rtgdzrgzde4h4h"
    ).trim();
    url.searchParams.append("code_challenge", codeChallenge);
    url.searchParams.append("code_challenge_method", "plain");
  }

  return NextResponse.redirect(url.toString());
}
