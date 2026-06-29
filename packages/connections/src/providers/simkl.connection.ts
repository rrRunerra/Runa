import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";
import { AnimeUpdateData, MovieUpdateData, TvUpdateData } from "../types.js";

export default class SimklConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.SIMKL;

  public readonly requiredEnvKeys = ["SIMKL_CLIENT_ID", "SIMKL_CLIENT_SECRET"];
  public readonly capabilities = [ConnectionCapability.ANIME, ConnectionCapability.MOVIES, ConnectionCapability.TV_SHOWS, ConnectionCapability.SHOWCASE];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing SIMKL_CLIENT_ID environment variable");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/simkl/callback`;
    const url = new URL("https://simkl.com/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    const clientSecret = this.deps.env.SIMKL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Simkl client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/simkl/callback`;

    const tokenPayload = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    const tokenRes = await fetch("https://api.simkl.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Astral-App/1.0",
      },
      body: JSON.stringify(tokenPayload),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Simkl Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://api.simkl.com/users/settings", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "simkl-api-key": clientId,
      },
    });

    if (!profileRes.ok) {
      throw new Error("Simkl Profile fetch failed");
    }

    const profileData = await profileRes.json();
    const connectionId = profileData.account.id.toString();
    const profile = { id: connectionId, username: profileData.user.name };

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.SIMKL },
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
        provider: ConnectionProvider.SIMKL,
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
      where: { username, provider: ConnectionProvider.SIMKL },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No Simkl connection or access token found for user ${username}`);
      return;
    }

    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      console.warn(`Missing SIMKL_CLIENT_ID configuration`);
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.accessToken}`,
      "simkl-api-key": clientId,
      "User-Agent": "Astral-App/1.0",
    };

    // 1. Sync Watchlist Status
    let simklStatus: string | undefined;
    switch (data.status) {
      case "WATCHING":
      case "REPEATING":
        simklStatus = "watching";
        break;
      case "PLANNING":
        simklStatus = "plantowatch";
        break;
      case "COMPLETED":
        simklStatus = "completed";
        break;
      case "PAUSED":
        simklStatus = "hold";
        break;
      case "DROPPED":
        simklStatus = "dropped";
        break;
    }

    if (simklStatus) {
      try {
        const res = await fetch("https://api.simkl.com/sync/add-to-list", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                to: simklStatus,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl status for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl status for ${username}:`, err.message);
      }
    }

    // 2. Sync Ratings/Score
    if (data.score !== undefined && data.score > 0) {
      try {
        const res = await fetch("https://api.simkl.com/sync/ratings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                rating: data.score,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl rating for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl rating for ${username}:`, err.message);
      }
    }

    // 3. Sync Episode History
    if (data.progress !== undefined && data.progress > 0) {
      const episodes = Array.from({ length: data.progress }, (_, i) => ({
        number: i + 1,
      }));

      try {
        const res = await fetch("https://api.simkl.com/sync/history", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                seasons: [
                  {
                    number: 1,
                    episodes,
                  },
                ],
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl history for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl history for ${username}:`, err.message);
      }
    }
  }

  public async updateMovieEntry(
    username: string,
    providerId: number,
    data: MovieUpdateData,
  ): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.SIMKL },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No Simkl connection or access token found for user ${username}`);
      return;
    }

    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      console.warn(`Missing SIMKL_CLIENT_ID configuration`);
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.accessToken}`,
      "simkl-api-key": clientId,
      "User-Agent": "Astral-App/1.0",
    };

    // 1. Sync Watchlist Status
    let simklStatus: string | undefined;
    switch (data.status) {
      case "WATCHING":
        simklStatus = "watching";
        break;
      case "PLANNING":
        simklStatus = "plantowatch";
        break;
      case "COMPLETED":
        simklStatus = "completed";
        break;
      case "PAUSED":
        simklStatus = "hold";
        break;
      case "DROPPED":
        simklStatus = "dropped";
        break;
    }

    if (simklStatus) {
      try {
        const res = await fetch("https://api.simkl.com/sync/add-to-list", {
          method: "POST",
          headers,
          body: JSON.stringify({
            movies: [
              {
                ids: {
                  simkl: providerId,
                },
                to: simklStatus,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl movie status for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl movie status for ${username}:`, err.message);
      }
    }

    // 2. Sync Ratings/Score
    if (data.score !== undefined && data.score > 0) {
      try {
        const res = await fetch("https://api.simkl.com/sync/ratings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            movies: [
              {
                ids: {
                  simkl: providerId,
                },
                rating: data.score,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl movie rating for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl movie rating for ${username}:`, err.message);
      }
    }

    // 3. Sync History (if completed)
    if (data.status === "COMPLETED") {
      try {
        const res = await fetch("https://api.simkl.com/sync/history", {
          method: "POST",
          headers,
          body: JSON.stringify({
            movies: [
              {
                ids: {
                  simkl: providerId,
                },
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl movie history for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl movie history for ${username}:`, err.message);
      }
    }
  }

  public async updateTvEntry(
    username: string,
    providerId: number,
    data: TvUpdateData,
  ): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.SIMKL },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No Simkl connection or access token found for user ${username}`);
      return;
    }

    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      console.warn(`Missing SIMKL_CLIENT_ID configuration`);
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.accessToken}`,
      "simkl-api-key": clientId,
      "User-Agent": "Astral-App/1.0",
    };

    // 1. Sync Watchlist Status
    let simklStatus: string | undefined;
    switch (data.status) {
      case "WATCHING":
        simklStatus = "watching";
        break;
      case "PLANNING":
        simklStatus = "plantowatch";
        break;
      case "COMPLETED":
        simklStatus = "completed";
        break;
      case "PAUSED":
        simklStatus = "hold";
        break;
      case "DROPPED":
        simklStatus = "dropped";
        break;
    }

    if (simklStatus) {
      try {
        const res = await fetch("https://api.simkl.com/sync/add-to-list", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                to: simklStatus,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl TV status for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl TV status for ${username}:`, err.message);
      }
    }

    // 2. Sync Ratings/Score
    if (data.score !== undefined && data.score > 0) {
      try {
        const res = await fetch("https://api.simkl.com/sync/ratings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                rating: data.score,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl TV rating for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl TV rating for ${username}:`, err.message);
      }
    }

    // 3. Sync Episode History
    if (data.watchedEpisodes && data.watchedEpisodes.length > 0) {
      const seasonGroups: Record<number, number[]> = {};
      for (const ep of data.watchedEpisodes) {
        if (!seasonGroups[ep.seasonNum]) {
          seasonGroups[ep.seasonNum] = [];
        }
        seasonGroups[ep.seasonNum].push(ep.episodeNum);
      }

      const seasons = Object.entries(seasonGroups).map(([seasonNum, episodeNums]) => ({
        number: Number(seasonNum),
        episodes: episodeNums.map((num) => ({ number: num })),
      }));

      try {
        const res = await fetch("https://api.simkl.com/sync/history", {
          method: "POST",
          headers,
          body: JSON.stringify({
            shows: [
              {
                ids: {
                  simkl: providerId,
                },
                seasons,
              },
            ],
          }),
        });
        if (!res.ok) {
          console.error(`Failed to update Simkl TV history for ${username}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to update Simkl TV history for ${username}:`, err.message);
      }
    }
  }

  private async deleteFromSimkl(username: string, type: "shows" | "movies", providerId: number): Promise<void> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.SIMKL },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No Simkl connection or access token found for user ${username}`);
      return;
    }

    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      console.warn(`Missing SIMKL_CLIENT_ID configuration`);
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.accessToken}`,
      "simkl-api-key": clientId,
      "User-Agent": "Astral-App/1.0",
    };

    const payload = {
      [type]: [
        {
          ids: {
            simkl: providerId,
          },
        },
      ],
    };

    // 1. Remove from history/watchlist
    try {
      const res = await fetch("https://api.simkl.com/sync/history/remove", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Failed to remove Simkl ${type} history for ${username}: ${res.statusText}`);
      }
    } catch (err: any) {
      console.error(`Failed to remove Simkl ${type} history for ${username}:`, err.message);
    }

    // 2. Remove ratings
    try {
      const res = await fetch("https://api.simkl.com/sync/ratings/remove", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Failed to remove Simkl ${type} ratings for ${username}: ${res.statusText}`);
      }
    } catch (err: any) {
      console.error(`Failed to remove Simkl ${type} ratings for ${username}:`, err.message);
    }
  }

  public async deleteAnimeEntry(username: string, providerId: number): Promise<void> {
    return this.deleteFromSimkl(username, "shows", providerId);
  }

  public async deleteTvEntry(username: string, providerId: number): Promise<void> {
    return this.deleteFromSimkl(username, "shows", providerId);
  }

  public async deleteMovieEntry(username: string, providerId: number): Promise<void> {
    return this.deleteFromSimkl(username, "movies", providerId);
  }

  public async fetchUserList(username: string): Promise<any[]> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.SIMKL },
      select: { accessToken: true },
    });
    if (!conn || !conn.accessToken) {
      throw new Error(`No active Simkl connection for user ${username}`);
    }

    const clientId = this.deps.env.SIMKL_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing SIMKL_CLIENT_ID configuration");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.accessToken}`,
      "simkl-api-key": clientId,
      "User-Agent": "Astral-App/1.0",
    };

    const types = ["anime", "tv", "movies"];
    const statuses = ["watching", "plantowatch", "completed", "dropped", "onhold"];

    const items: any[] = [];

    for (const type of types) {
      for (const status of statuses) {
        try {
          const res = await fetch(`https://api.simkl.com/sync/all-items/${type}/${status}?extended=full`, {
            headers,
          });
          if (!res.ok) {
            console.error(`Failed to fetch Simkl items for ${type}/${status}: ${res.statusText}`);
            continue;
          }
          const data = await res.json();
          const list = Array.isArray(data)
            ? data
            : (data.anime || data.shows || data.movies || []);

          for (const entry of list) {
            const mediaItem = entry.anime || entry.show || entry.movie;
            if (!mediaItem) continue;

            const title = mediaItem.title;
            const ids = mediaItem.ids || {};

            let mappedStatus = "PLANNING";
            if (status === "watching") mappedStatus = "WATCHING";
            else if (status === "plantowatch") mappedStatus = "PLANNING";
            else if (status === "completed") mappedStatus = "COMPLETED";
            else if (status === "onhold") mappedStatus = "ON_HOLD";
            else if (status === "dropped") mappedStatus = "DROPPED";

            const progress = entry.watched_episodes_count || 0;
            const score = entry.user_rating || 0;
            const notes = entry.memo || "";

            if (type === "anime") {
              const anilistId = ids.anilist ? Number(ids.anilist) : undefined;
              const malId = ids.mal ? Number(ids.mal) : undefined;
              const simklId = ids.simkl ? Number(ids.simkl) : undefined;

              if (anilistId || malId) {
                items.push({
                  mediaType: "anime",
                  anilistId,
                  malId,
                  simklId,
                  title: {
                    romaji: title,
                    english: title,
                    native: title,
                  },
                  coverImage: mediaItem.poster ? `https://simkl.in/posters/${mediaItem.poster}_m.jpg` : undefined,
                  status: mappedStatus,
                  progress,
                  score,
                  notes,
                });
              }
            } else if (type === "tv") {
              let tvdbId = ids.tvdb ? Number(ids.tvdb) : undefined;
              const simklId = ids.simkl ? Number(ids.simkl) : undefined;
              if (!tvdbId && title) {
                const existing = await this.deps.prisma.client.tv.findFirst({
                  where: {
                    OR: [
                      { titleRomaji: { equals: title, mode: "insensitive" } },
                      { titleEnglish: { equals: title, mode: "insensitive" } },
                    ],
                  },
                  select: { tvdbId: true },
                });
                if (existing) {
                  tvdbId = existing.tvdbId;
                }
              }

              const watchedEpisodes: { seasonNum: number; episodeNum: number }[] = [];
              if (entry.seasons && Array.isArray(entry.seasons)) {
                for (const s of entry.seasons) {
                  const seasonNum = s.number;
                  if (s.episodes && Array.isArray(s.episodes)) {
                    for (const ep of s.episodes) {
                      watchedEpisodes.push({
                        seasonNum,
                        episodeNum: ep.number,
                      });
                    }
                  }
                }
              }

              if (tvdbId) {
                items.push({
                  mediaType: "tv",
                  tvdbId,
                  simklId,
                  title,
                  coverImage: mediaItem.poster ? `https://simkl.in/posters/${mediaItem.poster}_m.jpg` : undefined,
                  status: mappedStatus,
                  progress,
                  score,
                  notes,
                  watchedEpisodes,
                });
              }
            } else if (type === "movies") {
              let tvdbId = ids.tvdb ? Number(ids.tvdb) : undefined;
              const simklId = ids.simkl ? Number(ids.simkl) : undefined;
              if (!tvdbId && title) {
                const existing = await this.deps.prisma.client.movie.findFirst({
                  where: {
                    OR: [
                      { titleRomaji: { equals: title, mode: "insensitive" } },
                      { titleEnglish: { equals: title, mode: "insensitive" } },
                    ],
                  },
                  select: { tvdbId: true },
                });
                if (existing) {
                  tvdbId = existing.tvdbId;
                }
              }

              if (tvdbId) {
                items.push({
                  mediaType: "movie",
                  tvdbId,
                  simklId,
                  title,
                  coverImage: mediaItem.poster ? `https://simkl.in/posters/${mediaItem.poster}_m.jpg` : undefined,
                  status: mappedStatus,
                  progress: mappedStatus === "COMPLETED" ? 1 : 0,
                  score,
                  notes,
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`Error fetching Simkl items for ${type}/${status}:`, err.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return items;
  }
}
