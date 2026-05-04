# Runa - Feature Overview

Runa is a full-stack application with a Next.js frontend, NestJS backend, and Discord bot. The platform consists of three main sections: **Polaris** (authentication), **Aquila** (media tracking), and **Lynx** (Discord bot management).

---

## 1. Polaris - Authentication & User Management

### User Registration & Login

- **Email/password registration** with username
- **Session-based authentication** via NextAuth.js
- Role-based access control: `USER`, `MODERATOR`, `ADMIN`
- Password hashing with bcrypt
- Private profile option

### API Key Management

- Create, list, regenerate, and delete API keys
- Key prefix for identification
- Last-used tracking

### Frontend Pages

- `/polaris/login` - Login page
- `/polaris/register` - Registration page
- `/polaris/dash` - User dashboard

---

## 2. Aquila - Media Tracking

A media tracking platform for anime, manga, movies, and TV shows with support for third-party integrations.

### Anime Tracking

- Search anime by name
- View anime details (title, cover, description, episodes, genres, status, format)
- User anime list with statuses: Planning, Watching, Completed, On Hold, Dropped
- Track progress (episodes watched), scores, notes, rewatch count

### Manga Tracking

- Search manga by name
- View manga details (title, cover, description, chapters, volumes, genres)
- User manga list with statuses: Planning, Reading, Completed, On Hold, Dropped
- Track chapters read, volumes, scores, notes

### Movie Tracking

- Search movies from TVDb
- View movie details (title, cover, description, runtime, cast)
- User movie list with statuses: Planning, Completed, Dropped

### TV Show Tracking

- Search TV shows from TVDb
- View TV show details (title, cover, description, seasons, cast, trailers)
- Status and runtime information

### Third-Party Connections (OAuth)

- **AniList** integration
- **MyAnimeList (MAL)** integration
- **SIMKL** integration
- Link/unlink accounts via OAuth flow
- Sync progress between connected services

### Frontend Pages

- `/aquila/browse` - Browse all media types
- `/aquila/anime` - Anime listing and search
- `/aquila/manga` - Manga listing and search
- `/aquila/movies` - Movies listing and search
- `/aquila/tv` - TV shows listing and search
- `/aquila/user/[id]` - User profile with media lists
- `/aquila/user/[id]/connections` - Manage linked accounts
- Individual detail pages for each media item

---

## 3. Lynx - Discord Bot Management

A comprehensive Discord bot with moderation tools and server management features.

### Moderation Commands

| Command     | Description                                            |
| ----------- | ------------------------------------------------------ |
| `/ban`      | Ban users with optional duration (temp ban) and reason |
| `/kick`     | Kick users from server with reason                     |
| `/clear`    | Bulk delete messages (1-100), filter by user/role/bot  |
| `/lock`     | Lock channel (deny SEND_MESSAGES for @everyone)        |
| `/unlock`   | Unlock channel                                         |
| `/slowmode` | Set slowmode duration (0-21600 seconds)                |
| `/restore`  | Restore previously cleared messages                    |

### Role Management

- `/role add` - Add role to user
- `/role remove` - Remove role from user
- `/role info` - View role information

### Logging & History

- **Ban history** - Track all bans with moderator, reason, duration
- **Kick history** - Track all kicks with moderator and reason
- **Message clearing** - Archive deleted messages with batch IDs
- **General logs** - INFO, WARN, ERROR, DEBUG, VERBOSE levels

### Backend Features

- Command registration and handler system
- Event system for Discord events
- Cron job scheduling
- Direct message handling
- Guild message streaming

### Frontend Pages

- `/lynx` - Bot overview
- `/lynx/commands` - List all available commands
- `/lynx/commands/[name]` - Command details
- `/lynx/events` - List all events
- `/lynx/events/[name]` - Event details
- `/lynx/crons` - List scheduled cron jobs
- `/lynx/crons/[name]` - Cron job details
- `/lynx/apis` - API endpoints list
- `/lynx/apis/[type]` - API details
- `/lynx/logs` - Log viewer with filters (all, info, warn, error, debug, verbose)
- `/lynx/config` - Bot configuration
- `/lynx/config/homework` - Homework configuration
- `/lynx/databases` - Database viewer
- `/lynx/databases/[database]` - Database details
- `/lynx/chat` - Chat interface
- `/lynx/chat/dms` - Direct messages
- `/lynx/chat/guilds` - Guild chat views

---

## 4. Database Models

### User Management

- `User` - Core user entity with auth info, roles, profile
- `ApiKey` - API keys for programmatic access
- `Connections` - Linked third-party accounts

### Aquila Media

- `AquilaAnime` - Anime metadata with AniList/MAL IDs
- `AquilaAnimeUserList` - User's anime list entries
- `AquilaManga` - Manga metadata
- `AquilaMangaUserList` - User's manga list entries
- `AquilaMovie` - Movie metadata from TVDb
- `AquilaMovieUserList` - User's movie list entries
- `AquilaTv` - TV show metadata from TVDb

### Lynx Moderation

- `LynxBanHistory` - Ban records with duration tracking
- `LynxKickHistory` - Kick records
- `LynxClearBatch` - Message clearing batches
- `LynxClearedMessage` - Archived deleted messages
- `LynxLogs` - General logging table
- `LynxHomeWorkChannels` - Homework channel configuration
- `LynxHomeworkExists` - Homework tracking
- `LynxRngRigConfig` - RNG configuration

---

## 5. Technology Stack

### Frontend

- Next.js 16 (App Router)
- React 19 with React Compiler
- Tailwind CSS v4
- NextAuth.js for authentication
- Base UI, Radix UI components
- Recharts for data visualization

### Backend

- NestJS 11
- Prisma ORM with PostgreSQL
- class-validator for DTOs
- Swagger for API documentation
- JWT authentication

### Bot

- Discord.js
- Custom command/event handler system
- Cron job support

### Infrastructure

- Turborepo for monorepo management
- pnpm workspace
- dotenvx for environment management

---

## 6. Planned/In Development Features

The following features have frontend routes but are not yet fully implemented:

- Music tracking (`/aquila/music`)
- Games tracking (`/aquila/games`)
- Books tracking (`/aquila/books`)
- Homework sync from EduPage
- Event system
- Database management UI
