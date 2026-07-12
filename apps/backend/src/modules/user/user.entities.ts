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
  mlKemIdentityKey: string | null;
  signedPreKey: string;
  encryptedMasterKey: string | null;
}

// --- Device Status ---

export interface DeviceStatusEntity {
  id: string;
  approved: boolean;
  encryptedMasterKey: string | null;
}

// --- Encryption Keys ---

export interface EncryptionKeysEntity {
  userPublicKey: string | null;
  userMlKemPublicKey: string | null;
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
  app: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  truncatedKey: string;
}

export interface ApiKeyCreatedEntity {
  id: string;
  name: string;
  app: string;
  keyPrefix: string;
  keyHash: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  key: string;
}

// --- API Key Delete Response ---

export interface DeleteSuccessEntity {
  message: string;
}

// Re-export for convenient access
export type { PrivacySettings, ConnectionEntity };
