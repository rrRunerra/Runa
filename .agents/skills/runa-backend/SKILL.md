---
name: runa-backend
description: Comprehensive guide for creating new Runa backend modules, services, controllers, repositories, DTOs, entities, queue services, and providers. Covers NestJS conventions, rrCode generation, error patterns, module structure, and project standards. Use when generating new backend features or refactoring existing ones.
---

# Runa Backend Development Guide

Master skill for all backend work in the Runa NestJS API. **Always read the relevant sections before writing any backend code.**

> [!IMPORTANT]
> **Skill modification rule**: Never add, edit, or remove anything in this skill without first proposing the change and getting explicit confirmation from the user.

---

## External Skill References

These skills provide deeper guidance for specific backend architectures. Consult them when designing NestJS systems:

| Skill | When to use |
|---|---|
| [nestjs-best-practices](./../nestjs-best-practices/SKILL.md) | **Always active** when writing, refactoring, or reviewing NestJS modules to ensure solid architecture, security, and DI design patterns. |

---

## Project Structure

```
apps/backend/src/
├── common/
│   ├── decorators/       # Custom decorators (e.g. @Public)
│   ├── guards/           # Auth guards (AuthGuard)
│   └── types/            # Shared type definitions (types.d.ts)
├── modules/
│   ├── <module>/         # Feature module (kebab-case, completely flat)
│   │   ├── <module>.controller.ts
│   │   ├── <module>.service.ts
│   │   ├── <module>.repository.ts
│   │   ├── <module>.dto.ts
│   │   ├── <module>.entities.ts
│   │   ├── <module>.types.ts
│   │   └── <module>.module.ts
│   └── ...
└── providers/
    ├── cache/            # Redis/in-memory cache
    ├── database/         # Prisma service
    └── error/            # rrError, rr*Exception classes
```

---

## Creating a New Module

### Step 1: Scaffold the flat folder structure

```
apps/backend/src/modules/<name>/
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.repository.ts
├── <name>.dto.ts
├── <name>.entities.ts
├── <name>.types.ts
└── <name>.module.ts
```

### Step 2: Create the Module

```typescript
import { Module } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { XxxController } from './xxx.controller';
import { XxxRepository } from './xxx.repository';
import { XxxQueueService } from './xxx-queue.service';

@Module({
  controllers: [XxxController],
  providers: [XxxService, XxxRepository, XxxQueueService],
  exports: [XxxService], // export if consumed by other modules
})
export class XxxModule {}
```

---

## Module Code (rrCode Prefix) Convention

Every service, controller, repository, and queue service needs a `moduleCode` string used as the prefix for all rr* exceptions.

### Code generation rule

Take the **first letter + last letter** of the module prefix (the word before the class type suffix), then append the class type code:

| Class Type      | Suffix  | Example Class           | moduleCode   |
|-----------------|---------|-------------------------|--------------|
| Service         | `Sve`   | `AnimeService`          | `AeSve-`     |
| Controller      | `Ctr`   | `AnimeController`       | `AeCtr-`     |
| Repository      | `Rpsty` | `AnimeRepository`       | `AeRpsty-`   |
| QueueService    | `QeSve` | `AnimeQueueService`     | `AeQeSve-`   |
| Gateway         | `Ga`    | `NotificationGateway`   | `NoGa-`      |

Always ends with `-`.

```typescript
// In every class that throws rr* exceptions:
private readonly moduleCode = 'AeSve-';
```

---

## Service Pattern

### Template

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { XxxRepository } from './xxx.repository';
import { rrNotFoundException } from 'src/providers/error';

@Injectable()
export class XxxService {
  private readonly logger = new Logger(XxxService.name);
  private readonly moduleCode = 'XxSve-';

  constructor(
    private readonly xxxRepository: XxxRepository,
  ) {}

  public async getById(id: string): Promise<XxxEntity> {
    const record = await this.xxxRepository.findById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}NF001`, {
        message: `Xxx with ID ${id} not found`,
      });
    }
    return record;
  }
}
```

### Rules
- **Always** add `private readonly moduleCode` with the proper prefix.
- **Always** add explicit return types on every function.
- **Always** accept DTOs for input data — create a DTO class if one doesn't exist.
- **Always** use `rr*Exception` classes — never throw generic `Error` or NestJS exceptions directly.
- Use `private readonly logger = new Logger(XxxService.name)` for logging.

---

## Controller Pattern

### Template

```typescript
import { Controller, Get, Post, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { CreateXxxDto } from './xxx.dto';
import { XxxEntity } from './xxx.entities';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrForbiddenException, rrTooManyRequestsException } from 'src/providers/error';

@Controller('xxx')
export class XxxController {
  private readonly moduleCode = 'XxCtr-';

  constructor(
    private readonly xxxService: XxxService,
    private readonly cacheService: CacheService, // only if using cooldowns
  ) {}

  @Get('search')
  async search(@Query() query: { name: string }): Promise<XxxEntity> {
    return this.xxxService.search(query.name);
  }

  @Post('refresh/:id')
  @UseGuards(AuthGuard) // Apply guard at the method level
  async refresh(
    @Param('id') id: string,
    @Req() req: Request & { user: { permissions: number[] } },
  ): Promise<XxxEntity> {
    const bitfield = AquilaBitField.fromRaw(req.user['permissions']);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new rrForbiddenException(`${this.moduleCode}YDNHPTRM001`, {
        message: 'You do not have permission to refresh media',
      });
    }
    // Optional cooldown pattern
    const cooldownKey = `cooldown:refresh:xxx:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message: 'This media was refreshed recently.',
      });
    }
    const result = await this.xxxService.getById(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
```

### Rules
- **Never** apply `@UseGuards(AuthGuard)` at the class level. Apply auth/permission guards selectively at the method/handler level to align with the public-first routing architecture.
- **Strict Parameter Validation**: Every single parameter (e.g. `@Param('id')`), query parameter (`@Query()`), request body (`@Body()`), or properties injected/passed into controller methods **MUST** have its own dedicated DTO class with class-validator validation decorators. Never use unvalidated raw primitives (like `string`, `number`) directly without a validation DTO.
- **Always** use entity types for return types (e.g. `Promise<XxxEntity>`).
- For permission checks, use `AquilaBitField.fromRaw()` pattern.
- For cooldown-protected endpoints, use the `cacheService` pattern shown above.

---

## Repository Pattern

### Template

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';

@Injectable()
export class XxxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<any> {
    return this.prisma.client.aquilaXxx.findUnique({
      where: { id },
    });
  }

  async upsert(
    externalId: number,
    data: Prisma.AquilaXxxCreateInput | Prisma.AquilaXxxUpdateInput,
  ): Promise<any> {
    return this.prisma.client.aquilaXxx.upsert({
      where: { externalId },
      update: data,
      create: data as Prisma.AquilaXxxCreateInput,
    });
  }

  toMedia(dbRecord: any): Media {
    return { /* map DB fields to Media shape */ };
  }
}
```

---

## DTO Pattern

DTOs use `class-validator` decorators for validation.

```typescript
// apps/backend/src/modules/xxx/xxx.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateXxxDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  score?: number;
}
```

---

## Entity Pattern

Entities are type aliases that reference shared types for response shapes.

```typescript
// apps/backend/src/modules/xxx/xxx.entities.ts
import { Media } from '../../common/types/types';

export type XxxEntity = Media;
```

If the entity is just an alias to an existing type, use it directly. Do NOT create entities that just re-export — use the source type where it's consumed.

---

## Queue Service Pattern

For background processing with concurrency control:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { XxxRepository } from '../xxx.repository';

@Injectable()
export class XxxQueueService implements OnModuleInit {
  private readonly logger = new Logger(XxxQueueService.name);
  private readonly moduleCode = 'XxQeSve-';
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly xxxRepository: XxxRepository) {}

  onModuleInit(): void {
    this.processQueue();
  }

  addJob(externalId: number): void {
    if (!this.processing.has(externalId)) {
      this.jobQueue.next(externalId);
    }
  }

  private processQueue(): void {
    this.jobQueue
      .pipe(
        mergeMap(async (id) => { /* process with concurrency */ }, 1),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
```

---

## rrCode Generation for Exceptions

The rrCode = `moduleCode + errorCode + 3-digit-number`

**errorCode**: Take the first letter of each word in the error message.

| Error Message                         | errorCode    |
|---------------------------------------|--------------|
| "ID must be a number"                | `IMBAN`      |
| "Anime not found"                    | `ANF`        |
| "User not found"                     | `UNF`        |
| "You do not have permission to ..."  | `YDNHPTRM`   |
| "This media was refreshed recently"  | `TMWRR`      |
| "Invalid game ID"                    | `IGI`        |

Always end with `001`, incrementing if the same errorCode is used in the same class.

```typescript
throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
  message: 'User not found',
});
```

---

## Exception Reference

Import from `src/providers/error`:

| NestJS Exception                  | rr* Equivalent                     | Status |
|-----------------------------------|------------------------------------|--------|
| `new Error(...)`                  | `rrInternalServerErrorException`   | 500    |
| `new BadRequestException(...)`    | `rrBadRequestException`            | 400    |
| `new UnauthorizedException(...)`  | `rrUnauthorizedException`          | 401    |
| `new ForbiddenException(...)`     | `rrForbiddenException`             | 403    |
| `new NotFoundException(...)`      | `rrNotFoundException`              | 404    |
| `new ConflictException(...)`      | `rrConflictException`              | 409    |
| `new UnprocessableEntityException(...)` | `rrUnprocessableEntityException` | 422    |
| `new TooManyRequestsException(...)`     | `rrTooManyRequestsException`   | 429    |
| `new InternalServerErrorException(...)`  | `rrInternalServerErrorException` | 500 |

Constructor signature:
```typescript
throw new rrNotFoundException(
  `${this.moduleCode}CODE001`,   // rrCode: string (first arg)
  { message: 'Error text' }     // options: object with optional message, description, cause
);
```

---

## Import Organization

Separate import groups with blank lines:

```typescript
import { Injectable, Logger } from '@nestjs/common';    // 1. External libraries
import { AquilaBitField } from '@runa/permissions';      // 2. Workspace packages (@runa/*)
import { rrNotFoundException } from 'src/providers/error'; // 3. Providers (src/providers/*)
import { AuthGuard } from '../../common/guards/auth.guard'; // 4. Common
import { XxxService } from './xxx.service';               // 5. Relative (current module)
```

---

## Common Patterns
## Permissions Guard

A reusable `@Permissions()` guard for checking user permissions on endpoints.

### Decorator

```typescript
// apps/backend/src/common/decorators/permissions.decorator.ts
import { Permissions } from '../../common/decorators/permissions.decorator';
```

### Usage

```typescript
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('xxx')
@UseGuards(AuthGuard, PermissionsGuard) // AuthGuard must run first
@UseGuards(AuthGuard)
export class XxxController {

  // User must have ALL specified permissions
  @Post('refresh/:id')
  @Permissions(['MEDIA_REFRESH'], 'all')
  async refresh(@Param('id') id: string) { ... }

  // User must have ANY of the specified permissions
  @Post('admin-action')
  @Permissions(['MANAGE', 'ADMINISTRATOR'], 'any')
  async adminAction() { ... }
}
```

### How it works

1. `@Permissions()` sets metadata on the handler with the required flags and operator.
2. `PermissionsGuard` reads the metadata and checks the user's `request.user.permissions` (`number[]`) against a merged map of all constellation flags.
3. Operator `'all'` → user must have **every** specified flag.
4. Operator `'any'` → user must have **at least one** specified flag.
5. `ADMINISTRATOR` flag automatically passes all checks.

### Available Flags

Flags are defined in `@runa/permissions` across constellations:

| Constellation | Flags                                          | Bit Range |
|---------------|------------------------------------------------|-----------|
| Polaris       | `VIEW`, `MANAGE`                               | 0-99      |
| Lynx          | `VIEW`, `MANAGE`, `MANAGE_DATABASE`, `GUILD_CHAT`, `DM_CHAT`, `VIEW_LOGS`, `MANAGE_CONFIG` | 100-199 |
| Aquila        | `VIEW`, `MANAGE`, `EDIT_ANIME`, `EDIT_MANGA`, `EDIT_MOVIE`, `EDIT_TV`, `EDIT_GAME`, `EDIT_BOOK`, `IMPORT_LIST`, `MEDIA_REFRESH` | 200-299 |
| Pegasus       | `VIEW`                                          | 300-399   |
| Lacerta       | `VIEW`                                          | 400-499   |
| Aquarius      | `VIEW`                                          | 500-599   |
| Lyra          | `VIEW`                                          | 600-699   |
| Monoceros     | `VIEW`                                          | 700-799   |
| Andromeda     | `VIEW`, `MANAGE`                                | 800-899   |
| Runa          | `ADMINISTRATOR`, `LOGGED_IN`                    | 10000+    |
```typescript
const cooldownKey = `cooldown:refresh:xxx:${id}`;
const onCooldown = await this.cacheService.get(cooldownKey);
if (onCooldown) {
  throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
    message: 'This media was refreshed recently.',
  });
}
await this.cacheService.set(cooldownKey, true, 60);
```

### Public Endpoint
```typescript
import { Public } from 'src/common/decorators/public.decorator';

@Public()
@Get('search')
async search(...) { ... }
```

### Cron Jobs
```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_MINUTE)
async handleCron(): Promise<void> { ... }
```

---

## Shared Types

Located at `apps/backend/src/common/types/types.d.ts`. Contains:

- `Media` — unified media type with all optional fields
- `SearchMedia` — search result shape
- `MediaRelation`, `MediaCharacter`, `MediaTrailer`, `MediaStudio`, `MediaSeason`, `MediaEpisode` — sub-types
- `SearchMediaItem`, `SearchApiResponse` — external search API shapes

Add new shared interfaces here, one interface per logical type. If a type is only used within a single module, define it locally.

---

## Insomnia Documentation

After creating new endpoints, add them to `apps/backend/Runa-Insomnia.json` following the existing pattern:

- **Public endpoints** → single request, no auth headers
- **Protected endpoints** → two requests: API Key variant (`x-api-key: {{api_key}}`) and Session variant (`Authorization: Bearer {{session_token}}`)
- All requests use `{{base_url}}` variable

---

## Naming Conventions

- **Module Files**: Flat `<module-name>.<type>.ts` format (e.g. `user.service.ts`, `user.controller.ts`, `user.repository.ts`, `user.dto.ts`, `user.entities.ts`, `user-queue.service.ts`).
- **Classes/Interfaces**: PascalCase (`UserService`, `UserProfile`).
- **Functions/variables**: camelCase (`getUserById`, `userCount`).
- **DTOs**: PascalCase with `Dto` suffix inside `<module>.dto.ts` (e.g. `CreateUserDto`).
- **Entities**: PascalCase with `Entity` suffix inside `<module>.entities.ts` (e.g. `UserEntity`).
- **Module directories**: kebab-case matching the module name.

---

## Core Backend Development Rules

### Planning & Execution
- **Detailed Plan**: Always inform the user in detail about what you are going to do, and always present a plan before execution.
- **Performance & UX**: Performance and responsiveness are the #1 concern for every backend change.
- **Configurability & Network**: Ensure features are highly configurable and fully usable both on a local network (LAN/offline environments) and through the internet.

### Controller & DTO Input Validation
- **Strict Parameter DTOs**: Every single parameter (e.g. `@Param('id')`), query parameter (`@Query()`), request body (`@Body()`), or property passed into controller endpoints must have its own dedicated DTO validation class with `class-validator` decorators. Never use unvalidated raw primitives (e.g. `string` or `number`) directly in controller arguments.

### Public-First Routing Architecture
- **No Class-Level Auth Guards**: Do not apply `@UseGuards(AuthGuard)` at the controller class level. Default all routes to public.
- **Selective Method Guards**: Apply `@UseGuards(AuthGuard)` and `@Permissions(...)` guards selectively at the method/handler level for endpoints requiring authentication or specific privileges.
- **Conditional Data Rendering**: If a public route returns optional user-specific fields, retrieve the session dynamically and serialize/strip fields conditionally without rejecting anonymous visitors.

### Centralized Constants & Cache Keys
- **Centralized Constants**: Keep all backend constants in `apps/backend/src/common/constants.ts` using uppercase names. Minimize magic strings across services.
- **Centralized Cache Keys**: Place all Redis and cache keys in `apps/backend/src/common/cache-keys.ts` with standard uppercase exported constants.

### Sensitive Data Encryption
- **Post-Quantum Encryption**: All sensitive user data stored in the database must be encrypted.
- **Crypto Service**: Use a dedicated NestJS Crypto service wrapper over the `@runa/crypto` package to encrypt/decrypt fields before database operations.

### Error Handling & rrCodes
- **Strict rrError Exceptions**: Never throw generic `Error` or native NestJS HTTP exceptions directly. Only throw `rr*` equivalent exceptions from `src/providers/error` (e.g. `rrNotFoundException`, `rrBadRequestException`).
- **Unique rrCodes**: Every exception thrown must include a unique `rrCode` following the pattern `moduleCode + errorCode + 3-digit-number`. Generate the `errorCode` using the first letter of every word in the error message (e.g. "User not found" -> `UNF`, "This media was refreshed recently" -> `TMWRR`), prefix with the class `moduleCode`, and append a unique 3-digit number starting at `001`.

### Automation & Scripting
- **Repeated Tasks**: If any manual workflow, setup, code generation, or migrations are repeated, automate them with a script placed in the `rrScripts/` directory.

### Feature Documentation
- **Always Document Features**: Always document every new feature or major change. Create or update the walkthrough, write clean inline comments/docstrings, and add or update markdown references.


