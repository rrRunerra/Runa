# Next.js & React Best Practices

**Performance and User Experience are the #1 concern.** Always keep rendering speed, responsiveness, bundle size, and layout stability at the forefront of your design.

> [!IMPORTANT]
> **Planning Requirement**: Always inform the user in detail about what you are going to do and always present a plan before executing any changes.

Read this file when working on server components, pages, route handlers, or any data fetching logic.

For the full rule set, consult:
- `.agents/skills/vercel-react-best-practices/SKILL.md` (and its `rules/` files)
- `.agents/skills/next-best-practices/SKILL.md` (and its linked reference files)

---

## RSC Boundaries

- **Server Components are the default.** Only add `'use client'` when the component uses hooks (`useState`, `useEffect`), event handlers, or browser-only APIs.
- Never make a component a Client Component just because it receives async data — pass serializable props down from a Server Component instead.
- `async` functions are **invalid** in Client Components — always keep async data fetching in Server Components or Server Actions.

## Data Fetching — No Waterfalls

- **Parallel-fetch everything independent.** Use `Promise.all()` for unrelated fetches in the same component:

```typescript
const [user, settings] = await Promise.all([
  fetchUser(id),
  fetchSettings(id),
]);
```

- Start promises early, `await` them late (async-defer pattern).
- Use `Suspense` boundaries to stream dynamic sections without blocking the static shell.

## Server Actions

- **Authenticate every Server Action** — treat them exactly like API route handlers. Never trust the caller is authenticated implicitly.
- Keep Server Actions small and focused; validate inputs with `class-validator` or `zod`.

## Images & Fonts

- **Always use `next/image`** — never a raw `<img>` tag. Set `width`/`height` (or `fill`) to prevent layout shift.
- **Always use `next/font`** — never `@import` or a `<link>` tag for fonts. This eliminates FOIT and reduces layout shift.

## Bundle Size

- **No barrel file imports.** Import directly from the source file:
  ```typescript
  // Wrong
  import { Button } from "@/components/ui";
  // Correct
  import { Button } from "@/components/ui/button";
  ```
- **Dynamic imports for heavy components.** Use `next/dynamic` for anything not needed on initial render:
  ```typescript
  const HeavyChart = dynamic(() => import("./HeavyChart"), { ssr: false });
  ```

## Re-render Optimization

- **Derive state during render**, not in `useEffect`:
  ```typescript
  // Wrong: syncing state in an effect
  useEffect(() => setFullName(`${first} ${last}`), [first, last]);
  // Correct: derive during render
  const fullName = `${first} ${last}`;
  ```
- **Functional `setState`** for callbacks that depend on previous state:
  ```typescript
  setCount(prev => prev + 1); // stable reference, no extra dependency
  ```
- **`useRef` for transient/high-frequency values** (e.g. scroll position, animation frame) that don't need to trigger re-renders.
- **Hoist non-primitive default props** to module level to avoid creating a new reference on every render:
  ```typescript
  const DEFAULT_ITEMS: string[] = []; // outside component
  function List({ items = DEFAULT_ITEMS }) { ... }
  ```

## Caching (Next.js 16+)

For data that doesn't need to be fresh on every request, use the `'use cache'` directive. See [`references/styling.md`](./styling.md) for general notes, and the full [`next-cache-components` skill](./../../../next-cache-components/SKILL.md) for complete API details.

```typescript
async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
```

Key constraints:
- Cannot access `cookies()`, `headers()`, or `searchParams` inside `use cache` — pass them as arguments instead.
- Use `cacheTag()` + `revalidateTag()` to invalidate on mutation.
- Not supported on Edge runtime or static exports.

## Async APIs (Next.js 15+)

`params`, `searchParams`, `cookies()`, and `headers()` are all async:

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  ...
}
```

## Error Handling

- Use `error.tsx` for segment-level errors, `global-error.tsx` for root layout errors.
- Call `notFound()` to render the nearest `not-found.tsx`.
- Use `unstable_rethrow` inside catch blocks that call `redirect()` or `notFound()` to avoid swallowing Next.js internal errors.

## Route Handlers

- Prefer **Server Actions** over Route Handlers for mutations triggered from the UI.
- Use Route Handlers (`route.ts`) for webhook receivers, third-party callbacks, or when you need full HTTP control.
- A `route.ts` and a `page.tsx` **cannot coexist** in the same segment directory.

---

## Route Access & Conditional Rendering

- **Public Routing First**: If possible, routes should be publicly accessible.
- **Conditional Rendering**: Rather than locking down entire pages behind hard route guards, favor rendering public shells and conditionally rendering sensitive/permission-based components when the user is logged in and has appropriate permissions.

---

## Localization & Internationalization (i18n)

- **Strict i18n**: When creating pages or layouts, make sure they strictly follow localization and internationalization patterns. Do not hardcode user-facing strings.
- **Supported Languages**: Support and design layouts for the following 15 languages:
  1. English US
  2. Japanese
  3. Korean
  4. Chinese (Simplified & Traditional)
  5. Polish
  6. Russian
  7. Norwegian
  8. Finnish
  9. Spanish
  10. German
  11. Czech
  12. Turkish
  13. Vietnamese (Vietnamise)
  14. Thai
  15. Malay

---

## Caching & Server Components

- **Prefer Server Components**: Maximize the use of React Server Components (RSC) to handle initial rendering and static shells.
- **Cache Where Possible**: Implement caching for data fetching and heavy rendering tasks where appropriate.
- **Centralized Keys**: Keep all cache invalidation tags and keys in the unified cache keys file: `apps/frontend/src/lib/cache-keys.ts`.

