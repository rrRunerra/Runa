import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";

export default class XiaomiConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.XIAOMI;
  public readonly requiredEnvKeys = ["XIAOMI_CLIENT_ID", "XIAOMI_CLIENT_SECRET"];
  public readonly capabilities = [
    ConnectionCapability.SHOWCASE,
    ConnectionCapability.CALENDAR,
  ];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.XIAOMI_CLIENT_ID || "xiaomi-client-id";
    const redirectUri = `${this.deps.apiUrl}/connections/xiaomi/callback`;
    const url = new URL("https://account.xiaomi.com/oauth2/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "1 3");
    const rawState = redirectUrl ? `${token}:::${redirectUrl}` : token;
    const state = Buffer.from(rawState).toString("base64url");
    url.searchParams.append("state", state);
    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.XIAOMI },
      },
      update: {
        linkedUsername: "Xiaomi Mi Account",
        accessToken: code,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
      create: {
        username,
        provider: ConnectionProvider.XIAOMI,
        linkedUsername: "Xiaomi Mi Account",
        accessToken: code,
        linkedTo: ConnectionLinkedTo.POLARIS,
      },
    });

    return { success: true };
  }
}
