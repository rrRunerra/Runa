import type { PrivacySettings, ConnectionEntity } from './user.types';

// --- Public Profile ---

export interface UserProfileEntity {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  sidebarCardBackgroundUrl: string | null;
  profileSettings: Record<string, string | number | boolean | null> | null;
  private: boolean;
  connections: ConnectionEntity[];
}

// --- Email Search Result ---

export interface UserSearchEntity {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  email?: string;
  createdAt?: Date;
  userPublicKey?: string | null;
}

// --- TOTP Setup ---

export interface TotpSetupEntity {
  secret: string;
  otpauthUrl: string;
}

// --- Passkey ---

export interface PasskeyEntity {
  id: string;
  name: string | null;
  createdAt: Date;
}

// --- MFA Status ---

export interface MfaStatusEntity {
  totpEnabled: boolean;
  emailMfaEnabled: boolean;
  hasBackupCodes: boolean;
  passkeysCount: number;
}

// --- Device ---

export interface DeviceEntity {
  id: string;
  deviceName: string;
  userAgent: string | null;
  lastActiveAt: Date;
  identityKey: string;
  signedPreKey: string;
  encryptedMasterKey: string | null;
}

// --- Device Status ---

export interface DeviceStatusEntity {
  id: string;
  approved: boolean;
  encryptedMasterKey: string | null;
}

// --- E2EE Keys ---

export interface E2eeKeysEntity {
  userPublicKey: string | null;
  encryptedUserPrivateKey: string | null;
}

// --- Success ---

export interface SuccessEntity {
  success: boolean;
}

// --- API Key ---

export interface ApiKeyEntity {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  truncatedKey: string;
}

export interface ApiKeyCreatedEntity {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  key: string;
}

// --- API Key Delete Response ---

export interface DeleteSuccessEntity {
  message: string;
}

// Re-export for convenient access
export type { PrivacySettings, ConnectionEntity };
