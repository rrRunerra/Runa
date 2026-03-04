# AGENTS.md - Runa Development Guide

This document provides guidelines for agentic coding agents working in the Runa repository.

## Project Structure

```
Runa/
├── apps/
│   ├── auth/           # NextAuth authentication app (port 3000)
│   ├── backend/        # NestJS API server
│   ├── lynx-ui/        # Next.js UI application (port 3001)
│   └── lynx-bot/       # Discord bot
├── packages/
│   ├── api/            # Auto-generated Nestia SDK
│   ├── auth/           # Shared auth utilities
│   ├── database/       # Prisma database client
│   ├── edupage/        # EduPage integration
│   └── ui/             # Shared UI components
└── turbo.json          # Turborepo configuration
```

## Build/Lint/Test Commands

### Root Commands

```bash
pnpm install            # Install all dependencies
pnpm build             # Build all apps/packages
pnpm dev               # Run all apps in development
pnpm lint              # Lint all apps
pnpm format            # Format all code with Prettier
pnpm check-types       # Type-check all projects
```

### Backend (NestJS)

```bash
cd apps/backend

pnpm dev               # Start with hot reload
pnpm build             # Production build
pnpm start             # Start production server
pnpm lint              # ESLint with auto-fix
pnpm format            # Prettier format

# Testing
pnpm test              # Run all unit tests
pnpm test -- <name>   # Run single test (e.g., pnpm test -- users)
pnpm test:watch       # Watch mode
pnpm test:cov         # Coverage report
pnpm test:e2e         # End-to-end tests
```

### Frontend Apps (auth, lynx-ui)

```bash
cd apps/auth   # or apps/lynx-ui

pnpm dev               # Start dev server
pnpm build             # Production build
pnpm lint              # Biome check
pnpm format            # Biome format (auto-fix)
```

### Database

```bash
cd packages/database

pnpm build             # Compile TypeScript
pnpm db:generate       # Generate Prisma client
pnpm db:push           # Push schema to database
```

## Code Style Guidelines

### Formatting

- **Indent**: 2 spaces (Biome/Prettier will handle this)
- **Line length**: Let formatters handle it
- **Use `pnpm format`** before committing to fix formatting issues

### TypeScript Conventions

- **Always use explicit types** for function parameters and return types
- **Enable strict mode** - avoid `any`, use `unknown` when type is uncertain
- **Use interfaces** for object shapes, types for unions/aliases
- **Avoid `as` casts** - use proper typing instead

### Naming Conventions

- **Files**: kebab-case (e.g., `user-service.ts`, `auth-config.ts`)
- **Components/Classes**: PascalCase (e.g., `UserService`, `AuthProvider`)
- **Functions/variables**: camelCase (e.g., `getUserById`, `isAuthenticated`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase without "I" prefix (e.g., `User`, not `IUser`)

### Import Organization

Order imports groups (separate with blank lines):

1. External libraries (react, next, @nestjs/\*)
2. Workspace packages (@runa/\*)
3. Relative imports (./, ../)

```typescript
// Good example
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserService } from "@runa/api";
import { Button } from "@runa/ui";
import { AuthConfig } from "../config/auth";
import { useAuth } from "./hooks/useAuth";
```

### React/Next.js Patterns

- Use **functional components** with hooks
- Use **Server Components** by default in Next.js App Router
- Place client components at `src/components/` or mark with `'use client'`
- Use **Tailwind CSS** for styling (configured in apps/auth and lynx-ui)
- Follow **React Compiler** best practices

### NestJS Patterns

- Use **dependency injection** with constructors
- Follow **SOLID principles** for services and controllers
- Use **decorators** for routing (@Get, @Post, etc.)
- Implement **guards** and **interceptors** as needed
- Use **class-validator** for DTO validation with decorators

### Error Handling

- Use **try/catch** blocks for async operations
- Throw **typed errors** (use custom exception classes in NestJS)
- Return **proper HTTP status codes**
- Log errors appropriately (use logger service in NestJS)

```typescript
// NestJS error handling example
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

- Always use **Prisma Client** from `@runa/database`
- Use **transactions** for multi-step operations
- Include **relations** eagerly when needed (use `include`)
- Handle **null** values explicitly

## Testing Guidelines

### Unit Tests (Backend)

- Place tests alongside source files with `.spec.ts` extension
- Use **Jest** with **ts-jest** transformer
- Follow AAA pattern: **Arrange**, **Act**, **Assert**
- Mock external dependencies

```typescript
describe("UserService", () => {
  it("should find user by id", async () => {
    // Arrange
    const mockUser = { id: "1", email: "test@example.com" };
    prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

    // Act
    const result = await userService.findById("1");

    // Assert
    expect(result).toEqual(mockUser);
  });
});
```

## Git Conventions

- Use **conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Keep commits **atomic** and **focused**
- Run **lint and format** before committing
- Run **tests** before pushing

## Environment Variables

- Never commit `.env` files
- Use `.env.example` as template
- Required variables documented in app READMEs

## Common Issues

### Running Tests

- Backend tests require being in the `apps/backend` directory
- Use `--` to pass arguments: `pnpm test -- users.service`

### Type Errors

- Run `pnpm check-types` from root to see all type errors
- Individual apps: `pnpm build` will show type errors

### Database

- After pulling schema changes, run `pnpm db:generate` in packages/database
- Use Prisma Studio: `npx prisma studio` in packages/database

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Biome Documentation](https://biomejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
