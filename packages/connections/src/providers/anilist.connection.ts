import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { AnimeUpdateData, MangaUpdateData } from "../types.js";
import { ConnectionCapability } from "../metadata.js";

export default class AnilistConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.ANILIST;
  
  public readonly requiredEnvKeys = ["ANILIST_CLIENT_ID", "ANILIST_CLIENT_SECRET"];
  public readonly capabilities = [ConnectionCapability.ANIME, ConnectionCapability.MANGA, ConnectionCapability.SHOWCASE];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.ANILIST_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing ANILIST_CLIENT_ID environment variable");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/anilist/callback`;
    const url = new URL("https://anilist.co/api/v2/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.ANILIST_CLIENT_ID;
    const clientSecret = this.deps.env.ANILIST_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing AniList client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/anilist/callback`;

    const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Astral-App/1.0",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`AniList Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ Viewer { id name } }",
      }),
    });

    if (!profileRes.ok) {
      throw new Error("AniList Profile fetch failed");
    }

    const { data } = await profileRes.json();
    const profile = { id: String(data.Viewer.id), username: data.Viewer.name };

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.ANILIST },
      },
      update: {
        linkedUsername: profile.username,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId: profile.id,
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
      create: {
        username,
        provider: ConnectionProvider.ANILIST,
        linkedUsername: profile.username,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId: profile.id,
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
    });

    return { success: true };
  }

  public async updateAnimeEntry(
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.ANILIST },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No AniList connection or access token found for user ${username}`);
      return;
    }

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.accessToken}`,
      },
      body: JSON.stringify({
        query: `
          mutation (
            $mediaId: Int!
            $status: MediaListStatus
            $progress: Int
            $score: Float
            $startedAt: FuzzyDateInput
            $completedAt: FuzzyDateInput
            $notes: String
            $repeat: Int
          ) {
            SaveMediaListEntry(
              mediaId: $mediaId
              status: $status
              progress: $progress
              score: $score
              startedAt: $startedAt
              completedAt: $completedAt
              notes: $notes
              repeat: $repeat
            ) {
              id
              status
            }
          }
        `,
        variables: {
          mediaId: providerId,
          status: data.status === "WATCHING" ? "CURRENT" : data.status,
          progress: data.progress,
          score: data.score,
          startedAt: data.startDate
            ? {
                year: new Date(data.startDate * 1000).getFullYear(),
                month: new Date(data.startDate * 1000).getMonth() + 1,
                day: new Date(data.startDate * 1000).getDate(),
              }
            : undefined,
          completedAt: data.endDate
            ? {
                year: new Date(data.endDate * 1000).getFullYear(),
                month: new Date(data.endDate * 1000).getMonth() + 1,
                day: new Date(data.endDate * 1000).getDate(),
              }
            : undefined,
          notes: data.notes,
          repeat: data.rewatched,
        },
      }),
    });

    if (!res.ok) {
      console.error(`Failed to update AniList connection for user ${username}`);
      return;
    }

    const resData = await res.json();
    if (resData.errors) {
      console.error(`Failed to update AniList connection for user ${username}: ${JSON.stringify(resData.errors)}`);
      return;
    }

    console.log(`AniList connection updated for user ${username}`);
  }

  public async updateMangaEntry(
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.ANILIST },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No AniList connection or access token found for user ${username}`);
      return;
    }

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.accessToken}`,
      },
      body: JSON.stringify({
        query: `
          mutation (
            $mediaId: Int!
            $status: MediaListStatus
            $progress: Int
            $progressVolumes: Int
            $score: Float
            $startedAt: FuzzyDateInput
            $completedAt: FuzzyDateInput
            $notes: String
            $repeat: Int
          ) {
            SaveMediaListEntry(
              mediaId: $mediaId
              status: $status
              progress: $progress
              progressVolumes: $progressVolumes
              score: $score
              startedAt: $startedAt
              completedAt: $completedAt
              notes: $notes
              repeat: $repeat
            ) {
              id
            }
          }
        `,
        variables: {
          mediaId: providerId,
          status: data.status === "READING" ? "CURRENT" : data.status,
          progress: data.chapters,
          progressVolumes: data.volumes,
          score: data.score,
          startedAt: data.startDate
            ? {
                year: new Date(data.startDate * 1000).getFullYear(),
                month: new Date(data.startDate * 1000).getMonth() + 1,
                day: new Date(data.startDate * 1000).getDate(),
              }
            : undefined,
          completedAt: data.endDate
            ? {
                year: new Date(data.endDate * 1000).getFullYear(),
                month: new Date(data.endDate * 1000).getMonth() + 1,
                day: new Date(data.endDate * 1000).getDate(),
              }
            : undefined,
          notes: data.notes,
          repeat: data.reread,
        },
      }),
    });

    if (!res.ok) {
      console.error(`Failed to update AniList manga connection for user ${username}`);
      return;
    }

    const resData = await res.json();
    if (resData.errors) {
      console.error(`Failed to update AniList manga connection for user ${username}: ${JSON.stringify(resData.errors)}`);
      return;
    }

    console.log(`AniList manga connection updated for user ${username}`);
  }

  private async deleteAnilistEntry(username: string, providerId: number): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.ANILIST },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No AniList connection or access token found for user ${username}`);
      return;
    }

    // 1. Query for the list entry ID
    let listEntryId: number | undefined;
    try {
      const queryRes = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${conn.accessToken}`,
        },
        body: JSON.stringify({
          query: `
            query ($mediaId: Int!) {
              MediaList (mediaId: $mediaId) {
                id
              }
            }
          `,
          variables: {
            mediaId: providerId,
          },
        }),
      });

      if (queryRes.ok) {
        const queryData = await queryRes.json();
        listEntryId = queryData.data?.MediaList?.id;
      }
    } catch (err: any) {
      console.error(`Failed to query AniList entry ID for ${username}:`, err.message);
    }

    if (!listEntryId) {
      console.warn(`AniList entry not found for media ID ${providerId}`);
      return;
    }

    // 2. Delete the list entry
    try {
      const deleteRes = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${conn.accessToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation ($id: Int!) {
              DeleteMediaListEntry (id: $id) {
                deleted
              }
            }
          `,
          variables: {
            id: listEntryId,
          },
        }),
      });

      if (!deleteRes.ok) {
        console.error(`Failed to delete AniList entry for user ${username}`);
      } else {
        console.log(`AniList entry deleted for user ${username}`);
      }
    } catch (err: any) {
      console.error(`Failed to delete AniList entry for ${username}:`, err.message);
    }
  }

  public async deleteAnimeEntry(username: string, providerId: number): Promise<void> {
    return this.deleteAnilistEntry(username, providerId);
  }

  public async deleteMangaEntry(username: string, providerId: number): Promise<void> {
    return this.deleteAnilistEntry(username, providerId);
  }
}
