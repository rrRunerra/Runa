# Runa API Endpoints Documentation

This document lists all available backend API endpoints, grouped by their modules/controllers. 
Unless marked as **Public (No Auth)**, all endpoints require authentication (JWT or session token) via the `AuthGuard`.

---

## 1. Auth Module (`/auth`)

Authentication, Multi-Factor Authentication (MFA), Passkeys, and Login Codes.

### `POST /auth/login`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 10 requests per minute
- **Body (`LoginAuthDto`)**:
  - `identifier` (optional, string): Email or Username
  - `password` (optional, string): Account password
  - `mfaSuccessToken` (optional, string): Token received after first-stage login if MFA is enabled
  - `passkeyResponse` (optional, string): Stringified passkey authentication credential
  - `isPasskeyOnly` (optional, string)
  - `isLoginCode` (optional, string)
  - `loginCode` (optional, string)
- **Returns**: `AuthResponseEntity` (token, user details) or `MfaRequiredEntity` (MFA challenge info)

### `POST /auth/mfa/send-email-code`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 5 requests per minute
- **Body**:
  - `tempToken` (string, required): Temporary token from login response
- **Returns**: `{ success: boolean }`

### `POST /auth/mfa/device/send`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 5 requests per minute
- **Body**:
  - `tempToken` (string, required): Temporary token from login response
  - `deviceId` (string, required): Registered device identifier
- **Returns**: `{ success: boolean }`

### `POST /auth/mfa/verify`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 10 requests per minute
- **Body**:
  - `tempToken` (string, required): Temporary token from login response
  - `method` (string, required): MFA method ('EMAIL', 'TOTP', 'PASSKEY', or 'DEVICE')
  - `code` (string, optional): One-time verification code
  - `passkeyResponse` (object, optional): SimpleWebAuthn AuthenticationResponseJSON
- **Returns**: `MfaVerifyEntity` (token and auth status)

### `POST /auth/passkey/login-options`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 10 requests per minute
- **Body**:
  - `identifier` (string, optional): Email or Username
- **Returns**: SimpleWebAuthn `PublicKeyCredentialRequestOptionsJSON` object

### `POST /auth/passkey/login-verify`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 10 requests per minute
- **Body**:
  - `identifier` (string, optional): Email or Username
  - `passkeyResponse` (object, required): SimpleWebAuthn AuthenticationResponseJSON
- **Returns**: `AuthResponseEntity`

### `POST /auth/login-code/generate`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 5 requests per minute
- **Returns**: `LoginCodeEntity` (code and expiry)

### `GET /auth/login-code/status`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 60 requests per minute
- **Query**:
  - `code` (string, required): Login code
- **Returns**: `LoginCodeStatusEntity` (status and session details if linked)

### `POST /auth/login-code/link`
- **Auth Required**: Yes
- **Body (`LinkLoginCodeDto`)**:
  - `code` (string, required): Code to link to current user's session
- **Returns**: `{ success: boolean }`

---

## 2. User Module (`/users`)

User account management, MFA settings, devices, E2EE keys, public lookups, and API key management.

### `POST /users`
- **Auth Required**: No (Public)
- **Rate Limit**: Max 1 request per minute
- **Body (`CreateUserDto`)**:
  - `email` (string, required, valid email, max 255 chars, lowercase)
  - `username` (string, required, 3-32 chars, lowercase, numbers, underscores)
  - `password` (string, required, 16-64 chars, min 2 numbers, 1 uppercase, 1 special char)
- **Returns**: `User`

### `PUT /users/me`
- **Auth Required**: Yes
- **Body (`UpdateUserDto`)**:
  - `displayName` (string, optional, max 64 chars)
  - `email` (string, optional, valid email, max 255 chars, lowercase)
  - `currentPassword` (string, optional)
  - `newPassword` (string, optional, 16-64 chars, min 2 numbers, 1 uppercase, 1 special char)
  - `avatarUrl` (string, optional)
  - `bannerUrl` (string, optional)
  - `sidebarCardBackgroundUrl` (string, optional)
- **Returns**: Updated `User`

### `GET /users/me/privacy`
- **Auth Required**: Yes
- **Returns**: `PrivacySettings`

### `PUT /users/me/privacy`
- **Auth Required**: Yes
- **Body (`PrivacySettingsDto`)**:
  - `profile` (boolean, optional)
  - `animeList` (boolean, optional)
  - `mangaList` (boolean, optional)
  - `tvList` (boolean, optional)
  - `movieList` (boolean, optional)
  - `connections` (boolean, optional)
- **Returns**: `SuccessEntity`

### `PUT /users/me/settings`
- **Auth Required**: Yes
- **Body (`UpdateSettingsDto`)**:
  - `profileSettings` (object, required): Key-value profile configurations
- **Returns**: Updated `User`

### `POST /users/me/mfa/totp/setup`
- **Auth Required**: Yes
- **Returns**: `TotpSetupEntity` (secret and registration URI)

### `POST /users/me/mfa/totp/enable`
- **Auth Required**: Yes
- **Body (`EnableTotpDto`)**:
  - `code` (string, required): Setup verification code
- **Returns**: `string[]` (list of emergency backup codes)

### `POST /users/me/mfa/totp/disable`
- **Auth Required**: Yes
- **Returns**: `SuccessEntity`

### `POST /users/me/mfa/email/send-setup-code`
- **Auth Required**: Yes
- **Returns**: `SuccessEntity`

### `POST /users/me/mfa/email/enable`
- **Auth Required**: Yes
- **Body (`EnableEmailMfaDto`)**:
  - `code` (string, required): Verification code sent via email
- **Returns**: `string[]` (emergency backup codes)

### `POST /users/me/mfa/email/disable`
- **Auth Required**: Yes
- **Returns**: `SuccessEntity`

### `POST /users/me/mfa/backup-codes/regenerate`
- **Auth Required**: Yes
- **Returns**: `string[]` (newly generated backup codes)

### `POST /users/me/mfa/passkey/register-options`
- **Auth Required**: Yes
- **Returns**: SimpleWebAuthn `PublicKeyCredentialCreationOptionsJSON` object

### `POST /users/me/mfa/passkey/register-verify`
- **Auth Required**: Yes
- **Body (`VerifyPasskeyDto`)**:
  - `response` (object, required): SimpleWebAuthn registration response
  - `name` (string, optional): User-defined name for the passkey
- **Returns**: `string[]` (backup codes list)

### `GET /users/me/mfa/passkeys`
- **Auth Required**: Yes
- **Returns**: `PasskeyEntity[]`

### `GET /users/me/mfa/status`
- **Auth Required**: Yes
- **Returns**: `MfaStatusEntity` (enabled status for each MFA type)

### `DELETE /users/me/mfa/passkeys/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Passkey database ID
- **Returns**: `SuccessEntity`

### `GET /users/me/devices`
- **Auth Required**: Yes
- **Returns**: `DeviceEntity[]`

### `POST /users/me/devices`
- **Auth Required**: Yes
- **Body (`RegisterDeviceDto`)**:
  - `deviceName` (string, required)
  - `userAgent` (string, optional)
  - `identityKey` (string, required)
  - `signedPreKey` (string, required)
  - `preKeys` (array of strings, optional)
- **Returns**: `DeviceEntity`

### `DELETE /users/me/devices/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Device ID
- **Returns**: `SuccessEntity`

### `GET /users/me/devices/:id/status`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Device ID
- **Returns**: `DeviceStatusEntity`

### `PUT /users/me/e2ee-keys`
- **Auth Required**: Yes
- **Body**:
  - `userPublicKey` (string, required)
  - `encryptedUserPrivateKey` (string, required)
- **Returns**: `User`

### `GET /users/me/e2ee-keys`
- **Auth Required**: Yes
- **Returns**: `E2eeKeysEntity`

### `GET /users/by-email/:email`
- **Auth Required**: Yes
- **Path Parameters**:
  - `email` (string, required)
- **Returns**: `UserSearchEntity`

### `GET /users/:username`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `username` (string, required)
- **Returns**: `UserProfileEntity` (public user details, excluding private settings/connections)

### `GET /users/me/api-keys`
- **Auth Required**: Yes
- **Returns**: `ApiKeyEntity[]`

### `POST /users/me/api-keys`
- **Auth Required**: Yes
- **Body (`CreateApiKeyDto`)**:
  - `name` (string, required, max 64 chars)
- **Returns**: `ApiKeyCreatedEntity` (includes plain text api key)

### `POST /users/me/api-keys/:id/regenerate`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Api Key ID
- **Returns**: `ApiKeyCreatedEntity`

### `DELETE /users/me/api-keys/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Api Key ID
- **Returns**: `DeleteSuccessEntity`

---

## 3. Bookmarks Module (`/bookmarks`)

Star maps redirecting and connecting stars.

### `POST /bookmarks`
- **Auth Required**: Yes
- **Body (`CreateBookmarkDto`)**:
  - `name` (string, required)
  - `description` (string, required)
  - `redirect` (string, required)
  - `stars` (array of numbers, required)
  - `connections` (array of number pairs `[[from, to]]`, required)
  - `icon` (string, optional)
  - `connectionColor` (string, optional)
  - `starColor` (string, optional)
- **Returns**: Created/updated bookmark object

### `GET /bookmarks`
- **Auth Required**: Yes
- **Returns**: Array of user bookmark objects

### `DELETE /bookmarks/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Bookmark database ID
- **Returns**: `{ success: boolean }`

---

## 4. Email Module (`/emails`)

E2EE synchronized local IMAP caching & SMTP sending.

### `GET /emails`
- **Auth Required**: Yes
- **Returns**: Array of configured email accounts (with unread messages count)

### `POST /emails`
- **Auth Required**: Yes
- **Body (`EmailAccountDto`)**:
  - `accountName` (string, required)
  - `color` (string, optional)
  - `senderName` (string, required)
  - `emailAddress` (string, required)
  - `loginEmail` (string, optional)
  - `replyToAddress` (string, optional)
  - `organization` (string, optional)
  - `signatureText` (string, optional)
  - `useHtmlSignature` (boolean, optional)
  - `imapHost` (string, required)
  - `imapPort` (number, required)
  - `imapSecure` (boolean, required)
  - `smtpHost` (string, required)
  - `smtpPort` (number, required)
  - `smtpSecure` (boolean, required)
  - `password` (string, optional): Account password
- **Returns**: Created user email account details

### `PUT /emails/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Account ID
- **Body (`EmailAccountDto`)**
- **Returns**: Updated email account details

### `DELETE /emails/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Account ID
- **Returns**: `{ success: boolean }`

### `GET /emails/canned-responses`
- **Auth Required**: Yes
- **Query**:
  - `page` (string, optional)
  - `limit` (string, optional)
- **Returns**: Array of canned templates

### `POST /emails/canned-responses`
- **Auth Required**: Yes
- **Body**:
  - `name` (string, required)
  - `subject` (string, optional)
  - `bodyText` (string, required)
- **Returns**: Created canned response details

### `PUT /emails/canned-responses/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required): Canned response ID
- **Body** (name, subject, bodyText)
- **Returns**: Updated response details

### `DELETE /emails/canned-responses/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required)
- **Returns**: `{ success: boolean }`

### `GET /emails/autoconfig/:domain`
- **Auth Required**: Yes
- **Path Parameters**:
  - `domain` (string, required): Domain name (e.g. `runerra.org`)
- **Returns**: `EmailAutoconfigResult` (resolved IMAP and SMTP ports and hosts)

### `GET /emails/attachments/:attachmentId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `attachmentId` (string, required)
- **Returns**: File stream header attachment

### `GET /emails/unified/folders/:folder/messages`
- **Auth Required**: Yes
- **Path Parameters**:
  - `folder` (string, required): Unified folder name (e.g. `inbox`, `sent`, `trash`, `junk`, `archive`)
- **Query**:
  - `page` (string, optional)
  - `limit` (string, optional)
- **Returns**: Combined messages list from all accounts

### `GET /emails/:accountId/folders/:folder/messages`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId` (string, required)
  - `folder` (string, required)
- **Query** (page, limit)
- **Returns**: List of cached messages for specific folder and account

### `GET /emails/:accountId/messages/:messageId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId` (string, required)
  - `messageId` (string, required)
- **Returns**: Local email message entity (with attachments metadata)

### `PUT /emails/:accountId/messages/:messageId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`, `messageId`
- **Body**:
  - `read` (boolean, optional)
  - `flagged` (boolean, optional)
  - `folder` (string, optional): Move message standard folder destination
- **Returns**: Updated message

### `DELETE /emails/:accountId/messages/:messageId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`, `messageId`
- **Returns**: `{ success: boolean }`

### `PUT /emails/:accountId/messages/bulk`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`
- **Body**:
  - `messageIds` (array of strings, required)
  - `read` (boolean, optional)
  - `flagged` (boolean, optional)
  - `folder` (string, optional)
- **Returns**: `{ success: boolean }`

### `POST /emails/:accountId/messages/bulk-delete`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`
- **Body**:
  - `messageIds` (array of strings, required)
- **Returns**: `{ success: boolean }`

### `POST /emails/:accountId/send`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`
- **Body (`SendEmailDto`)**:
  - `to` (string, required)
  - `cc` (string, optional)
  - `bcc` (string, optional)
  - `subject` (string, optional)
  - `body` (string, required)
  - `html` (string, optional)
- **Returns**: Saved sent message details

### `POST /emails/:accountId/sync`
- **Auth Required**: Yes
- **Path Parameters**:
  - `accountId`
- **Returns**: `{ success: boolean }` (Triggers background IMAP synchronization)

---

## 5. Media Lookup Modules (`/anime`, `/manga`, `/movie`, `/tv`, `/game`, `/book`)

External metadata query and local indexing endpoints. All of these controllers follow a identical REST format.

### `GET /<mediaType>/search/:name`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `name` (string, required): Search query title
- **Returns**: Array of search results (includes cover image, metadata and title languages)

### `GET /<mediaType>/:id`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `id` (number/string, required): Internal database primary ID of the media entity
- **Returns**: Detailed information sheet of the media item

### `POST /<mediaType>/:id/refresh`
- **Auth Required**: Yes
- **Permissions**: Requires the `MEDIA_REFRESH` scope
- **Path Parameters**:
  - `id` (number/string, required): ID to force fetch updates for from remote sources
- **Returns**: Updated media details

---

## 6. List Module (`/list`)

User-scoped media lists tracking watching, reading, playing and reading progress.

### `GET /list/<mediaType>/user/:username`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `mediaType` (string, required): one of `anime`, `manga`, `tv`, `movie`, `game`, `book`
  - `username` (string, required)
- **Query**:
  - `limit`, `offset` (number, optional)
  - `status` (string, optional)
  - `search` (string, optional)
  - `format` (string, optional)
  - `sort` (string, optional)
  - `genres` (string, optional)
  - `year` (string, optional)
  - `mediaStatus` (string, optional)
- **Returns**: `{ entries: ListEntity[], counts: Record<string, number> }`

### `GET /list/<mediaType>/entry/:mediaId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `mediaType` (string, required): `anime`, `manga`, `tv`, `movie`, `game`, `book`
  - `mediaId` (number/string, required): local database ID (e.g. `movieId`, `tvId`, `animeId`...)
- **Returns**: Individual user list entry status

### `POST /list/<mediaType>/entry/save`
- **Auth Required**: Yes
- **Path Parameters**:
  - `mediaType` (string, required): `anime`, `manga`, `tv`, `movie`, `game`, `book`
- **Body**:
  - `animeId` / `mangaId` / `movieId` / `tvId` / `gameId` / `bookId` (number/string, required): Local DB ID
  - `status` (string, optional): planning, watching, completed, etc.
  - `progress` / `chapters` / `volumes` (number, optional): Current item progress count
  - `score` (number, optional)
  - `startDate`, `endDate` (number, optional)
  - `notes` (string, optional)
  - `rewatched` / `reread` (number, optional)
  - `updateConnection` (boolean, optional): Sync updates to third-party providers (MAL, AniList etc.)
  - `connections` (object, optional): Provider offsets/IDs
  - `episodes` (array, TV shows only, optional): Watched episodes list `[{seasonNum, episodeNum}]`
- **Returns**: `{ success: boolean, message: string }`

### `DELETE /list/<mediaType>/entry/:mediaId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `mediaType` (string, required)
  - `mediaId` (number/string, required): Local DB ID
- **Returns**: `{ success: boolean, message: string }`

### `GET /list/watching`
- **Auth Required**: Yes
- **Returns**: Consolidated list of all media types currently in-progress (`WATCHING` / `READING` / `PLAYING`), sorted by last updated date.

### `POST /list/increment`
- **Auth Required**: Yes
- **Body**:
  - `mediaType` (string, required): `anime`, `manga`, `tv`, `game`, `book`
  - `id` (number/string, required): Local DB ID
  - `count` (number, optional): Count offset to add (defaults to 1)
- **Returns**: Result of progress increment operation

### `POST /list/tv/entry/:tvId/episode`
- **Auth Required**: Yes
- **Path Parameters**:
  - `tvId` (number, required)
- **Body**:
  - `seasonNum` (number, required)
  - `episodeNum` (number, required)
- **Returns**: Updated TV list status

### `POST /list/tv/entry/:tvId/season`
- **Auth Required**: Yes
- **Path Parameters**:
  - `tvId` (number, required)
- **Body**:
  - `seasonNum` (number, required)
  - `episodes` (array, required): Episodes list
  - `watched` (boolean, required)
- **Returns**: Updated TV list status

### `GET /list/:mediaType/user/:username/filters`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `mediaType`, `username`
- **Returns**: Unique counts of genres, release years, formats, and list statuses present in the user's list (for client-side sidebar filter generation).

---

## 7. Radarr / Sonarr List Sync API

Compatible API mocks for Radarr/Sonarr list import integrations.

### `GET /list/radarr/movie/api/v3/movie`
- **Auth Required**: Yes (usually via API key headers)
- **Returns**: Movie entries in `PLANNING` state mapped to Radarr model schema (including resolved IMDB and TMDB IDs)

### `GET /list/radarr/anime/api/v3/movie`
- **Auth Required**: Yes
- **Returns**: Anime movie entries (format: `MOVIE` only) in `PLANNING` state mapped to Radarr model schema (including resolved IMDB and TMDB IDs)

### `GET /list/sonarr/tv/api/v3/series`
- **Auth Required**: Yes
- **Returns**: TV planning entries Sonarr schema list

### `GET /list/sonarr/anime/api/v3/series`
- **Auth Required**: Yes
- **Returns**: Anime planning entries (excluding format `MOVIE`) Sonarr schema list

### `GET /list/*api/v3/qualityprofile`
- **Auth Required**: Yes
- **Returns**: Default profile lists `[{ id: 1, name: "Any" }]`

---

## 8. Connections Module (`/connections`)

Third-party account linkings (MAL, AniList, Simkl etc.) and list imports.

### `GET /connections`
- **Auth Required**: Yes
- **Query**:
  - `linkedTo` (string, optional): e.g. `USER`, `BOT`
  - `capabilities` (string/array, optional): Filter by connection features (e.g. `ANIME`, `MANGA`, `MOVIES`, `TV_SHOWS`)
- **Returns**: `ConnectionEntity[]`

### `POST /connections/save`
- **Auth Required**: Yes
- **Body (`UpsertConnectionDto`)**:
  - `provider` (string, required, e.g. 'ANILIST', 'MAL')
  - `linkedUsername` (string, optional)
  - `accessToken` (string, optional)
  - `refreshToken` (string, optional)
  - `expiresAt` (string, optional, date string)
  - `connectionId` (string, optional)
  - `linkedTo` (string, optional, 'USER' or 'BOT')
  - `private` (boolean, optional)
  - `metadata` (object, optional)
- **Returns**: `ConnectionEntity`

### `DELETE /connections/remove/:provider`
- **Auth Required**: Yes
- **Path Parameters**:
  - `provider` (string, required): Connection provider key
- **Returns**: `{ success: boolean }`

### `GET /connections/:provider/connect`
- **Auth Required**: Yes (accepts token via query parameters)
- **Query**:
  - `token` (string, required): Auth session verification token
  - `redirectUrl` (string, required): Client application callback page URL
- **Returns**: Redirects client to OAuth authorization portal

### `GET /connections/:provider/callback`
- **Auth Required**: No (Public)
- **Query**:
  - `code` (string, required): Authorization grant code
  - `state` (string, required): state token containing redirect destination
- **Returns**: Performs callback handshake and redirects user back to the client application with `?success=true` or `?error=...` parameters.

### `POST /connections/:provider/import`
- **Auth Required**: Yes
- **Permissions**: Requires the `IMPORT_LIST` scope
- **Path Parameters**:
  - `provider` (string, required)
  - `body` (object, optional): `{ mediaTypes?: string[] }` (defaults to importing all media types supported by provider)
- **Returns**: `{ status: "PENDING" }`

### `GET /connections/:provider/import/status`
- **Auth Required**: Yes
- **Permissions**: Requires the `IMPORT_LIST` scope
- **Path Parameters**:
  - `provider` (string, required)
  - **Returns**: `{ total: number, processed: number, status: string, error?: string }`

---

## 9. Favorites Module (`/favorites`)

User favorites indexing.

### `POST /favorites`
- **Auth Required**: Yes
- **Body (`AddFavoriteDto`)**:
  - `type` (string, required): one of `ANIME`, `MANGA`, `MOVIE`, `TV`, `BOOK`, `GAME`, `USER`
  - `targetId` (string, required): Target media or user ID
- **Returns**: `FavoriteEntity`

### `GET /favorites`
- **Auth Required**: Yes
- **Query**:
  - `type` (string, optional): Filter by favorite type
- **Returns**: `FavoriteEntity[]`

### `GET /favorites/user/:username`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `username` (string, required)
  - `type` (string, optional): Query filter
- **Returns**: `ResolvedFavoriteEntity[]` (Returns fully resolved media title/metadata objects)

### `GET /favorites/:type/:targetId/status`
- **Auth Required**: Yes
- **Path Parameters**:
  - `type`, `targetId`
- **Returns**: `FavoriteStatusEntity` (`{ isFavorite: boolean }`)

### `DELETE /favorites/:type/:targetId`
- **Auth Required**: Yes
- **Path Parameters**:
  - `type`, `targetId`
- **Returns**: `FavoriteSuccessEntity` (`{ success: boolean }`)

---

## 10. Notifications Module (`/notifications`)

System notifications inbox and device approvals.

### `GET /notifications`
- **Auth Required**: Yes
- **Query**:
  - `skip`, `take` (number, optional): Pagination offsets
  - `type` (string, optional): Filter by type (e.g. `INFO`, `APPROVAL`)
  - `status` (string, optional): Filter by state (`PENDING`, `APPROVED`, `DENIED`, `READ`)
- **Returns**: `NotificationEntity[]`

### `PATCH /notifications/:id/status`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required)
- **Body (`UpdateNotificationStatusDto`)**:
  - `status` (string, required): one of `PENDING`, `APPROVED`, `DENIED`, `READ`
- **Returns**: Updated `NotificationEntity`

### `POST /notifications/approve`
- **Auth Required**: Yes
- **Body (`ApproveDeviceDto`)**:
  - `notificationId` (string, required): Device approval request notification ID
  - `encryptedMasterKey` (string, required): Authenticated master key payload encrypted for the new device
- **Returns**: Updated notification status object

### `DELETE /notifications/:id`
- **Auth Required**: Yes
- **Path Parameters**:
  - `id` (string, required)
- **Returns**: `void`

### `DELETE /notifications`
- **Auth Required**: Yes
- **Returns**: `void` (Clears user's notification inbox entirely)

---

## 11. Files Module (`/public` / `/lacerta`)

Public assets (images) and private E2EE user file uploads.

### `GET /public/*path`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `path` (string, required): File path string
- **Returns**: Public image asset stream (e.g. avatars, banners)

### `POST /public/upload`
- **Auth Required**: Yes
- **Interceptors**: Multer File upload (Field: `file`, max 4 MB, image types only)
- **Returns**: `UploadPublicEntity` (url to uploaded public asset)

### `GET /lacerta/*path`
- **Auth Required**: No (Public validation inside controller)
- **Path Parameters**:
  - `path` (string, required): Encrypted file path
- **Returns**: Streams encrypted file contents (only if requested by owner or marked public)

### `POST /lacerta/upload`
- **Auth Required**: Yes
- **Interceptors**: Multer File upload (Field: `file`)
- **Body**:
  - `wrappedKey` (string, required): E2EE wrapped file decryption key
- **Returns**: `UploadLaceraEntity` (resolved path and DB ID)

### `PATCH /lacerta/*path/visibility`
- **Auth Required**: Yes
- **Path Parameters**:
  - `path` (string, required)
- **Returns**: `LaceraVisibilityEntity` (updated visibility status `{ isPublic: boolean }`)

---

## 12. Stats Module (`/stats`)

User list statistics computation.

### `GET /stats/:username/:type`
- **Auth Required**: No (Public)
- **Path Parameters**:
  - `username` (string, required)
  - `type` (string, required): `anime`, `manga`, `tv`, `movie`, `game`, or `book`
- **Returns**: `StatsEntity` (scores distribution, format counts, status summaries)
