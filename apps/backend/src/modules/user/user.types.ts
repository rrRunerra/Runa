import type {
  User,
  Connections,
  ConnectionProvider,
  ConnectionLinkedTo,
} from '@runa/database';

// --- User Profile Types ---

export type UserWithConnections = User & {
  connections?: ConnectionEntity[];
};

// --- Profile Settings ---

export type ProfileSettingsValue = string | number | boolean | null;

export type ProfileSettings = Record<string, ProfileSettingsValue>;

// --- Privacy Settings ---

/**
 * Three distinct privacy visibility tiers for profile, lists, and integrations.
 */
export const PRIVACY_LEVELS = ['public', 'friends', 'private'] as const;

export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

/**
 * Standard known privacy settings keys supported natively across Runa apps.
 */
export const KNOWN_PRIVACY_KEYS = [
  'profile',
  'friends',
  'animeList',
  'mangaList',
  'movieList',
  'tvList',
  'gameList',
  'bookList',
  'connections',
] as const;

export type KnownPrivacyKey = (typeof KNOWN_PRIVACY_KEYS)[number];

/**
 * Privacy input value accepting either explicit string tiers or legacy booleans.
 */
export type PrivacySettingValue = PrivacyLevel | boolean;

/**
 * Strongly typed privacy settings object with extensible key support.
 */
export type PrivacySettings = {
  profile: PrivacyLevel;
  friends: PrivacyLevel;
  animeList: PrivacyLevel;
  mangaList: PrivacyLevel;
  movieList: PrivacyLevel;
  tvList: PrivacyLevel;
  gameList: PrivacyLevel;
  bookList: PrivacyLevel;
  connections: PrivacyLevel;
} & Record<string, PrivacyLevel>;

/**
 * Normalizes any privacy value (boolean, string, undefined, null) into a strict PrivacyLevel.
 */
export function normalizePrivacyLevel(value: unknown): PrivacyLevel {
  if (value === 'private' || value === 'only_me' || value === true) {
    return 'private';
  }
  if (value === 'friends') {
    return 'friends';
  }
  return 'public';
}

/**
 * Checks whether a privacy value corresponds to private/hidden for boolean database columns.
 */
export function isPrivateLevel(value: unknown): boolean {
  return normalizePrivacyLevel(value) === 'private';
}

// --- Connection Entity (safe, no tokens) ---

export interface ConnectionEntity {
  id: string;
  provider: ConnectionProvider;
  linkedUsername: string | null;
  linkedTo: ConnectionLinkedTo | null;
  private: boolean;
  metadata: Record<string, unknown> | null;
}

// --- Device Data (passed to registerDevice) ---

export interface RegisterDeviceData {
  deviceName: string;
  userAgent?: string;
  identityKey: string;
  mlKemIdentityKey?: string;
  signedPreKey: string;
  preKeys?: string[];
}
