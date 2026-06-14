import { ConnectionProvider } from "@runa/database";
import { AnimeUpdateData, MangaUpdateData, MovieUpdateData, TvUpdateData, ConnectionDependencies } from "./types.js";
import { ConnectionCapability } from "./metadata.js";

export abstract class BaseConnection {
  public abstract readonly providerKey: ConnectionProvider;
  public abstract readonly requiredEnvKeys: string[];
  public abstract readonly capabilities: ConnectionCapability[];
  
  public isEnabled: boolean = true;

  constructor(protected readonly deps: ConnectionDependencies) {}

  /**
   * Generates the OAuth authorization URL for the provider.
   * @param token Auth token to be passed in the state parameter
   * @param redirectUrl Client-side redirect URL to return to after auth flow
   */
  public abstract getAuthUrl(token: string, redirectUrl?: string): Promise<string> | string;

  /**
   * Handles the OAuth callback, exchanges code for tokens, fetches user profile, and saves the connection.
   * @param code Authorization code from the provider
   * @param username Owner of the connection
   */
  public abstract handleCallback(code: string, username: string): Promise<{ success: boolean }>;

  /**
   * Updates an anime list entry for the user. (Optional capability)
   */
  public updateAnimeEntry?(username: string, providerId: number, data: AnimeUpdateData): Promise<void>;

  /**
   * Updates a manga list entry for the user. (Optional capability)
   */
  public updateMangaEntry?(username: string, providerId: number, data: MangaUpdateData): Promise<void>;

  /**
   * Updates a movie list entry for the user. (Optional capability)
   */
  public updateMovieEntry?(username: string, providerId: number, data: MovieUpdateData): Promise<void>;

  /**
   * Updates a TV show list entry for the user. (Optional capability)
   */
  public updateTvEntry?(username: string, providerId: number, data: TvUpdateData): Promise<void>;

  /**
   * Deletes an anime list entry for the user. (Optional capability)
   */
  public deleteAnimeEntry?(username: string, providerId: number): Promise<void>;

  /**
   * Deletes a manga list entry for the user. (Optional capability)
   */
  public deleteMangaEntry?(username: string, providerId: number): Promise<void>;

  /**
   * Deletes a movie list entry for the user. (Optional capability)
   */
  public deleteMovieEntry?(username: string, providerId: number): Promise<void>;

  /**
   * Deletes a TV show list entry for the user. (Optional capability)
   */
  public deleteTvEntry?(username: string, providerId: number): Promise<void>;

  /**
   * Fetches user's media list from the provider. (Optional capability)
   */
  public fetchUserList?(username: string): Promise<any[]>;
}
