# Directory Structure & Naming Conventions

All custom shared application components belong inside the `rrComponents` directory:
`apps/frontend/src/components/rrComponents/`

Follow these standard conventions:

- **File Names**: Use camelCase (e.g. `rrNotificationsModal.tsx`, `rrUserMenu.tsx`).
- **Component Names**: Use PascalCase (e.g. `RrNotificationsModal`, `RrUserMenu`).
- **Helper Functions/Variables**: Use camelCase (e.g. `handleCloseDialog`, `unreadCount`).
- **Constants**: Use SCREAMING_SNAKE_CASE (e.g. `PAGE_SIZE`, `DEFAULT_COLOR`).

## Centralized Configurations & Constants

- **Constants File**: All application constants (e.g. pagination sizes, layout dimensions, configuration objects) must live in a centralized file: `apps/frontend/src/lib/constants.ts`. Use standard uppercase exported constants (e.g. `export const MAX_RETRY_COUNT = 5`).
- **Minimize Magic Strings**: Avoid inline string configurations or magic keys. Reference them from the central `constants.ts` file.
- **Cache Keys File**: Put all cache keys (for SWR, Redis, etc.) in `apps/frontend/src/lib/cache-keys.ts`. Organize them as uppercase exported constants.

## Automation & Scripting

- **Repeated Approaches**: If any manual workflow, setup, code generation, or data migration approach is repeated, automate it with a script.
- **Location**: Place all helper/automation scripts in the `rrScripts/` directory at the project root.

