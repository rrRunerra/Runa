# Runa

A modern, full-stack monorepo built with **Turborepo**, featuring a NestJS backend, Next.js frontend, and Discord bot integration.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (recommended) or npm/yarn
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/rrRunerra/Runa.git
cd Runa

# Install dependencies
pnpm install
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start a specific app
pnpm dev --filter=frontend
pnpm dev --filter=backend
```

### Build

```bash
# Build all apps and packages
pnpm build

# Build a specific app
pnpm build --filter=backend
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific app
pnpm test --filter=backend
```

## 📁 Project Structure

```
Runa/
├── apps/
│   ├── backend/        # NestJS API server
│   ├── frontend/       # Next.js web application
│   └── lynx-bot/       # Discord bot
├── packages/
│   ├── api/            # Auto-generated SDK
│   ├── auth/           # Shared authentication utilities
│   ├── database/       # Prisma database client
│   └── ui/             # Shared UI component library
└── turbo.json          # Turborepo configuration
```

## 🏗️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js, React, Tailwind CSS, TypeScript |
| **Backend** | NestJS, Prisma, TypeScript |
| **Database** | Prisma ORM |
| **Bot** | Discord.js, TypeScript |
| **Build System** | Turborepo, pnpm |
| **Code Quality** | ESLint, Prettier, TypeScript |

### Language Composition
- **TypeScript**: 97.5%
- **CSS**: 1.6%
- **Other**: 0.9%

## 📚 Key Features

### Backend (NestJS)
- RESTful API with TypeScript
- Database ORM with Prisma
- Authentication and authorization
- Dependency injection architecture
- Comprehensive error handling

### Frontend (Next.js)
- Server Components by default
- Responsive UI with Tailwind CSS
- Type-safe with TypeScript
- Optimized performance and SEO

### Shared Packages
- **@runa/database**: Prisma client and migrations
- **@runa/auth**: Authentication utilities
- **@runa/ui**: Reusable React components
- **@runa/api**: Auto-generated SDK

## 📖 Coding Standards

See [AGENTS.md](./AGENTS.md) for comprehensive development guidelines:

### TypeScript Conventions
- Explicit types for all function parameters and returns
- Use `unknown` instead of `any`
- Interfaces for object shapes, types for unions
- No `as` casts—use proper typing

### Naming Conventions
- **Files**: kebab-case (`user-service.ts`)
- **Components/Classes**: PascalCase (`UserService`)
- **Functions/Variables**: camelCase (`getUserById`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Code Organization
```typescript
// Import order:
import { external } from "external-lib";      // External libraries
import { Utility } from "@runa/database";     // Workspace packages
import { helper } from "../helpers";          // Relative imports
```

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
pnpm test --filter=backend

# Watch mode
pnpm test --filter=backend -- --watch

# Coverage
pnpm test:cov --filter=backend
```

Tests use **Jest** with **ts-jest** and follow the **AAA pattern** (Arrange, Act, Assert).

## 🗄️ Database

### Prisma Setup
```bash
# Generate Prisma client
pnpm db:generate --filter=database

# Run migrations
pnpm db:migrate --filter=database

# Open Prisma Studio
cd packages/database
npx prisma studio
```

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all code |
| `pnpm format` | Format code with Prettier |
| `pnpm check-types` | Type check all TypeScript |

## 🚀 Deployment

### Frontend (Vercel Recommended)
```bash
# Deploy Next.js frontend to Vercel
# Connected via GitHub for automatic deployments
```

### Backend (Docker/Cloud)
```bash
# Build production image
docker build -t runa-backend apps/backend
```

## 📖 Documentation

- [AGENTS.md](./AGENTS.md) - Development guide for coding agents
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Turborepo Documentation](https://turborepo.dev)

## 🐛 Troubleshooting

### Type Errors
```bash
# Check all type errors
pnpm check-types

# Type check specific app
pnpm build --filter=backend
```

### Database Issues
```bash
# After schema changes
pnpm db:generate --filter=database

# Reset database
cd packages/database
npx prisma migrate reset
```

### Dependency Issues
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📝 Git Conventions

Follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Build, dependencies, configuration
- `docs:` - Documentation
- `refactor:` - Code improvements
- `test:` - Tests

Example:
```bash
git commit -m "feat: add user authentication"
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Follow the guidelines in [AGENTS.md](./AGENTS.md)
2. Ensure code passes linting and type checking
3. Write tests for new features
4. Use conventional commits
5. Create a pull request with a clear description

## 🔗 Related Resources

- [Turborepo Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [NestJS Best Practices](https://docs.nestjs.com/first-steps)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
