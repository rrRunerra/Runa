# AGENTS.md - Runa Development Guide

Guidelines for agentic coding agents working in the Runa repository.

## Project Structure

```
Runa/
├── apps/
│   ├── backend/        # NestJS API server
│   ├── frontend/       # Next.js 16 application
│   └── lynx-bot/       # Discord bot
├── packages/
│   ├── api/            # Auto-generated SDK
│   ├── auth/           # Shared auth utilities
│   ├── cache/          # Redis cache utilities
│   ├── connections/    # External service connections
│   ├── crypto/         # Crypto utilities
│   ├── database/       # Prisma database client
│   ├── notifications/  # Notification types
│   ├── permissions/    # Permission handling
│   ├── typescript-config/  # Shared TS config
└── turbo.json          # Turborepo configuration
```

## Build / Lint / Test Commands

### Backend (NestJS) - `apps/backend`

```bash
# Build
pnpm build

# Development (watch mode)
pnpm dev

# Run all tests
pnpm test

# Run single test file
pnpm test -- users.service.spec.ts

# Run tests in watch mode
pnpm test:watch

# Coverage report
pnpm test:cov

# E2E tests
pnpm test:e2e

# Debug single test
pnpm test:debug -- users.service.spec.ts
```

### Frontend (Next.js 16) - `apps/frontend`

```bash
# Build
pnpm build

# Development server
pnpm dev
```

### Database (Prisma) - `packages/database`

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes
pnpm db:push

# Run migrations
pnpm db:migrate

# Prisma Studio
pnpm db:studio

# push, generate at once
pnpm run db:all
```

### Running Single Test (Backend)

```bash
# From apps/backend directory
pnpm test -- users.service.spec.ts

# Or with pattern matching
pnpm test -- users.service
```

## Code Style Guidelines

### Formatting

- **Indent**: 2 spaces
- **Line length**: Let formatters handle it (Prettier)
- **Quotes**: Single quotes (Prettier default)
- **Trailing commas**: es5 (Prettier default)

### TypeScript Conventions

- **Always use explicit types** for function parameters and return types
- **Avoid `any`**, use `unknown` when type is uncertain
- **Use interfaces** for object shapes, `type` for unions/aliases
- **Avoid `as` casts** - use proper typing instead
- **Strict mode**: Enabled (`strict: true` in tsconfig)

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`, `user-profile.tsx`)
- **Components/Classes**: PascalCase (`UserService`, `UserProfile`)
- **Functions/variables**: camelCase (`getUserById`, `userCount`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase without "I" prefix (`User`, not `IUser`)
- **Types**: PascalCase (`UserRole`, `ApiResponse`)

### Import Organization

Separate import groups with blank lines:

1. External libraries (react, next, @nestjs/\*, etc.)
2. Workspace packages (@runa/\*)
3. Relative imports (./, ../)

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserService } from "@runa/api";
import { Button } from "@runa/ui";
import { AuthConfig } from "../config/auth";
import { useAuth } from "./hooks/useAuth";
```

### React/Next.js Patterns

- **Server Components** by default in Next.js App Router
- **Client Components**: Mark with `'use client'` directive
- **Tailwind CSS** for styling
- **shadcn/ui** (Radix + Mira) for components
- **SWR** for data fetching
- **React Hook Form** + Zod for forms

### NestJS Patterns

- **Dependency Injection** via constructor
- **SOLID principles** for services/controllers
- **Decorators** for routing (`@Get`, `@Post`, etc.)
- **class-validator** for DTO validation
- **Custom exception classes** for typed errors

### Error Handling

- **try/catch** for async operations
- **Throw typed errors** (custom exception classes in NestJS)
- **Return proper HTTP status codes**
- **Log errors appropriately** (use NestJS Logger)

```typescript
@Injectable()
export class UserService {
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

### Database (Prisma)

- Use **Prisma Client** from `@runa/database`
- Use **transactions** for multi-step operations
- Include **relations eagerly** (use `include`)
- Handle **null** values explicitly

```typescript
const user = await this.prisma.user.findUnique({
  where: { id },
  include: { posts: true }, // eager load relations
});
```

## Testing Guidelines

### Unit Tests (Backend)

- Place tests alongside source with `.spec.ts` extension
- Use **Jest** with **ts-jest** transformer
- Follow **AAA pattern**: Arrange, Act, Assert

```typescript
describe("UserService", () => {
  it("should find user by id", async () => {
    const mockUser = { id: "1", email: "email: "test@example.com" };
    prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
    const result = await userService.findById("1");
    expect(result).toEqual(mockUser);
  });
});
```

### Running Tests

- Run from package directory: `cd apps/backend && pnpm test`
- Single test: `pnpm test -- users.service.spec.ts`
- Watch mode: `pnpm test:watch`

## Git Conventions

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Keep commits **atomic** and **focused**
- Run **lint and format** before committing

## Common Issues

### Running Tests

- Run from `apps/backend` directory
- Pass args with `--`: `pnpm test -- users.service.spec`

### Type Errors

- Root: `pnpm check-types`
- Individual apps: `pnpm build` shows type errors

### Database

- After schema changes: `pnpm db:generate` in `packages/database`
- Prisma Studio: `npx prisma studio` in `packages/database`

## Additional Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
