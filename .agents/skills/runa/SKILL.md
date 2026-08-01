---
name: runa
description: Master guide for Runa frontend development — creating, designing, and refactoring React/Next.js components, pages, and UI tabs. Always use this skill when working on any UI, component, modal, page, settings tab, or frontend feature in the Runa app. Covers workspace hooks, styling (shadcn radix-mira + lucide), DRY principles, Next.js/React best practices, and design quality standards.
---

# Runa Frontend Development Guide

This is the master skill for all frontend work in the Runa app. **Read the relevant reference files before writing any code.** Every rule in the "Quick Rules" section is always enforced — no exceptions.

> [!IMPORTANT]
> **Skill modification rule**: Never add, edit, or remove anything in this skill (or its reference files) without first proposing the change and getting explicit confirmation from the user.

---

## Reference Files

| Topic                                                                   | File                                                     | When to read                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Directory structure & naming conventions                                | [references/conventions.md](./references/conventions.md) | Always                                                                  |
| Standard workspace hooks (`useFetch`, `useRRe2ee`, `useRRSidebar`)      | [references/hooks.md](./references/hooks.md)             | Always                                                                  |
| Styling, theming (light/dark), shadcn preset                            | [references/styling.md](./references/styling.md)         | Always                                                                  |
| DRY principle, reusability, extensibility                               | [references/principles.md](./references/principles.md)   | Always                                                                  |
| Next.js & React best practices (RSC, data fetching, bundle, re-renders) | [references/nextjs.md](./references/nextjs.md)           | When working on pages, Server Components, data fetching, or performance |
| Permissions checking, BitFields, and sync state                        | [references/permissions.md](./references/permissions.md) | When designing or editing permissions, role checks, or bulk edit tools |

---

## External Skill References

These skills provide deeper guidance for specific domains. Consult them when the task falls into their scope:

| Skill | When to use |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [vercel-react-best-practices](./../vercel-react-best-practices/SKILL.md) | Reviewing or optimizing React/Next.js code for performance, bundle size, or re-render issues                                                       |
| [next-best-practices](./../next-best-practices/SKILL.md)                 | Working with file conventions, route handlers, metadata, image/font optimization, error boundaries, or async APIs                                  |
| [next-cache-components](./../next-cache-components/SKILL.md)             | Implementing cached server data with `'use cache'`, `cacheLife`, `cacheTag`, or PPR (Partial Prerendering)                                         |
| [ui-ux-pro-max](./../ui-ux-pro-max/SKILL.md)                             | **Always active when creating new components** — also for new pages/layouts, style/color/typography decisions, and UX/accessibility audits         |
| [shadcn](./../shadcn/SKILL.md)                                           | **Always active when creating new components** — also for adding, updating, or composing shadcn/ui components; checking component docs or registry |
| [caveman](./../caveman/SKILL.md)                                         | Always active in full mode                                                                                                                         |

---

## Quick Rules (Always Enforced)

### Planning & Execution

- **Detailed Plan**: Always inform the user in detail about what you are going to do, and always present a plan before execution.
- **Performance & UX**: Performance and user experience are the #1 concern for every change.
- **Configurability & Network**: Ensure components and features are highly configurable and fully usable/compatible both on a local network (LAN/offline environments) and through the public internet.

### Data, Caching & Encryption

- **No Magic Strings**: Minimize magic strings; define all application constants in `apps/frontend/src/lib/constants.ts` using uppercase names.
- **Encryption**: Encrypt all sensitive user data, preferably using the post-quantum `@runa/crypto` package (`useRRCrypto` on the client side).
- **Caching**: Implement caching where beneficial; register all cache tag/key constants in `apps/frontend/src/lib/cache-keys.ts`.
- **Querying**: Never use the custom `useFetch` hook. Always use `useSWR` from `"swr"` for querying, and standard `fetch` (with SWR `mutate`) for mutations.
- **Navigation Hooks**: Always use `useRRSidebar` from `@/hooks/useRRSidebar` for sidebar navigation config. Always use `useSidebar` from `@/components/ui/sidebar` when directly controlling the sidebar panel toggle/open state.

### Route Access & UI Design

- **Feature Permissions**: Every frontend feature, route, or interactive action must be guarded by a permission check (using `hasPermission` from `@runa/permissions`), unless the feature is intended to be public and usable without an account. Highly customize access so that every private action has its own granular permission.
- **Public Routing**: Make routes publicly accessible where possible; conditionally render sensitive/permissioned UI elements.
- **Providers for Data**: Leaf components must be reusable and remain independent of data fetching; pass data through Context Providers or custom hooks.
- **Pessimistic Modals**: Always use a pessimistic approach for modals; keep the dialog open in a disabled/loading state during requests, and only close on success. Show validation or backend errors inline.
- **Content-Matching Skeletons**: Avoid generic page loading spinners; use custom Tailwind skeletons that match the shape and layout of the loading content.

### Styling & Theming

- **Never** use hardcoded color values (raw hex, rgb) or static Tailwind colors (e.g., `bg-zinc-950`, `text-emerald-400`) in the UI markup. Only use schematic classes in `globals.css` (custom ones can be listed/defined there using CSS variables to adapt to both light/dark themes seamlessly).
- **Never** add `dark:` class overrides — schematic classes and tokens handle both themes automatically.
- **Always** import icons from `lucide-react` (project uses radix-mira preset).
- **Always** design layouts and components using a **mobile first approach**. Define styles for mobile by default, and use Tailwind responsive prefixes (e.g., `md:`, `lg:`) to scale the interface upward.

### Before Acting

- **Always** propose existing alternatives before writing custom code — search the shadcn registry (`npx shadcn@latest search`), npm packages, or community registries first.
- Present options to the user with a brief trade-off summary and let them choose before proceeding.

### Component Design & i18n

- **Always** follow DRY — extract repeated JSX into sub-components, repeated logic into hooks/utilities.
- **Always** make components reusable: export props interfaces, accept overrides via props, prefer composition over monolithic config objects.
- **Always** split pages/tabs larger than ~150–200 lines of JSX into focused child components.
- **Always** follow strict localization and internationalization (i18n) when building pages. Do not hardcode user-facing strings.
- **Never** pass default fallback values to `t()` translation calls (e.g. `t("key", "Default Value")` — always remove default values and use `t("key")` directly without a second string parameter to prevent hydration mismatches and translation overrides).
- **Never** edit or update language JSON files (`apps/frontend/src/locales/*.json` or `apps/frontend/public/locales/*/translation.json`) directly.
- **Always** add EVERY SINGLE LANGUAGE when adding or modifying translation keys. All 16 supported languages must be included: English (`en`), Czech (`cs`), German (`de`), Spanish (`es`), Finnish (`fi`), Japanese (`ja`), Korean (`ko`), Malay (`ms`), Norwegian (`no`), Polish (`pl`), Russian (`ru`), Thai (`th`), Turkish (`tr`), Vietnamese (`vi`), Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`).
- **Always** use `rrScripts/append-locale.js` to add and sync translations:
  - **Batch Mode (Recommended for AI Agents)**: Add key mappings for all 16 languages to the `batchData` object in `rrScripts/append-locale.js`, run `node append-locale.js --batch` from `rrScripts/` (which updates all `.js` files in `rrScripts/locales/`, compiles JSON files to `src/locales` and `public/locales`, and validates 100% key parity across all 16 languages), and then reset `batchData` back to `{}`.
  - **Interactive Mode**: Run `node append-locale.js` in `rrScripts/` for step-by-step CLI prompts.

### TypeScript Types

- **Always** use explicit types for function parameters and return types — never rely on implicit inference for signatures.
- **Never** use `any` — prefer `unknown` when the type is uncertain, then narrow with type guards.
- If `any` is truly unavoidable (e.g. third-party lib with no types), **ask the user for permission** before using it.
- **Always** prefer `interface` for object shapes and `type` for unions/aliases.
- **Avoid** `as` casts — use proper type narrowing instead.

### Next.js & React

- **RSC by default** — only add `'use client'` when strictly needed (hooks, event handlers, browser APIs).
- **No data waterfalls** — use `Promise.all()` for independent parallel fetches.
- **Always** use `next/image` — never a raw `<img>` tag.
- **Avoid re-renders** — derive state during render; use functional `setState`; use `useRef` for transient values.
- **Dynamic imports** — use `next/dynamic` for heavy components not needed on initial render.
- **No barrel imports** — import directly from the source file to keep bundles lean.
- **Authenticate every Server Action** — treat them the same as API route handlers.

### Feature Documentation

- **Always** document every new feature or major change. Create or update the walkthrough, write clean inline comments/docstrings, and add or update markdown references.

### Automation & Scripting

- **Always** automate manual, repeated setup, workflows, component generation, or data migration with a script placed in the `rrScripts/` directory.

### Testing

- **Always** write extensive tests for API endpoints — cover happy path, auth errors (401/403), validation errors, edge cases, and failure modes.
- Follow the AAA pattern (Arrange / Act / Assert) and place test files alongside source with `.spec.ts` extension.

### Skill Maintenance

- **Never** modify this skill or any of its reference files without first proposing and confirming the change with the user.
- When a recurring pattern is identified that should be captured, use the [skill-creator](./../skill-creator/SKILL.md) skill to draft and evaluate an addition — then present it to the user for approval before applying.
