# Standard Workspace Hooks

Always prioritize reusing these standard hooks instead of native fetches or custom state synchronization.

---

Import `useSWR` from `"swr"` and the centralized `fetcher` from `@/lib/fetcher` for all remote API queries.

```typescript
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

// Query GET request with optional authorization token in SWR key tuple
const { data, error, isLoading, mutate } = useSWR<Notification[]>(
  session?.accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/notifications`, session.accessToken] : null,
  fetcher
);
```

### Mutations (POST / PUT / DELETE)

**Use standard `fetch` API for all mutations, then call `mutate(key)` to refresh the SWR cache.**

- After a successful mutation, trigger a cache update by calling `mutate` (either the local one returned by `useSWR`, or the global `mutate` from `"swr"`):

```typescript
// Refetch SWR cache
mutate();
```

---

## B. Encryption Status: `useRRe2ee`

Import `useRRe2ee` from `@/components/Providers/rrE2eeProvider` to manage encryption keys, encryption status, and triggering the unlock modal.

```typescript
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

const { isE2eeUnlocked, isKeysExist, lockE2ee, setShowUnlockDialog } =
  useRRe2ee();
```

- Use `isE2eeUnlocked` to conditionally check if secure keys are active.
- Use `setShowUnlockDialog(true)` to trigger the decryption dialog manually.

---

## C. Navigation Sidebar hooks

There are **two separate sidebar hooks** with distinct responsibilities. Never substitute one for the other.

### `useRRSidebar` — navigation config only

Import from `@/hooks/useRRSidebar` to **read or write the sidebar navigation config** (`sidebarConfig`, `setSidebarConfig`, `getSection`, etc.). Optionally pass a `SidebarConfig` to push a page-level config on mount.

```typescript
import { useRRSidebar } from "@/hooks/useRRSidebar";
import type { SidebarConfig } from "@/types/SidebarConfig";

// Read nav config from context
const { sidebarConfig } = useRRSidebar();

// Push a page-level config on mount
const config: SidebarConfig = { /* ... */ };
useRRSidebar(config);
```

- Must be used inside a `SidebarProvider` (throws otherwise).
- **Only** use this hook when you need to read/write navigation structure.

### `useSidebar` — panel state only

Import from `@/components/ui/sidebar` (shadcn) to **directly control the sidebar panel** — toggling open/closed, reading open state, etc.

```typescript
import { useSidebar } from "@/components/ui/sidebar";

const { toggleSidebar, open, setOpen } = useSidebar();
```

- Use this when you need to programmatically open, close, or toggle the sidebar panel.
- **Do not** use this for reading or writing navigation config — use `useRRSidebar` for that.

### When to use which

| Need | Hook |
|---|---|
| Read/set nav items or sections | `useRRSidebar` |
| Toggle / open / close the sidebar panel | `useSidebar` |
| Both | Use both hooks together |
