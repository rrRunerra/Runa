import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { AnimeUpdateData, MangaUpdateData } from "../types.js";
import { ConnectionCapability } from "../metadata.js";

function parseMalDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

export default class MalConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.MAL;

  public readonly requiredEnvKeys = ["MAL_CLIENT_ID", "MAL_CLIENT_SECRET"];
  public readonly capabilities = [ConnectionCapability.ANIME, ConnectionCapability.MANGA, ConnectionCapability.SHOWCASE];

  private getCodeVerifier(): string {
    return (
      this.deps.env.MAL_CODE_CHALLANGE_STRING ||
      "fghnxfu5zer5uze5uzrthzfdhze5yherthd4rtze4g463rtgdzrgzde4h4h"
    ).trim();
  }

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.MAL_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing MAL_CLIENT_ID environment variable");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/mal/callback`;
    const url = new URL("https://myanimelist.net/v1/oauth2/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    url.searchParams.append("code_challenge", this.getCodeVerifier());
    url.searchParams.append("code_challenge_method", "plain");

    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.MAL_CLIENT_ID;
    const clientSecret = this.deps.env.MAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing MyAnimeList client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/mal/callback`;

    const tokenPayload = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: this.getCodeVerifier(),
    };

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      body: new URLSearchParams(tokenPayload),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Astral-App/1.0",
        "Authorization": `Basic ${basicAuth}`,
      },
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`MAL Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://api.myanimelist.net/v2/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      throw new Error("MAL Profile fetch failed");
    }

    const profileData = await profileRes.json();
    const profile = { id: String(profileData.id), username: profileData.name };

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.MAL },
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
        provider: ConnectionProvider.MAL,
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

  private async getOrRefreshToken(
    username: string,
    conn: { id: string; accessToken: string | null; refreshToken: string | null; expiresAt: Date | null },
  ): Promise<string> {
    if (!conn.accessToken) {
      throw new Error(`No access token for user ${username}`);
    }

    if (conn.expiresAt && Date.now() > conn.expiresAt.getTime() && conn.refreshToken) {
      const clientId = this.deps.env.MAL_CLIENT_ID || "";
      const clientSecret = this.deps.env.MAL_CLIENT_SECRET || "";
      const refreshRes = await fetch("https://myanimelist.net/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: conn.refreshToken,
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.access_token;
        const newRefreshToken = refreshData.refresh_token;
        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
        await this.deps.prisma.client.connections.update({
          where: { id: conn.id },
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresAt: newExpiresAt,
          },
        });
        console.log(`MAL token refreshed for user ${username}`);
        return newAccessToken;
      } else {
        console.error(`Failed to refresh MAL token for user ${username}`);
      }
    }
    return conn.accessToken;
  }

  public async updateAnimeEntry(
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      console.error("MAL ID is invalid");
      return;
    }

    const malConnection = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.MAL },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!malConnection) {
      console.warn(`No MAL connection found for user ${username}`);
      return;
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshToken(username, malConnection);
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    let malStatusMapped: string | undefined = undefined;
    switch (data.status) {
      case "WATCHING":
        malStatusMapped = "watching";
        break;
      case "COMPLETED":
        malStatusMapped = "completed";
        break;
      case "PAUSED":
        malStatusMapped = "on_hold";
        break;
      case "DROPPED":
        malStatusMapped = "dropped";
        break;
      case "PLANNING":
        malStatusMapped = "plan_to_watch";
        break;
      case "REPEATING":
        malStatusMapped = "watching";
        break;
    }

    const malData = new URLSearchParams();
    if (malStatusMapped) malData.append("status", malStatusMapped);
    if (data.score !== undefined) {
      malData.append("score", Math.round(data.score).toString());
    }
    if (data.progress !== undefined) {
      malData.append("num_watched_episodes", data.progress.toString());
    }
    if (data.status === "REPEATING") {
      malData.append("is_rewatching", "true");
    }
    if (data.rewatched !== undefined) {
      malData.append("num_times_rewatched", data.rewatched.toString());
    }
    if (data.notes !== undefined) {
      malData.append("comments", data.notes);
    }

    const parseDateStr = (ts?: number) => {
      if (!ts) return undefined;
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    if (data.startDate) {
      const startString = parseDateStr(data.startDate);
      if (startString) malData.append("start_date", startString);
    }
    if (data.endDate) {
      const endString = parseDateStr(data.endDate);
      if (endString) malData.append("finish_date", endString);
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/anime/${providerId}/my_list_status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: malData,
      },
    );

    if (!res.ok) {
      console.error(`Failed to update MAL connection for user ${username}`);
    } else {
      console.log(`MAL connection updated for user ${username}`);
    }
  }

  public async updateMangaEntry(
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      console.error("MAL manga ID is invalid");
      return;
    }

    const malConnection = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.MAL },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!malConnection) {
      console.warn(`No MAL connection found for user ${username}`);
      return;
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshToken(username, malConnection);
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    let malStatusMapped: string | undefined = undefined;
    switch (data.status) {
      case "READING":
        malStatusMapped = "reading";
        break;
      case "COMPLETED":
        malStatusMapped = "completed";
        break;
      case "ON_HOLD":
        malStatusMapped = "on_hold";
        break;
      case "DROPPED":
        malStatusMapped = "dropped";
        break;
      case "PLANNING":
        malStatusMapped = "plan_to_read";
        break;
    }

    const malData = new URLSearchParams();
    if (malStatusMapped) malData.append("status", malStatusMapped);
    if (data.score !== undefined) {
      malData.append("score", Math.round(data.score).toString());
    }
    if (data.chapters !== undefined) {
      malData.append("num_chapters_read", data.chapters.toString());
    }
    if (data.volumes !== undefined) {
      malData.append("num_volumes_read", data.volumes.toString());
    }
    if (data.reread !== undefined) {
      malData.append("num_times_reread", data.reread.toString());
    }
    if (data.notes !== undefined) {
      malData.append("comments", data.notes);
    }

    const parseDateStr = (ts?: number) => {
      if (!ts) return undefined;
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    if (data.startDate) {
      const startString = parseDateStr(data.startDate);
      if (startString) malData.append("start_date", startString);
    }
    if (data.endDate) {
      const endString = parseDateStr(data.endDate);
      if (endString) malData.append("finish_date", endString);
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/manga/${providerId}/my_list_status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: malData,
      },
    );

    if (!res.ok) {
      console.error(`Failed to update MAL manga connection for user ${username}`);
    } else {
      console.log(`MAL manga connection updated for user ${username}`);
    }
  }

  public async deleteAnimeEntry(username: string, providerId: number): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      console.error("MAL ID is invalid");
      return;
    }

    const malConnection = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.MAL },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!malConnection) {
      console.warn(`No MAL connection found for user ${username}`);
      return;
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshToken(username, malConnection);
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/anime/${providerId}/my_list_status`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      console.error(`Failed to delete MAL anime connection for user ${username}`);
    } else {
      console.log(`MAL anime connection deleted for user ${username}`);
    }
  }

  public async deleteMangaEntry(username: string, providerId: number): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      console.error("MAL manga ID is invalid");
      return;
    }

    const malConnection = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.MAL },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!malConnection) {
      console.warn(`No MAL connection found for user ${username}`);
      return;
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshToken(username, malConnection);
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/manga/${providerId}/my_list_status`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      console.error(`Failed to delete MAL manga connection for user ${username}`);
    } else {
      console.log(`MAL manga connection deleted for user ${username}`);
    }
  }

  private async resolveAnilistIds(malIds: number[], type: "ANIME" | "MANGA"): Promise<Record<number, number>> {
    const malToAnilistMap: Record<number, number> = {};
    const batchSize = 40;
    for (let i = 0; i < malIds.length; i += batchSize) {
      const batch = malIds.slice(i, i + batchSize);
      try {
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              query ($idMal: [Int], $type: MediaType) {
                Page(page: 1, perPage: 50) {
                  media(idMal_in: $idMal, type: $type) {
                    id
                    idMal
                  }
                }
              }
            `,
            variables: {
              idMal: batch,
              type,
            },
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const mediaList = json?.data?.Page?.media || [];
          for (const media of mediaList) {
            if (media.id && media.idMal) {
              malToAnilistMap[media.idMal] = media.id;
            }
          }
        } else {
          console.error(`Failed to resolve AniList IDs batch: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Error resolving AniList IDs batch:`, err.message);
      }
      if (i + batchSize < malIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    return malToAnilistMap;
  }

  public async fetchUserList(username: string): Promise<any[]> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.MAL },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!conn) {
      throw new Error(`No MAL connection found for user ${username}`);
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshToken(username, conn);
    } catch (err: any) {
      throw new Error(`Failed to refresh MAL token: ${err.message}`);
    }

    const fetchAllPages = async (initialUrl: string) => {
      let nextUrl: string | null = initialUrl;
      const entries: any[] = [];
      while (nextUrl) {
        const res: any = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch MAL list from ${nextUrl}: ${res.statusText}`);
        }
        const json: any = await res.json();
        if (json.data) {
          entries.push(...json.data);
        }
        nextUrl = json.paging?.next || null;
      }
      return entries;
    };

    const [animeEntries, mangaEntries] = await Promise.all([
      fetchAllPages("https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status{status,score,num_episodes_watched,comments,start_date,finish_date},alternative_titles,num_episodes,main_picture&limit=1000"),
      fetchAllPages("https://api.myanimelist.net/v2/users/@me/mangalist?fields=list_status{status,score,num_chapters_read,num_volumes_read,comments,start_date,finish_date},alternative_titles,num_chapters,num_volumes,main_picture&limit=1000"),
    ]);

    const animeMalIds = animeEntries.map((e) => e.node.id);
    const mangaMalIds = mangaEntries.map((e) => e.node.id);

    const [animeAnilistMap, mangaAnilistMap] = await Promise.all([
      this.resolveAnilistIds(animeMalIds, "ANIME"),
      this.resolveAnilistIds(mangaMalIds, "MANGA"),
    ]);

    const items: any[] = [];

    // Map Anime entries
    for (const entry of animeEntries) {
      const malId = entry.node.id;
      const anilistId = animeAnilistMap[malId] || null;

      let status = "PLANNING";
      const malStatus = entry.list_status?.status;
      if (malStatus === "watching") status = "WATCHING";
      else if (malStatus === "completed") status = "COMPLETED";
      else if (malStatus === "on_hold") status = "ON_HOLD";
      else if (malStatus === "dropped") status = "DROPPED";

      items.push({
        mediaType: "anime",
        anilistId,
        malId,
        title: {
          romaji: entry.node.title,
          english: entry.node.alternative_titles?.en || entry.node.title,
          native: entry.node.alternative_titles?.ja || entry.node.title,
        },
        coverImage: entry.node.main_picture?.large || entry.node.main_picture?.medium,
        episodes: entry.node.num_episodes,
        status,
        progress: entry.list_status?.num_episodes_watched || 0,
        score: entry.list_status?.score || 0,
        notes: entry.list_status?.comments || "",
        startDate: parseMalDate(entry.list_status?.start_date),
        endDate: parseMalDate(entry.list_status?.finish_date),
      });
    }

    // Map Manga entries
    for (const entry of mangaEntries) {
      const malId = entry.node.id;
      const anilistId = mangaAnilistMap[malId] || null;

      let status = "PLANNING";
      const malStatus = entry.list_status?.status;
      if (malStatus === "reading") status = "READING";
      else if (malStatus === "completed") status = "COMPLETED";
      else if (malStatus === "on_hold") status = "ON_HOLD";
      else if (malStatus === "dropped") status = "DROPPED";

      items.push({
        mediaType: "manga",
        anilistId,
        malId,
        title: {
          romaji: entry.node.title,
          english: entry.node.alternative_titles?.en || entry.node.title,
          native: entry.node.alternative_titles?.ja || entry.node.title,
        },
        coverImage: entry.node.main_picture?.large || entry.node.main_picture?.medium,
        chapters: entry.node.num_chapters,
        volumes: entry.node.num_volumes,
        status,
        progress: entry.list_status?.num_chapters_read || 0,
        volumesProgress: entry.list_status?.num_volumes_read || 0,
        score: entry.list_status?.score || 0,
        notes: entry.list_status?.comments || "",
        startDate: parseMalDate(entry.list_status?.start_date),
        endDate: parseMalDate(entry.list_status?.finish_date),
      });
    }

    return items;
  }
}
