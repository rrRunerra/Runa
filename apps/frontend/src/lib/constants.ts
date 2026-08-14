// ---------------------------------------------------------------------------
// Lacerta: Chunked E2EE Upload constants
// ---------------------------------------------------------------------------

/** Size of each plaintext chunk before encryption (32 MiB) */
export const LACERTA_CHUNK_SIZE_BYTES = 32 * 1024 * 1024;

/** Maximum number of chunks uploaded in parallel to the backend */
export const LACERTA_UPLOAD_CONCURRENCY = 4;

/**
 * IndexedDB object store name for persisting upload manifests.
 * Allows uploads to be resumed across page reloads and browser crashes.
 */
export const LACERTA_UPLOAD_MANIFEST_STORE = "lacerta_upload_manifests";

// ---------------------------------------------------------------------------
// Runa Settings Constants
// ---------------------------------------------------------------------------

/**
 * API Endpoints for Runa Settings modules.
 */
export const RR_SETTINGS_API_ENDPOINTS = {
  USER_ME: "/users/me",
  USER_BY_USERNAME: (username: string) =>
    `/users/${encodeURIComponent(username)}`,
  USER_SETTINGS: "/users/me/settings",
  PUBLIC_UPLOAD: "/public/upload",
  MFA_STATUS: "/users/me/mfa/status",
  MFA_PASSKEYS: "/users/me/mfa/passkeys",
  MFA_PASSKEY_BY_ID: (id: string) => `/users/me/mfa/passkeys/${id}`,
  MFA_TOTP_SETUP: "/users/me/mfa/totp/setup",
  MFA_TOTP_ENABLE: "/users/me/mfa/totp/enable",
  MFA_TOTP_DISABLE: "/users/me/mfa/totp/disable",
  MFA_EMAIL_SEND_SETUP: "/users/me/mfa/email/send-setup-code",
  MFA_EMAIL_SEND_OTP: "/users/me/mfa/email/send-setup-code",
  MFA_EMAIL_ENABLE: "/users/me/mfa/email/enable",
  MFA_EMAIL_DISABLE: "/users/me/mfa/email/disable",
  MFA_DISABLE_ALL: "/users/me/mfa/disable-all",
  MFA_PASSKEY_REGISTER_OPTIONS: "/users/me/mfa/passkey/register-options",
  MFA_PASSKEY_REGISTER_VERIFY: "/users/me/mfa/passkey/register-verify",
  MFA_BACKUP_CODES_REGENERATE: "/users/me/mfa/backup-codes/regenerate",
  DEVICES: "/users/me/devices",
  DEVICE_BY_ID: (deviceId: string) => `/users/me/devices/${deviceId}`,
  DEVICE_LINK: "/auth/login-code/link",
  CONNECTIONS: "/connections",
  CONNECTIONS_IMPORT_STATUS: (providerId: string) =>
    `/connections/${providerId.toLowerCase()}/import/status`,
  CONNECTIONS_IMPORT_START: (providerId: string) =>
    `/connections/${providerId.toLowerCase()}/import`,
  CONNECTIONS_CONNECT: (providerId: string) =>
    `/connections/${providerId.toLowerCase()}/connect`,
  CONNECTIONS_DISCONNECT: (providerId: string) =>
    `/connections/remove/${providerId.toLowerCase()}`,
  CONNECTIONS_SAVE: "/connections/save",
} as const;

/**
 * LocalStorage Keys used across settings modules.
 */
export const RR_SETTINGS_STORAGE_KEYS = {
  LAST_TOKEN_REFRESH: "runa-last-token-refresh",
  LAST_CONNECTIONS_REFRESH: "runa-last-connections-refresh",
} as const;

/**
 * Security settings subtabs identifiers.
 */
export const RR_SECURITY_SUBTABS = {
  PASSWORD: "password",
  MFA: "mfa",
  DEVICES: "devices",
} as const;

export type RrSecuritySubTab =
  (typeof RR_SECURITY_SUBTABS)[keyof typeof RR_SECURITY_SUBTABS];

/**
 * Account settings subtabs identifiers.
 */
export const RR_ACCOUNT_SUBTABS = {
  VISUALS: "visuals",
  ABOUT: "about",
  INFO: "info",
} as const;

export type RrAccountSubTab =
  (typeof RR_ACCOUNT_SUBTABS)[keyof typeof RR_ACCOUNT_SUBTABS];

/**
 * Framer Motion layout IDs for navigation pill highlights.
 */
export const RR_SETTINGS_LAYOUT_IDS = {
  SECURITY_NAV: "securitySettingsCategoryHighlight",
  ACCOUNT_NAV: "accountSettingsCategoryHighlight",
} as const;

/**
 * Input limits, code lengths, and countdown timer defaults for settings.
 */
export const RR_SETTINGS_LIMITS = {
  LINK_CODE_LENGTH: 10,
  LINK_CODE_MAX_INPUT_LENGTH: 12,
  LINK_CODE_DISPLAY_LENGTH: 12,
  OTP_CODE_LENGTH: 6,
  TOKEN_REFRESH_COOLDOWN_SECONDS: 60,
  CONNECTIONS_REFRESH_COOLDOWN_SECONDS: 30,
  POLL_IMPORT_INTERVAL_MS: 10000,
  BACKUP_CODE_COPY_TOAST_MS: 2000,
  CROPPER_ASPECT_RATIO: 5,
} as const;

/**
 * Email validation regex pattern.
 */
export const RR_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
