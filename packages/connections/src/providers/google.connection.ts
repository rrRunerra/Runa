import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";

export default class GoogleConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.GOOGLE;
  public readonly requiredEnvKeys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  public readonly capabilities = [
    ConnectionCapability.AUTH,
    ConnectionCapability.SHOWCASE,
    ConnectionCapability.CALENDAR,
  ];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing GOOGLE_CLIENT_ID configuration");
    }
    const redirectUri = `${this.deps.apiUrl}/connections/google/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append(
      "scope",
      "openid email profile https://www.googleapis.com/auth/calendar.readonly"
    );
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    const rawState = redirectUrl ? `${token}:::${redirectUrl}` : token;
    const state = Buffer.from(rawState).toString("base64url");
    url.searchParams.append("state", state);
    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.GOOGLE_CLIENT_ID;
    const clientSecret = this.deps.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Google client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/google/callback`;
    console.log(redirectUri)

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Google Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let linkedUsername = "Google User";
    let connectionId = undefined;
    if (profileRes.ok) {
      const profile = await profileRes.json();
      linkedUsername = profile.email || profile.name || "Google User";
      connectionId = profile.id ? String(profile.id) : undefined;
    }

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.GOOGLE },
      },
      update: {
        linkedUsername,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
      create: {
        username,
        provider: ConnectionProvider.GOOGLE,
        linkedUsername,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
    });

    return { success: true };
  }
}
