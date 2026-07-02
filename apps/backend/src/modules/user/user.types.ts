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

export interface PrivacySettings {
  profile: boolean;
  animeList: boolean;
  mangaList: boolean;
  tvList: boolean;
  movieList: boolean;
  connections: boolean;
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
  signedPreKey: string;
  preKeys?: string[];
}
