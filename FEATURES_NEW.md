# New Features Proposal

Planned feature additions for Runa across Aquila, Lynx, and Polaris.

---

## Priority 1: Aquila Media Tracking

### 1.1 Music Tracking

Add music/album tracking feature (currently placeholder).

**Backend:**

- `GET /music/search` - Search music by name/artist
- `GET /music/details/:id` - Get album/track details
- `POST /list/music/save` - Save to user's music list
- `DELETE /list/music/entry/:id` - Remove from list

**Database:**

- `AquilaMusic` - Music metadata (title, artist, album, cover, genres, duration)
- `AquilaMusicUserList` - User's music list with status, play count

**Frontend:**

- `/aquila/music` - Browse music
- `/aquila/music/[id]` - Music details
- `/aquila/user/[id]/music` - User's music list

### 1.2 Games Tracking

Add video game tracking feature (currently placeholder).

**Backend:**

- `GET /game/search` - Search games (use RAWG or IGDB API)
- `GET /game/details/:id` - Get game details
- `POST /list/game/save` - Save to user's game list

**Database:**

- `AquilaGame` - Game metadata (title, cover, description, platforms, genres, release date)
- `AquilaGameUserList` - User's game list (status: Playing, Completed, On Hold, Dropped, Planning)

**Frontend:**

- `/aquila/games` - Browse games
- `/aquila/games/[id]` - Game details
- `/aquila/user/[id]/games` - User's game list

### 1.3 Books Tracking

Add book tracking feature (currently placeholder).

**Backend:**

- `GET /book/search` - Search books (use Google Books API)
- `GET /book/details/:id` - Get book details

**Database:**

- `AquilaBook` - Book metadata
- `AquilaBookUserList` - User's book list

**Frontend:**

- `/aquila/books` - Browse books
- `/aquila/books/[id]` - Book details
- `/aquila/user/[id]/books` - User's book list

---

## Priority 2: Lynx Bot Expansion

### 2.1 Music Playback

Add Discord music playback feature.

**Commands:**

- `/play <song>` - Play music from YouTube/SoundCloud
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/skip` - Skip current track
- `/queue` - Show queue
- `/shuffle` - Shuffle queue
- `/loop` - Toggle loop mode

**Implementation:**

- Use discord.js-music or build with ytdl-core
- Voice channel management
- Queue system with persistence

### 2.2 Level/XP System

Add gamification for server members.

**Commands:**

- `/rank` - Show user's current level and XP
- `/leaderboard` - Server leaderboard

**Features:**

- XP earned from messages (rate-limited)
- Level roles (auto-assign roles at certain levels)
- Configurable XP per message
- Optional leveling channels (only earn XP in specific channels)

**Database:**

- `LynxUserXP` - User XP per guild (userId, guildId, xp, level)
- `LynxLevelRole` - Level to role mappings

### 2.3 Welcome/Goodbye Messages

Automated messages for new/leaving members.

**Commands:**

- `/welcome set #channel` - Set welcome channel
- `/welcome message <text>` - Custom welcome message
- `/goodbye set #channel` - Set goodbye channel
- `/goodbye message <text>` - Custom goodbye message
- `/welcome test` - Test welcome message

**Features:**

- Variable support: `{user}`, `{member}`, `{guild}`, `{count}`
- Embed customization
- Image attachments

**Database:**

- `LynxWelcomeConfig` - Welcome settings per guild
- `LynxGoodbyeConfig` - Goodbye settings per guild

### 2.4 Reaction Roles

Allow users to self-assign roles via reactions.

**Commands:**

- `/reactionroles create <message> <emoji> <role>` - Create reaction role message
- `/reactionroles delete <messageId>` - Remove reaction role
- `/reactionroles list` - Show all reaction roles

**Database:**

- `LynxReactionRole` - Reaction role configs (guildId, messageId, emoji, roleId)

### 2.5 Ticket System

Support ticket management for servers.

**Commands:**

- `/ticket create` - Create new ticket
- `/ticket close` - Close current ticket
- `/ticket add <user>` - Add user to ticket
- `/ticket remove <user>` - Remove user from ticket

**Features:**

- Automatic ticket channel creation
- Staff tag support
- Transcript on close

**Database:**

- `LynxTicket` - Ticket entity (guildId, userId, channelId, status, createdAt)

### 2.6 Auto-Moderation

AI-powered moderation for spam, links, caps.

**Features:**

- Spam detection (rapid messages)
- Link filtering (configurable allow/block)
- Caps lock detection
- Profanity filter
- Configurable actions: delete, warn, mute, kick, ban

**Commands:**

- `/automod enable` - Enable auto-mod
- `/automod config <setting> <value>` - Configure rules

---

## Priority 3: Polaris/Auth Improvements

### 3.1 Social Login

Add OAuth providers for easier authentication.

**Providers:**

- Discord (link with Lynx)
- Google
- GitHub

**Backend:**

- `GET /auth/discord` - Discord OAuth flow
- `GET /auth/google` - Google OAuth flow
- `GET /auth/github` - GitHub OAuth flow
- Callback handlers for each

**Frontend:**

- Add login buttons on `/polaris/login`
- Link accounts on `/polaris/connections`

### 3.2 Two-Factor Authentication

Add 2FA for account security.

**Backend:**

- `POST /auth/2fa/enable` - Enable 2FA (generate secret, verify code)
- `POST /auth/2fa/disable` - Disable 2FA (verify code first)
- `POST /auth/2fa/verify` - Verify 2FA code on login

**Implementation:**

- Use speakeasy for TOTP
- Store encrypted secret in database
- QR code generation for authenticator apps
- Backup codes (single-use)

### 3.3 Enhanced User Profiles

Rich profile customization.

**Backend:**

- `PUT /user/profile` - Update profile (bio, banner, theme)
- `PUT /user/settings` - Update account settings

**Features:**

- Custom bio (max 500 chars)
- Profile banner image
- Theme selection (color scheme)
- Display options (show activity, show list)

**Frontend:**

- Profile editor on `/polaris/dash`
- Public profile enhancements on `/aquila/user/[id]`

### 3.4 User Activity Timeline

Show user's media journey.

**Features:**

- "Started watching X" events
- "Completed X" events
- "Reviewed X" events
- "Re-watched X" events

**Backend:**

- `GET /user/:id/activity` - Get activity timeline
- `POST /activity` - Log activity (triggered by list updates)

**Database:**

- `UserActivity` - Activity events with timestamps

---

## Implementation Order

| Phase | Features                             | Estimated Effort |
| ----- | ------------------------------------ | ---------------- |
| 1     | Music/Games/Books tracking           | Medium           |
| 2     | User reviews & ratings               | Medium           |
| 3     | Social features (follow, feed)       | High             |
| 4     | Music playback (Lynx)                | High             |
| 5     | Level/XP system                      | Medium           |
| 6     | Welcome/Goodbye messages             | Medium           |
| 7     | Reaction roles                       | Low              |
| 8     | Ticket system                        | Medium           |
| 9     | Auto-moderation                      | Medium           |
| 10    | Social login (Discord/Google/GitHub) | Medium           |
| 11    | Two-factor authentication            | Medium           |
| 12    | Enhanced profiles                    | Low              |
| 13    | Activity timeline                    | Low              |

---

## Technical Considerations

- Music/Games/Books use similar patterns to existing Anime/Manga - can reuse service structure
- For external APIs: RAWG for games, Google Books for books, Spotify/Last.fm for music
- Lynx features need Discord.js voice support and persistent storage
- 2FA requires secure secret storage - consider encryption at rest
- Social features need pagination for feeds and efficient queries
