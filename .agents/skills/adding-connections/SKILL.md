---
name: adding-connections
description: Guide on how to add a connection provider (such as OAuth trackers, manual list connections, or media search sources like RAWG, Backloggd, IGDB) to Runa. Use this skill whenever the user mentions adding a new connection, integrating external services, modifying the connections settings panel, or editing connection capabilities in Runa.
---

# Adding a New Connection Provider to Runa

This guide details the step-by-step process of adding a new connection provider (OAuth-based or manual username/ID-based) to the Runa platform.

---

## 1. Database Schema Configuration

Connection providers are defined in the Prisma database schema.

1. Open [schema.prisma](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/packages/database/schema.prisma).
2. Find the `enum ConnectionProvider` definition and append your new provider key (in uppercase):

```prisma
enum ConnectionProvider {
    ANILIST
    MAL
    SIMKL
    DISCORD
    TRAKT
    YOUR_NEW_PROVIDER  // <-- Add your provider here
}
```

3. Regenerate the Prisma client types by running the following command from the root directory:
```bash
pnpm --filter @runa/database db:generate
```

4. Push the schema update to your database:
```bash
pnpm --filter @runa/database db:push
```

---

## 2. Connection Class Implementation

Create a new connection provider file under `packages/connections/src/providers/your-provider.connection.ts`. Your class must inherit from `BaseConnection` and implement all abstract methods.

### OAuth Connection Template

If the provider supports OAuth2:

```typescript
import { ConnectionProvider, ConnectionLinkedTo } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";
import { AnimeUpdateData } from "../types.js";

export default class YourProviderConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.YOUR_NEW_PROVIDER;

  // Environment variables required to enable this provider
  public readonly requiredEnvKeys = [
    "YOUR_NEW_PROVIDER_CLIENT_ID",
    "YOUR_NEW_PROVIDER_CLIENT_SECRET",
  ];

  // Capabilities supported by this provider (e.g. ANIME, MANGA, GAME, SHOWCASE, AUTH)
  public readonly capabilities = [
    ConnectionCapability.AUTH,
    ConnectionCapability.SHOWCASE,
  ];

  // Generates the OAuth authorization URL
  public getAuthUrl(token: string, redirectUrl?: string): string {
    const clientId = this.deps.env.YOUR_NEW_PROVIDER_CLIENT_ID;
    const redirectUri = `${this.deps.apiUrl}/connections/your-new-provider/callback`;
    const url = new URL("https://example.com/oauth/authorize");
    url.searchParams.append("client_id", clientId!);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append("state", state);

    return url.toString();
  }

  // Handles authorization callback, token exchange, and saves the connection
  public async handleCallback(
    code: string,
    username: string,
  ): Promise<{ success: boolean }> {
    const clientId = this.deps.env.YOUR_NEW_PROVIDER_CLIENT_ID;
    const clientSecret = this.deps.env.YOUR_NEW_PROVIDER_CLIENT_SECRET;
    const redirectUri = `${this.deps.apiUrl}/connections/your-new-provider/callback`;

    // 1. Exchange authorization code for token
    const tokenRes = await fetch("https://example.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) throw new Error("Token exchange failed");
    const tokens = await tokenRes.json();

    // 2. Fetch user profile info
    const profileRes = await fetch("https://example.com/api/profile", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Profile fetch failed");
    const profile = await profileRes.json();

    // 3. Upsert into database
    await this.deps.prisma.client.connections.upsert({
      where: {
        username_provider: {
          username,
          provider: ConnectionProvider.YOUR_NEW_PROVIDER,
        },
      },
      update: {
        linkedUsername: profile.username,
        accessToken: tokens.access_token,
        connectionId: String(profile.id),
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
      create: {
        username,
        provider: ConnectionProvider.YOUR_NEW_PROVIDER,
        linkedUsername: profile.username,
        accessToken: tokens.access_token,
        connectionId: String(profile.id),
        linkedTo: ConnectionLinkedTo.AQUILA,
      },
    });

    return { success: true };
  }
}
```

### Manual Connection Template (No OAuth Support)

If the provider does not support OAuth (e.g. Backloggd, RAWG) and is linked using a manual username:

```typescript
import { ConnectionProvider } from "@runa/database";
import { BaseConnection } from "../base-connection.js";
import { ConnectionCapability } from "../metadata.js";

export default class YourProviderConnection extends BaseConnection {
  public readonly providerKey = ConnectionProvider.YOUR_NEW_PROVIDER;
  public readonly requiredEnvKeys = []; // No env variables required, or global API keys only
  public readonly capabilities = [
    ConnectionCapability.GAME,
    ConnectionCapability.SHOWCASE,
  ];

  // Disable OAuth redirects
  public getAuthUrl(token: string, redirectUrl?: string): string {
    throw new Error("OAuth not supported for this provider.");
  }

  public async handleCallback(code: string, username: string): Promise<{ success: boolean }> {
    throw new Error("OAuth not supported for this provider.");
  }
}
```

---

## 3. Metadata Configuration

Display metadata must be registered to render UI styling, icons, and client-side searching.

### Backend/Connections Metadata

1. Open [metadata.ts](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/packages/connections/src/metadata.ts).
2. If necessary, update the `search` signature type parameters to support your capability (e.g., `"GAME"` or `"BOOKS"`).
3. Add your provider to the `PROVIDERS_METADATA` array:

```typescript
  {
    id: "your-new-provider", // ID matches lowercase of providerKey
    name: "Your Provider Name",
    description: "Brief user-friendly description.",
    url: "https://example.com",
    icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/your-provider.png", // Prefer dashboard-icons CDN
    accentColor: "bg-[#accent]/10 border-[#accent]/20 text-[#accent] hover:bg-[#accent]/20",
    glowColor: "shadow-[#accent]/10",
    capabilities: [ConnectionCapability.GAME, ConnectionCapability.SHOWCASE],
    primaryApp: "aquila", // Or "lynx"

    // Optional: Search function for client-side queries
    async search(query: string, type: "GAME"): Promise<ConnectionSearchResult[]> {
      const apiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "" : "";
      const res = await fetch(`https://example.com/api/search?q=${encodeURIComponent(query)}&key=${apiKey}`);
      const data = await res.json();
      return (data.results || []).map((item: any) => ({
        id: item.id.toString(),
        title: item.name,
        image: item.image_url,
      }));
    }
  }
```

### Frontend Providers List

1. Open [providers.ts](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/lib/providers.ts).
2. Update the `ConnectionProviderUI` interface's `search` signature to mirror the updated search types.

---

## 4. Frontend UI Adaptations

### Setting up Manual Links in settings

To support manual connections (username submission) on the Settings page instead of redirecting to OAuth:

1. Open [rrConnectionsTab.tsx](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/components/rrComponents/rrSettings/rrConnectionsTab.tsx).
2. Intercept `handleConnect` for manual providers:

```typescript
  const handleConnect = (providerId: string): void => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to link accounts.");
      return;
    }
    const lowerProvider = providerId.toLowerCase();
    if (["your-manual-provider"].includes(lowerProvider)) {
      setManualConnectProvider(providerId);
      setManualUsername("");
      setShowManualConnectDialog(true);
      return;
    }
    // ... existing OAuth redirect logic
  };
```

3. Render a dialog requesting the manual username, and on submission, call `POST /connections/save`:

```typescript
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/connections/save`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        provider: manualConnectProvider.toUpperCase(),
        linkedUsername: manualUsername.trim(),
        connectionId: manualUsername.trim(),
      }),
    },
  );
```

### Fallback Manual Link in Media Search Modal

If the provider does not support searching or search is unreliable, add a manual link text input to [RrMediaConnectionSearchModal.tsx](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/components/rrComponents/aquila/media-edit/RrMediaConnectionSearchModal.tsx):

```typescript
  // Render manual ID/slug submit button at bottom of Search Modal
  <div className="flex gap-2">
    <Input
      placeholder="Enter ID or slug manually..."
      value={manualId}
      onChange={(e) => setManualId(e.target.value)}
    />
    <Button
      onClick={() => onSelectResult(activeSearchProvider, manualId.trim())}
      disabled={!manualId.trim()}
    >
      Link ID
    </Button>
  </div>
```

---

## 5. Writing Unit Tests

Ensure your loader successfully picks up the connection provider files.

1. Open [connection-loader.spec.ts](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/packages/connections/src/__tests__/connection-loader.spec.ts).
2. Mock credentials for the provider under `mockDeps.env`.
3. Update expectations:
```typescript
expect(loaded.size).toBe(original_size + 1);
expect(loaded.has(ConnectionProvider.YOUR_NEW_PROVIDER)).toBe(true);
```
