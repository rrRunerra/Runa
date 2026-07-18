# `@runa/permissions`

This package defines the permission system, binary flag mappings, and verification helpers used across Runa frontend applications and backend services.

---

## 1. Bitwise Flags & Ranges

Runa uses bitwise flags stored as high-precision `bigint` values. Offset boundaries are reserved in blocks of 100 to prevent overlap:

*   **Polaris:** bits `0` - `99`
*   **Lynx:** bits `100` - `199`
*   **Aquila:** bits `200` - `299`
*   **Pegasus:** bits `300` - `399`
*   **Lacerta:** bits `400` - `499`
*   **Aquarius:** bits `500` - `599`
*   **Lyra:** bits `600` - `699`
*   **Andromeda:** bits `800` - `899`
*   *Note: 900 range offsets are strictly reserved and never used.*
*   **Global / Runa Core:** bits `10000+`

---

## 2. Feature & Permission Mapping Reference

Below is the designed roadmap for granular permission gates mapped to customizable actions in every app.

### Polaris (Dashboard & Account Central)
*   **`VIEW`**: Access main interactive constellation dashboard.
*   **`MANAGE_BOOKMARKS`**: Create, edit, and delete constellations in Workspace.
*   **`EDIT_PROFILE`**: Edit own bio, display name, and settings.
*   **`UPLOAD_ASSETS`**: Upload avatar, banner, or sidebar backgrounds.
*   **`MANAGE_FRIENDS`**: Send, accept, cancel, or decline friend requests.

### Lynx (Discord Bot Panel)
*Note: Lynx is scheduled for a full future rewrite. Current flags remain unchanged.*
*   **`VIEW`** / **`MANAGE`**
*   **`MANAGE_DATABASE`**
*   **`GUILD_CHAT`** / **`DM_CHAT`**
*   **`VIEW_LOGS`**
*   **`MANAGE_CONFIG`**

### Aquila (Media Tracker)
*   **`VIEW`**: Browse catalog and calendar views.
*   **`UPDATE_TRACKING`**: Change tracking lists status, progress, rating.
*   **`IMPORT_LIST`**: Run external collection imports.
*   **`EDIT_ANIME`** / **`EDIT_MANGA`** / **`EDIT_TV`** / **`EDIT_MOVIE`** / **`EDIT_GAME`** / **`EDIT_BOOK`**: Modify title metadata.
*   **`MEDIA_REFRESH`**: Trigger live third-party API metadata updates.

### Pegasus (Email Client)
*   **`VIEW`**: Access secure mailbox workspace.
*   **`SEND_MAIL`**: Compose, reply, and forward emails.
*   **`DOWNLOAD_ATTACHMENTS`**: Download email attachment files.
*   **`MANAGE_ACCOUNTS`**: Add, edit, or delete IMAP/SMTP accounts.

### Lacerta (Encrypted Vault)
*   **`VIEW`**: Access file explorer and public shares.
*   **`UPLOAD_FILES`**: Upload E2EE chunked documents.
*   **`MANAGE_FILES`**: Rename, delete, move, create directories.
*   **`USE_VAULT`**: Unlock and read password-secured local vault container.
*   **`SHARE_FILES`**: Generate public link or grant private file-sharing rights.
*   **`PURGE_TRASH`**: Permanently purge trash files or empty trash bin.

### Aquarius (Social / Chat Client)
*   **`VIEW`**: Enter social hubs.
*   **`SEND_MESSAGES`**: Send chat messages.
*   **`CREATE_SPACES`**: Initialize new server groups.
*   **`MODERATE_SPACES`**: Kick/ban/moderate server channels.

### Lyra (Music Library)
*   **`VIEW`**: Play library audios.
*   **`MANAGE_PLAYLISTS`**: Edit custom playlists.
*   **`MANAGE_LIBRARY`**: Edit track metadata and source paths.

### Andromeda (Wiki & Docs)
*   **`VIEW`**: Read guide categories and topics.
*   **`WRITE_DOCS`**: Create or edit pages.
*   **`DELETE_DOCS`**: Remove articles.

### Monoceros (Global Control Hub)
*   **`VIEW`**: Access administration control center.
*   **`MANAGE_CACHE`**: View/delete cache keys or flush database.
*   **`MANAGE_USERS`**: Adjust user permissions and storage limits.
*   **`READ_DATABASE`**: Browse Prisma client tables.
*   **`WRITE_DATABASE`**: Insert/edit/delete rows in database.
*   **`TRIGGER_JOBS`**: Force run maintenance scripts.

---

## 3. Usage & Helpers

### `hasPermission`
Use the `hasPermission` utility to evaluate permissions in Next.js Server Components, client panels, or NestJS endpoints:

```typescript
import { hasPermission, PolarisFlags } from "@runa/permissions";

const authorized = hasPermission(userPermissions, [PolarisFlags.VIEW, PolarisFlags.MANAGE_BOOKMARKS], "all");
```
