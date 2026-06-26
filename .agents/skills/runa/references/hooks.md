# Standard Workspace Hooks

Always prioritize reusing these standard hooks instead of native fetches or custom state synchronization.

---

## A. Data Fetching: `useFetch`

Import `useFetch` from `@/hooks/useFetch` for all remote API communications.

```typescript
import { useFetch } from "@/hooks/useFetch";

// Query GET request
const { data, loading, error, refetch } = useFetch<Notification[]>(
  `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
  {
    headers: { Authorization: `Bearer ${session?.accessToken}` },
    enabled: !!session?.accessToken,
  },
);
```

### Mutations (POST / PUT / DELETE)

**Always use `useFetch` — never the native `fetch` API directly.**

- If `useFetch` is missing functionality required for a mutation (e.g. streaming, file upload), **stop and notify the user** before proceeding. Let the user decide whether to extend `useFetch` or use an alternative approach.
- After a successful mutation, trigger a re-sync by calling `refetch()` or dispatching a window event:

```typescript
window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
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

## C. Navigation Sidebar: `useRRSidebar`

Import `useRRSidebar` from `@/hooks/useRRSidebar` (not the shadcn `useSidebar`) to control Runa's sidebar navigation config and react to sidebar state changes. Optionally pass a `SidebarConfig` to configure the sidebar for the current page.

```typescript
import { useRRSidebar } from "@/hooks/useRRSidebar";
import type { SidebarConfig } from "@/types/SidebarConfig";

// Read sidebar context
const context = useRRSidebar();

// Or push a page-level config on mount
const config: SidebarConfig = { /* ... */ };
useRRSidebar(config);
```

- Must be used inside a `SidebarProvider` (throws otherwise).
- Pass a `config` object to `useRRSidebar()` when a page or tab needs to customise the sidebar navigation.
