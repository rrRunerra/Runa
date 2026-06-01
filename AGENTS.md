# AGENTS.md - Runa Development Guide

Guidelines for agentic coding agents working in the Runa repository.

## Project Structure

```
Runa/
├── apps/
│   ├── backend/        # NestJS API server
│   ├── frontend/       # Next.js application
│   └── lynx-bot/       # Discord bot
├── packages/
│   ├── api/            # Auto-generated SDK
│   ├── auth/           # Shared auth utilities
│   ├── database/       # Prisma database client
│   └── ui/             # Shared UI components
└── turbo.json          # Turborepo configuration
```

## Code Style Guidelines

### Formatting

- **Indent**: 2 spaces
- **Line length**: Let formatters handle it

### TypeScript Conventions

- **Always use explicit types** for function parameters and return types
- **Avoid `any`**, use `unknown` when type is uncertain
- **Use interfaces** for object shapes, types for unions/aliases
- **Avoid `as` casts** - use proper typing instead

### Naming Conventions

- **Files**: kebab-case (e.g., `user-service.ts`)
- **Components/Classes**: PascalCase (e.g., `UserService`)
- **Functions/variables**: camelCase (e.g., `getUserById`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase without "I" prefix (e.g., `User`, not `IUser`)

### Import Organization

Separate import groups with blank lines:

1. External libraries (react, next, @nestjs/\*)
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

- Use **functional components** with hooks
- Use **Server Components** by default in Next.js App Router
- Mark client components with `'use client'`
- Use **Tailwind CSS** for styling

### NestJS Patterns

- Use **dependency injection** with constructors
- Follow **SOLID principles** for services/controllers
- Use **decorators** for routing (@Get, @Post, etc.)
- Use **class-validator** for DTO validation

### Error Handling

- Use **try/catch** for async operations
- Throw **typed errors** (custom exception classes in NestJS)
- Return **proper HTTP status codes**
- Log errors appropriately

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
- Include **relations** eagerly (use `include`)
- Handle **null** values explicitly

## Testing Guidelines

### Unit Tests (Backend)

- Place tests alongside source files with `.spec.ts` extension
- Use **Jest** with **ts-jest** transformer
- Follow **AAA pattern**: Arrange, Act, Assert

```typescript
describe("UserService", () => {
  it("should find user by id", async () => {
    const mockUser = { id: "1", email: "test@example.com" };
    prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
    const result = await userService.findById("1");
    expect(result).toEqual(mockUser);
  });
});
```

## Git Conventions

- Use **conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Keep commits **atomic** and **focused**
- Run **lint and format** before committing

## Common Issues

### Running Tests

- Run from `apps/backend` directory
- Use `--` to pass arguments: `pnpm test -- users.service.spec`

### Type Errors

- Run `pnpm check-types` from root for all errors
- Individual apps: `pnpm build` shows type errors

### Database

- After schema changes, run `pnpm db:generate` in packages/database
- Prisma Studio: `npx prisma studio` in packages/database

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
