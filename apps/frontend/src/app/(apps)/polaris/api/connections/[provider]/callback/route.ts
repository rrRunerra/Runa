import { NextResponse } from "next/server";
import { auth } from "@runa/auth";
import "dotenv/config";

const API_URL = process.env.NEST_API_URL
  ? process.env.NEST_API_URL
  : `http://localhost:${process.env.NEST_PORT}`;

const PROVIDERS: Record<string, any> = {
  anilist: {
    tokenUrl: "https://anilist.co/api/v2/oauth/token",
    clientId: process.env.ANILIST_CLIENT_ID,
    clientSecret: process.env.ANILIST_CLIENT_SECRET,
    profileUrl: "https://graphql.anilist.co",
    async getProfile(token: string) {
      const res = await fetch(this.profileUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "{ Viewer { id name } }",
        }),
      });
      const { data } = await res.json();
      return { id: String(data.Viewer.id), username: data.Viewer.name };
    },
  },
  mal: {
    tokenUrl: "https://myanimelist.net/v1/oauth2/token",
    clientId: process.env.MAL_CLIENT_ID,
    clientSecret: process.env.MAL_CLIENT_SECRET,
    profileUrl: "https://api.myanimelist.net/v2/users/@me",
    async getProfile(token: string) {
      const res = await fetch(this.profileUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return { id: String(data.id), username: data.name };
    },
  },
  simkl: {
    tokenUrl: "https://api.simkl.com/oauth/token",
    clientId: process.env.SIMKL_CLIENT_ID,
    clientSecret: process.env.SIMKL_CLIENT_SECRET,
    profileUrl: "https://api.simkl.com/users/settings",
    async getProfile(token: string) {
      const res = await fetch(this.profileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "simkl-api-key": process.env.SIMKL_CLIENT_ID!,
        },
      });
      const data = await res.json();
      return { id: String(data.user.id), username: data.user.name };
    },
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.redirect(`/polaris/connections?error=unauthorized`);
  }

  const { provider: providerParam } = await params;
  const providerId = providerParam.toLowerCase();
  const provider = PROVIDERS[providerId];
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!provider || !code) {
    return NextResponse.redirect(`/polaris/connections?error=invalid_request`);
  }

  // 0. Configuration check
  const clientId = provider.clientId?.trim().replace(/^"|"$/g, "");
  const clientSecret = provider.clientSecret?.trim().replace(/^"|"$/g, "");

  if (!clientId || !clientSecret) {
    console.error(`Missing configuration for provider: ${providerId}`);
    return NextResponse.redirect(`/polaris/connections?error=missing_config`);
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/polaris/api/connections/${providerId}/callback`;

    // 1. Exchange code for token
    const isSimkl = providerId === "simkl";
    const tokenPayload: any = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    if (providerId === "mal") {
      const codeVerifier = (
        process.env.MAL_CODE_CHALLANGE_STRING ||
        "fghnxfu5zer5uze5uzrthzfdhze5yherthd4rtze4g463rtgdzrgzde4h4h"
      ).trim();
      tokenPayload.code_verifier = codeVerifier;
    }

    const headers: Record<string, string> = {
      "Content-Type": isSimkl
        ? "application/json"
        : "application/x-www-form-urlencoded",
      "User-Agent": "Astral-App/1.0",
    };

    // Many providers (MAL, and sometimes AniList) prefer/require Basic Auth
    // Simkl tends to prefer/require JSON and no Basic Auth when using JSON
    if (!isSimkl) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64",
      );
      headers["Authorization"] = `Basic ${basicAuth}`;
    }

    const tokenRes = await fetch(provider.tokenUrl, {
      method: "POST",
      body: isSimkl
        ? JSON.stringify(tokenPayload)
        : new URLSearchParams(tokenPayload),
      headers,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error(
        `Token exchange failed [${providerId}] status ${tokenRes.status}:`,
        errorText,
      );
      throw new Error(`Token exchange failed with status ${tokenRes.status}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    if (!accessToken) {
      console.error(`No access_token returned from ${providerId}`, tokens);
      throw new Error("No access_token returned");
    }
    // 2. Fetch profile info
    const profile = await provider.getProfile(accessToken);

    // 3. Upsert connection in NestJS
    const res = await fetch(`${API_URL}/connections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
        provider: providerId.toUpperCase() as any,
        connectionId: profile.id,
        username: profile.username,
        accessToken,
        refreshToken,
        expiresAt: expiresAt?.toISOString(),
        linkedTo: "AQUILA" as any,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message);
    }

    // Success! Redirect back to settings
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/polaris/connections?success=true`,
    );
  } catch (error) {
    console.error(`OAuth callback error [${providerId}]:`, error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/polaris/connections?error=oauth_failed`,
    );
  }
}
