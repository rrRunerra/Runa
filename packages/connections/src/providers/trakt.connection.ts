import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";
import { AnimeUpdateData, MovieUpdateData, TvUpdateData } from "../types.js";

export default class TraktConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.TRAKT;
  public readonly requiredEnvKeys = ["TRAKT_CLIENT_ID", "TRAKT_CLIENT_SECRET"];
  public readonly capabilities = [
    ConnectionCapability.ANIME,
    ConnectionCapability.MOVIES,
    ConnectionCapability.TV_SHOWS,
    ConnectionCapability.SHOWCASE,
  ];

  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.TRAKT_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing TRAKT_CLIENT_ID environment variable");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/trakt/callback`;
    const url = new URL("https://trakt.tv/oauth/authorize");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    return url.toString();
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    const clientId = this.deps.env.TRAKT_CLIENT_ID;
    const clientSecret = this.deps.env.TRAKT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Trakt client ID or secret configuration");
    }

    const redirectUri = `${this.deps.apiUrl}/connections/trakt/callback`;

    const tokenRes = await fetch("https://api.trakt.tv/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Runa/1.0",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Trakt token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const profileRes = await fetch("https://api.trakt.tv/users/settings", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Runa/1.0",
      },
    });

    if (!profileRes.ok) {
      throw new Error("Trakt profile fetch failed");
    }

    const profileData = await profileRes.json();
    const linkedUsername = profileData.user.username;
    const connectionId = profileData.user.ids.slug || linkedUsername;

    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider: ConnectionProvider.TRAKT },
      },
      update: {
        linkedUsername,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId,
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
      create: {
        username,
        provider: ConnectionProvider.TRAKT,
        linkedUsername,
        accessToken,
        refreshToken,
        expiresAt,
        connectionId,
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
    });

    return { success: true };
  }

  private async getHeaders(username: string): Promise<Record<string, string> | null> {
    const conn = await this.deps.prisma.client.connections.findFirst({
      where: { username, provider: ConnectionProvider.TRAKT },
      select: { accessToken: true },
    });

    if (!conn || !conn.accessToken) {
      console.warn(`No Trakt connection or access token found for user ${username}`);
      return null;
    }

    const clientId = this.deps.env.TRAKT_CLIENT_ID;
    if (!clientId) {
      console.warn("Missing TRAKT_CLIENT_ID configuration");
      return null;
    }

    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${conn.accessToken}`,
      "trakt-api-version": "2",
      "trakt-api-key": clientId,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Runa/1.0",
    };
  }

  public async updateAnimeEntry(username: string, providerId: number, data: AnimeUpdateData): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;

    // 1. Sync Watchlist/History Status
    if (data.status === "PLANNING") {
      await this.addToWatchlist(headers, "shows", providerId);
      await this.removeFromHistory(headers, "shows", providerId);
    } else {
      await this.removeFromWatchlist(headers, "shows", providerId);

      if (data.status === "COMPLETED") {
        await this.addToHistory(headers, "shows", providerId);
      } else if (data.status === "WATCHING" && data.progress !== undefined && data.progress > 0) {
        // Sync progress episodes for season 1
        const episodes = Array.from({ length: data.progress }, (_, i) => ({
          number: i + 1,
        }));
        await this.syncShowEpisodesHistory(headers, providerId, [{ number: 1, episodes }]);
      }
    }

    // 2. Sync Rating
    if (data.score !== undefined && data.score > 0) {
      await this.setRating(headers, "shows", providerId, data.score);
    }
  }

  public async updateMovieEntry(username: string, providerId: number, data: MovieUpdateData): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;

    if (data.status === "PLANNING") {
      await this.addToWatchlist(headers, "movies", providerId);
      await this.removeFromHistory(headers, "movies", providerId);
    } else {
      await this.removeFromWatchlist(headers, "movies", providerId);

      if (data.status === "COMPLETED") {
        await this.addToHistory(headers, "movies", providerId);
      }
    }

    if (data.score !== undefined && data.score > 0) {
      await this.setRating(headers, "movies", providerId, data.score);
    }
  }

  public async updateTvEntry(username: string, providerId: number, data: TvUpdateData): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;

    if (data.status === "PLANNING") {
      await this.addToWatchlist(headers, "shows", providerId);
      await this.removeFromHistory(headers, "shows", providerId);
    } else {
      await this.removeFromWatchlist(headers, "shows", providerId);

      if (data.status === "COMPLETED") {
        await this.addToHistory(headers, "shows", providerId);
      } else if (data.watchedEpisodes && data.watchedEpisodes.length > 0) {
        const seasonsMap = new Map<number, number[]>();
        for (const ep of data.watchedEpisodes) {
          if (!seasonsMap.has(ep.seasonNum)) {
            seasonsMap.set(ep.seasonNum, []);
          }
          seasonsMap.get(ep.seasonNum)!.push(ep.episodeNum);
        }

        const seasons = Array.from(seasonsMap.entries()).map(([seasonNum, episodeNums]) => ({
          number: seasonNum,
          episodes: episodeNums.map((epNum) => ({ number: epNum })),
        }));

        await this.syncShowEpisodesHistory(headers, providerId, seasons);
      }
    }

    if (data.score !== undefined && data.score > 0) {
      await this.setRating(headers, "shows", providerId, data.score);
    }
  }

  public async deleteAnimeEntry(username: string, providerId: number): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;
    await this.removeFromHistory(headers, "shows", providerId);
    await this.removeFromWatchlist(headers, "shows", providerId);
    await this.removeRating(headers, "shows", providerId);
  }

  public async deleteMovieEntry(username: string, providerId: number): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;
    await this.removeFromHistory(headers, "movies", providerId);
    await this.removeFromWatchlist(headers, "movies", providerId);
    await this.removeRating(headers, "movies", providerId);
  }

  public async deleteTvEntry(username: string, providerId: number): Promise<void> {
    const headers = await this.getHeaders(username);
    if (!headers) return;
    await this.removeFromHistory(headers, "shows", providerId);
    await this.removeFromWatchlist(headers, "shows", providerId);
    await this.removeRating(headers, "shows", providerId);
  }

  public async fetchUserList(username: string): Promise<any[]> {
    const headers = await this.getHeaders(username);
    if (!headers) return [];

    const items: any[] = [];

    try {
      // 1. Fetch Watchlist
      const watchlistRes = await fetch("https://api.trakt.tv/sync/watchlist?extended=full", { headers });
      if (watchlistRes.ok) {
        const watchlist = await watchlistRes.json();
        for (const item of watchlist) {
          const type = item.type; // "movie" or "show"
          const media = item.movie || item.show;
          if (!media) continue;

          const isAnime = this.checkIsAnime(media);
          const mappedType = isAnime ? "anime" : type === "show" ? "tv" : "movie";

          items.push({
            mediaType: mappedType,
            title: media.title,
            status: "PLANNING",
            progress: 0,
            score: 0,
            tvdbId: media.ids?.tvdb ? Number(media.ids.tvdb) : undefined,
            tmdbId: media.ids?.tmdb ? Number(media.ids.tmdb) : undefined,
            imdbId: media.ids?.imdb || undefined,
            traktId: media.ids?.trakt ? Number(media.ids.trakt) : undefined,
          });
        }
      }

      // 2. Fetch Watched Movies
      const watchedMoviesRes = await fetch("https://api.trakt.tv/sync/watched/movies?extended=full", { headers });
      if (watchedMoviesRes.ok) {
        const watchedMovies = await watchedMoviesRes.json();
        for (const item of watchedMovies) {
          const media = item.movie;
          if (!media) continue;

          const isAnime = this.checkIsAnime(media);
          const mappedType = isAnime ? "anime" : "movie";

          items.push({
            mediaType: mappedType,
            title: media.title,
            status: "COMPLETED",
            progress: 0,
            score: 0,
            tvdbId: media.ids?.tvdb ? Number(media.ids.tvdb) : undefined,
            tmdbId: media.ids?.tmdb ? Number(media.ids.tmdb) : undefined,
            imdbId: media.ids?.imdb || undefined,
            traktId: media.ids?.trakt ? Number(media.ids.trakt) : undefined,
          });
        }
      }

      // 3. Fetch Watched Shows
      const watchedShowsRes = await fetch("https://api.trakt.tv/sync/watched/shows?extended=full", { headers });
      if (watchedShowsRes.ok) {
        const watchedShows = await watchedShowsRes.json();
        for (const item of watchedShows) {
          const media = item.show;
          if (!media) continue;

          const isAnime = this.checkIsAnime(media);
          const mappedType = isAnime ? "anime" : "tv";

          const watchedEpisodes: { seasonNum: number; episodeNum: number }[] = [];
          let totalProgress = 0;
          if (item.seasons && Array.isArray(item.seasons)) {
            for (const s of item.seasons) {
              const seasonNum = s.number;
              if (s.episodes && Array.isArray(s.episodes)) {
                for (const ep of s.episodes) {
                  watchedEpisodes.push({
                    seasonNum,
                    episodeNum: ep.number,
                  });
                  totalProgress++;
                }
              }
            }
          }

          items.push({
            mediaType: mappedType,
            title: media.title,
            status: "WATCHING",
            progress: totalProgress,
            watchedEpisodes,
            score: 0,
            tvdbId: media.ids?.tvdb ? Number(media.ids.tvdb) : undefined,
            tmdbId: media.ids?.tmdb ? Number(media.ids.tmdb) : undefined,
            imdbId: media.ids?.imdb || undefined,
            traktId: media.ids?.trakt ? Number(media.ids.trakt) : undefined,
          });
        }
      }

      // 4. Fetch Ratings to merge scores
      const ratingsRes = await fetch("https://api.trakt.tv/sync/ratings", { headers });
      if (ratingsRes.ok) {
        const ratings = await ratingsRes.json();
        for (const rate of ratings) {
          const type = rate.type;
          const media = rate.movie || rate.show;
          if (!media || !media.ids?.trakt) continue;

          const traktId = Number(media.ids.trakt);
          const match = items.find((it) => it.traktId === traktId);
          if (match) {
            match.score = rate.rating;
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch user list from Trakt:", err.message);
    }

    return items;
  }

  private checkIsAnime(media: any): boolean {
    if (!media) return false;
    const country = media.country?.toLowerCase();
    const genres = Array.isArray(media.genres) ? media.genres.map((g: string) => g.toLowerCase()) : [];
    return country === "jp" || genres.includes("anime") || genres.includes("animation");
  }

  private async addToWatchlist(headers: Record<string, string>, type: "shows" | "movies", id: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/watchlist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id } }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to add to watchlist: ${err.message}`);
    }
  }

  private async removeFromWatchlist(headers: Record<string, string>, type: "shows" | "movies", id: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/watchlist/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id } }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to remove from watchlist: ${err.message}`);
    }
  }

  private async addToHistory(headers: Record<string, string>, type: "shows" | "movies", id: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/history", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id } }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to add to history: ${err.message}`);
    }
  }

  private async removeFromHistory(headers: Record<string, string>, type: "shows" | "movies", id: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/history/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id } }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to remove from history: ${err.message}`);
    }
  }

  private async syncShowEpisodesHistory(headers: Record<string, string>, showId: number, seasons: any[]): Promise<void> {
    try {
      // Clear history first to ensure perfect alignment
      await this.removeFromHistory(headers, "shows", showId);

      // Add selected episodes
      await fetch("https://api.trakt.tv/sync/history", {
        method: "POST",
        headers,
        body: JSON.stringify({
          shows: [
            {
              ids: { trakt: showId },
              seasons,
            },
          ],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to sync episodes history: ${err.message}`);
    }
  }

  private async setRating(headers: Record<string, string>, type: "shows" | "movies", id: number, rating: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/ratings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id }, rating }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to set rating: ${err.message}`);
    }
  }

  private async removeRating(headers: Record<string, string>, type: "shows" | "movies", id: number): Promise<void> {
    try {
      await fetch("https://api.trakt.tv/sync/ratings/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({
          [type]: [{ ids: { trakt: id } }],
        }),
      });
    } catch (err: any) {
      console.error(`Trakt failed to remove rating: ${err.message}`);
    }
  }
}
