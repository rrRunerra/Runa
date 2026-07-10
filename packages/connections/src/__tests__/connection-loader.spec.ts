import { ConnectionLoader } from "../connection-loader.js";
import { ConnectionProvider } from "@runa/database";

describe("ConnectionLoader", () => {
  it("should scan and load connection classes dynamically", async () => {
    const mockPrisma = {
      client: {
        connections: {},
      },
    };
    
    const mockDeps = {
      prisma: mockPrisma,
      apiUrl: "http://localhost:3000/api", // DevSkim: ignore DS137138, DS162092
      env: {
        ANILIST_CLIENT_ID: "anilist-id",
        ANILIST_CLIENT_SECRET: "anilist-secret",
        MAL_CLIENT_ID: "mal-id",
        MAL_CLIENT_SECRET: "mal-secret",
        SIMKL_CLIENT_ID: "simkl-id",
        SIMKL_CLIENT_SECRET: "simkl-secret",
        DISCORD_CLIENT_ID: "discord-id",
        DISCORD_CLIENT_SECRET: "discord-secret",
        TRAKT_CLIENT_ID: "trakt-id",
        TRAKT_CLIENT_SECRET: "trakt-secret",
      },
    };

    const loader = new ConnectionLoader(mockDeps);
    const loaded = await loader.loadConnections();

    // Check that our five provider classes are loaded successfully
    expect(loaded.size).toBe(5);
    expect(loaded.has(ConnectionProvider.ANILIST)).toBe(true);
    expect(loaded.has(ConnectionProvider.MAL)).toBe(true);
    expect(loaded.has(ConnectionProvider.SIMKL)).toBe(true);
    expect(loaded.has(ConnectionProvider.DISCORD)).toBe(true);
    expect(loaded.has(ConnectionProvider.TRAKT)).toBe(true);

    const anilist = loader.getConnection(ConnectionProvider.ANILIST);
    expect(anilist).toBeDefined();
    expect(anilist?.providerKey).toBe(ConnectionProvider.ANILIST);
  });
});
