# Frontend UI Migration Guide: Roles to Permissions

This guide documents the steps and code changes required to migrate the remaining frontend UI components and pages from checking `session.user.role === 'ADMIN'` to checking `session.user.permissions` using the new `@runa/permissions` package.

---

## Core Usage Pattern

To check if a logged-in user has the **Administrator** (all-rights) permission, import and use the `hasPermission` helper function directly:

```typescript
import { BitField, hasPermission } from "@runa/permissions";

const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);
```

Or instantiate a `BitField` class directly with the raw array:

```typescript
import { BitField } from "@runa/permissions";

const hasAdmin = new BitField(session?.user?.permissions).has(BitField.Flags.ADMINISTRATOR);
```

---

## Target Component Migrations

### 1. Database Actions
File: `apps/frontend/src/actions/databaseActions.ts`

```diff
+import { BitField, hasPermission } from "@runa/permissions";

 export async function runDatabaseAction(...) {
   const session = await auth();
-  if (!session || session.user.role !== "ADMIN") {
+  const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);
+  if (!session || !hasAdmin) {
     throw new Error("Unauthorized");
   }
   ...
 }
```

### 2. Sidebar Settings Tab
File: `apps/frontend/src/components/SidebarSettingsTab.tsx`

```diff
+import { BitField, hasPermission } from "@runa/permissions";

    const userRole = session?.user?.role;
+  const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);

-  const canAccessSection = !sec.role || userRole === "ADMIN" ? true : sec.role === userRole;
+  const canAccessSection = !sec.role || hasAdmin ? true : sec.role === userRole;
```

### 3. App Sidebar
File: `apps/frontend/src/components/AppSideBar.tsx`

```diff
+import { BitField, hasPermission } from "@runa/permissions";

+  const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);

   // Update checks for admin views:
-  (!c.role || session?.user?.role === "ADMIN"
+  (!c.role || hasAdmin
```

### 4. Spotlight Search
File: `apps/frontend/src/components/SpotlightSearch.tsx`

```diff
+import { BitField, hasPermission } from "@runa/permissions";

+  const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);

-  session?.user?.role !== "ADMIN"
+  !hasAdmin
```

### 5. Lynx Pages Protection
Files: `apps/frontend/src/app/(apps)/lynx/**/*.tsx`

Update all page-level checks at the top of the component files:
```diff
+import { BitField, hasPermission } from "@runa/permissions";

-  if (!session || session.user.role !== "ADMIN") {
+  const hasAdmin = hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR);
+  if (!session || !hasAdmin) {
     return <Unauthorized />;
   }
```
