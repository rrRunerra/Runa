# Permissions & BitFields Guidelines

This reference details the patterns and practices for handling user roles, permissions checking, bitfield modifications, and cache invalidation in the Runa project.

---

## 1. Checking Permissions

Always use `hasPermission` from `@runa/permissions` to check user permissions.

### Server-Side (Server Actions & Route Handlers)
```typescript
import { auth } from "@runa/auth";
import { hasPermission, RunaFlags } from "@runa/permissions";

const session = await auth();
if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
  throw new Error("Unauthorized");
}
```

### Client-Side (UI conditional rendering)
```typescript
import { useSession } from "next-auth/react";
import { hasPermission, RunaFlags } from "@runa/permissions";

const { data: session } = useSession();
const isAdmin = hasPermission(session?.user?.permissions, RunaFlags.ADMINISTRATOR);
```

---

## 2. Modifying Permissions

### Single User Updates
When editing a single user's permissions, update their `permissions` field in the database and invalidate their Redis permission cache key to ensure the session updates immediately:

```typescript
import { prisma } from "@runa/database";
import { createCacheClient } from "@runa/cache";

const cache = createCacheClient();

await prisma.user.update({
  where: { id: userId },
  data: { permissions: newPermissions },
});

// Cache key must be cleared immediately
await cache.del(`user:permissions:${userId}`);
```

### Bulk/Batch Updates
Use a database transaction for bulk edits to ensure atomicity, and clear caches in bulk:

```typescript
const updates = userIds.map((userId) => {
  const currentBitField = BitField.fromRaw(user.permissions);
  currentBitField.add(permissionFlags); // or currentBitField.remove(...)
  return prisma.user.update({
    where: { id: userId },
    data: { permissions: currentBitField.serialize() },
  });
});

await prisma.$transaction(updates);

// Clear Redis cache for all modified users
for (const userId of userIds) {
  await cache.del(`user:permissions:${userId}`);
}
```

---

## 3. Dynamic Flag Discovery

To inspect and display available permissions dynamically without hardcoding arrays of flags:
1. Import all exports from `@runa/permissions`.
2. Filter the keys ending with `Flags`.
3. Map their entries to bitfield values and human-readable names.

```typescript
import * as Permissions from "@runa/permissions";

const flagGroupKeys = Object.keys(Permissions).filter(key => key.endsWith("Flags"));
```

---

## 4. UI State & React Synchronization Patterns

When binding form edits to user permission arrays, follow these two patterns to avoid React's `Maximum update depth exceeded` loops:

### Pattern A: Derive Active User State
**Never** store the active user's full object in React state. Store only their `activeUserId` (string primitive), and derive the `activeUser` object using `useMemo` from the SWR/loaded users array:

```typescript
// Correct
const [activeUserId, setActiveUserId] = useState<string | null>(null);
const activeUser = useMemo(
  () => users.find((u) => u.id === activeUserId) || null,
  [users, activeUserId]
);
```

### Pattern B: String-based Permission Sync
When synchronizing database permissions with a form edit state (`editedPermissions`), do not pass object references or array references directly to the `useEffect` dependency array. Stringify them to ensure reference checks don't loop:

```typescript
const dbPermissionsString = activeUser?.permissions.join(",") || "";

useEffect(() => {
  if (activeUser) {
    setEditedPermissions([...activeUser.permissions]);
  } else {
    setEditedPermissions([]);
  }
}, [activeUserId, dbPermissionsString]);
```

---

## 5. Detecting Legacy or Undefined Bits

If a user has legacy or renamed permissions saved in the database, detect them using a bitwise AND-NOT check between the user's active bits and the union of all active codebase flags:

```typescript
// Find bits set in user Word but NOT set in Defined code Words
const legacyWord = userWord & ~definedWord;
```
Provide a cleanup path in the editor to let administrators uncheck these legacy flags and purge them from the database.

---

## 6. Route Guards & Preventing Infinite Redirect Loops

When protecting parent routes (e.g., `/monoceros`) using middleware or proxy guards, sub-routes such as the unauthorized redirect target (e.g., `/monoceros/unauthorized`) will also match the prefix check.

1. **Avoid Loops**: Always include a check in the routing guard condition to verify the requested pathname is not already the redirect target itself.
2. **Implementation Example**:
   ```typescript
   if (pathname.startsWith(guard.path) && pathname !== guard.redirect) {
     if (!hasPermission(token.permissions, guard.permission)) {
       url.pathname = guard.redirect;
       return NextResponse.redirect(url);
     }
   }
   ```
