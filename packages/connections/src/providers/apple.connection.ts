import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";

export default class AppleConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.APPLE;
  public readonly requiredEnvKeys = ["APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"];
  public readonly capabilities = [
    ConnectionCapability.AUTH,
    ConnectionCapability.SHOWCASE,
    ConnectionCapability.CALENDAR,
  ];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.APPLE_CLIENT_ID || "apple-client-id";
    const redirectUri = `${this.deps.apiUrl}/connections/apple/callback`;
    const url = new URL("https://appleid.apple.com/auth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("response_mode", "form_post");
    url.searchParams.append("scope", "name email");
    const rawState = redirectUrl ? `${token}:::${redirectUrl}` : token;
    const state = Buffer.from(rawState).toString("base64url");
    url.searchParams.append("state", state);
    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.APPLE },
      },
      update: {
        linkedUsername: "Apple iCloud",
        accessToken: code,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
      create: {
        username,
        provider: ConnectionProvider.APPLE,
        linkedUsername: "Apple iCloud",
        accessToken: code,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
    });

    return { success: true };
  }
}
