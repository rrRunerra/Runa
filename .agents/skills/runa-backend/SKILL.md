---
name: runa-backend
description: Comprehensive guide for creating new Runa backend modules, services, controllers, repositories, DTOs, entities, queue services, and providers. Covers NestJS conventions, rrCode generation, error patterns, module structure, and project standards. Use when generating new backend features or refactoring existing ones.
---

# Runa Backend Development Guide

Master skill for all backend work in the Runa NestJS API. **Always read the relevant sections before writing any backend code.**

> [!IMPORTANT]
> **Skill modification rule**: Never add, edit, or remove anything in this skill without first proposing the change and getting explicit confirmation from the user.

---

## Project Structure

```
apps/backend/src/
├── common/
│   ├── decorators/       # Custom decorators (e.g. @Public)
│   ├── guards/           # Auth guards (AuthGuard)
│   └── types/            # Shared type definitions (types.d.ts)
├── modules/
│   ├── <module>/         # Feature module (kebab-case)
│   │   ├── dto/          # Input validation classes
│   │   ├── entities/     # Response shape type aliases
│   │   ├── repositories/ # Database access layer
│   │   ├── services/     # Queue services, sub-services
│   │   ├── connections/  # (optional) Provider connection logic
│   │   ├── <module>.controller.ts
│   │   ├── <module>.service.ts
│   │   └── <module>.module.ts
│   └── ...
└── providers/
    ├── cache/            # Redis/in-memory cache
    ├── database/         # Prisma service
    └── error/            # rrError, rr*Exception classes
```

---

## Creating a New Module

### Step 1: Scaffold the folder structure

```
apps/backend/src/modules/<name>/
├── dto/                  # (if the module has inputs)
├── entities/             # (if the module returns typed responses)
├── repositories/         # (if the module needs DB access)
├── services/             # (if the module needs queue/sub-services)
├── <name>.controller.ts
├── <name>.service.ts
└── <name>.module.ts
```

### Step 2: Create the Module

```typescript
import { Module } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { XxxController } from './xxx.controller';
import { XxxRepository } from './repositories/xxx.repository';
import { XxxQueueService } from './services/xxx-queue.service';

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
import { XxxRepository } from './repositories/xxx.repository';
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
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateXxxDto } from './dto/create-xxx.dto';
import { XxxEntity } from './entities/xxx.entity';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrForbiddenException, rrTooManyRequestsException } from 'src/providers/error';

@Controller('xxx')
@UseGuards(AuthGuard)
export class XxxController {
  private readonly moduleCode = 'XxCtr-';

  constructor(
    private readonly xxxService: XxxService,
    private readonly cacheService: CacheService, // only if using cooldowns
  ) {}

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }): Promise<XxxEntity> {
    return this.xxxService.search(query.name);
  }

  @Post('refresh/:id')
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
- **Always** apply `@UseGuards(AuthGuard)` at the class level.
- **Always** add `@Public()` to endpoints that should be accessible without auth.
- **Always** use entity types for return types (e.g. `Promise<XxxEntity>`).
- **Always** use DTOs for request body types.
- For permission checks, use `AquilaBitField.fromRaw()` pattern.
- For cooldown-protected endpoints, use the `cacheService` pattern shown above.

---

## Repository Pattern

### Template

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
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
// apps/backend/src/modules/xxx/dto/create-xxx.dto.ts
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
// apps/backend/src/modules/xxx/entities/xxx.entity.ts
import { Media } from '../../../common/types/types';

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
import { XxxRepository } from '../repositories/xxx.repository';

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

- **Files**: kebab-case (`user-service.ts`, `user-profile.tsx`)
- **Classes/Interfaces**: PascalCase (`UserService`, `UserProfile`)
- **Functions/variables**: camelCase (`getUserById`, `userCount`)
- **DTOs**: PascalCase with `Dto` suffix (`CreateUserDto`)
- **Entities**: PascalCase with `Entity` suffix (`UserEntity`)
- **Module directories**: kebab-case matching the module name
