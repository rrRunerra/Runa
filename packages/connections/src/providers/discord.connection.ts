import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";

export default class DiscordConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.DISCORD;

  public readonly requiredEnvKeys = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"];
  public readonly capabilities = [ConnectionCapability.AUTH, ConnectionCapability.SHOWCASE];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing DISCORD_CLIENT_ID environment variable");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/discord/callback`;
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "identify");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.DISCORD_CLIENT_ID;
    const clientSecret = this.deps.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Discord client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/discord/callback`;

    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Astral-App/1.0",
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
      throw new Error(`Discord Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Astral-App/1.0",
      },
    });

    if (!profileRes.ok) {
      throw new Error("Discord Profile fetch failed");
    }

    const profileData = await profileRes.json();
    const profile = { id: String(profileData.id), username: profileData.username };

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.DISCORD },
      },
      update: {
        linkedUsername: profile.username,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId: profile.id,
        linkedTo: ConnectionLinkedTo.LYNX,
      },
      create: {
        username,
        provider: ConnectionProvider.DISCORD,
        linkedUsername: profile.username,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId: profile.id,
        linkedTo: ConnectionLinkedTo.LYNX,
      },
    });

    return { success: true };
  }
}
