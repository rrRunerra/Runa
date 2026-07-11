import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type User } from '@runa/database';
import { BitField, DEFAULT_PERMISSIONS, RunaFlags } from '@runa/permissions';
import bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import { encrypt } from '@runa/crypto/server';
import * as crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

import {
  rrBadRequestException,
  rrConflictException,
  rrInternalServerErrorException,
  rrNotFoundException,
} from 'src/providers/error';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import { FilesService } from '../files/files.service';

import { UserRepository } from './user.repository';
import type { PrivacySettings, RegisterDeviceData } from './user.types';
import type {
  TotpSetupEntity,
  PasskeyEntity,
  MfaStatusEntity,
  DeviceEntity,
  DeviceStatusEntity,
  E2eeKeysEntity,
  SuccessEntity,
  UserProfileEntity,
  UserSearchEntity,
  ApiKeyEntity,
  ApiKeyCreatedEntity,
  DeleteSuccessEntity,
} from './user.entities';
import type {
  CreateUserDto,
  UpdateUserDto,
  PrivacySettingsDto,
  UpdateSettingsDto,
  RegisterDeviceDto,
} from './user.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESERVED_KEYWORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'any',
  'boolean',
  'constructor',
  'declare',
  'get',
  'module',
  'require',
  'number',
  'set',
  'string',
  'symbol',
  'type',
  'undefined',
  'unknown',
  'never',
  'readonly',
  'keyof',
  'infer',
  'as',
  'from',
  'of',
  'namespace',
  'interface',
  'implements',
  'enum',
  'await',
  'select',
  'insert',
  'update',
  'drop',
  'truncate',
  'alter',
  'create',
  'table',
  'database',
  'index',
  'use',
  'where',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'on',
  'and',
  'or',
  'not',
  'union',
  'values',
  'into',
  'order',
  'by',
  'group',
  'having',
  'limit',
  'offset',
  'distinct',
  'all',
  'exists',
  'like',
  'between',
  'is',
]);

export function parsePrivacy(privacy: unknown): PrivacySettings {
  if (privacy && typeof privacy === 'object') {
    const p = privacy as Record<string, unknown>;
    return {
      profile: p.profile === true,
      animeList: p.animeList === true,
      mangaList: p.mangaList === true,
      tvList: p.tvList === true,
      movieList: p.movieList === true,
      connections: p.connections === true,
    };
  }
  return {
    profile: false,
    animeList: false,
    mangaList: false,
    tvList: false,
    movieList: false,
    connections: false,
  };
}

// ---------------------------------------------------------------------------
// Cache TTL constants (seconds)
// ---------------------------------------------------------------------------

const TTL_HOUR = 3600;

// ---------------------------------------------------------------------------
// UserService
// ---------------------------------------------------------------------------

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly moduleCode = 'UrSve-';

  private hasAdmin = false;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {
    void this.checkHasAdmin();
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  private async checkHasAdmin(): Promise<void> {
    this.hasAdmin = (await this.userRepository.countUsers()) > 0;
  }

  // ---------------------------------------------------------------------------
  // User CRUD
  // ---------------------------------------------------------------------------

  async create(data: CreateUserDto): Promise<User> {
    const sanitizedUsername = data.username.replace(/[^a-zA-Z0-9_]/g, '');
    const lowerUsername = sanitizedUsername.toLowerCase();
    const lowerEmail = data.email.toLowerCase();

    // Reserved keyword check
    if (RESERVED_KEYWORDS.has(lowerUsername)) {
      throw new rrConflictException(`${this.moduleCode}UCARK001`, {
        message: 'Username cannot be a reserved keyword.',
      });
    }

    // Uniqueness checks
    const existing = await this.userRepository.findFirstUserByEmailOrUsername(
      lowerEmail,
      lowerUsername,
    );

    const errors: string[] = [];
    if (existing?.email.toLowerCase() === lowerEmail) {
      errors.push('Email is already taken.');
    }
    if (existing?.username.toLowerCase() === lowerUsername) {
      errors.push('Username is already taken.');
    }
    if (errors.length > 0) {
      throw new rrConflictException(`${this.moduleCode}C001`, {
        message: errors.join('. '),
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const permissions = new BitField([...DEFAULT_PERMISSIONS]);
    if (!this.hasAdmin) {
      permissions.add(RunaFlags.ADMINISTRATOR);
    }

    return this.userRepository
      .createUser({
        email: lowerEmail,
        username: lowerUsername,
        passwordHash,
        permissions: permissions.serialize(),
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to create user', err);
        throw new rrBadRequestException(`${this.moduleCode}FTCU001`, {
          message: 'Failed to create user',
        });
      });
  }

  async findByUsername(
    username: string,
  ): Promise<
    (User & { connections: import('@runa/database').Connections[] }) | null
  > {
    const cacheKey = `user:profile:${username.toLowerCase()}`;
    const cached = await this.cacheService.get<
      User & { connections: import('@runa/database').Connections[] }
    >(cacheKey);
    if (cached) return cached;

    const user =
      await this.userRepository.findUserByUsernameWithConnections(username);
    if (user) {
      await this.cacheService.set(cacheKey, user, TTL_HOUR);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findUserByEmail(email);
  }

  async update(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWIDNF001`, {
        message: `User with ID ${userId} not found`,
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    let passwordOrEmailChanged = false;

    // Email change
    if (data.email !== undefined && data.email.toLowerCase() !== user.email) {
      passwordOrEmailChanged = true;

      const existingEmail = await this.userRepository.findUserByEmail(
        data.email,
      );
      if (existingEmail && existingEmail.id !== userId) {
        throw new rrConflictException(`${this.moduleCode}EIAT001`, {
          message: 'Email is already taken.',
        });
      }
      updateData.email = data.email.toLowerCase();
    }

    // Password change
    if (data.newPassword !== undefined) {
      passwordOrEmailChanged = true;
    }

    // Require current password for sensitive changes
    if (passwordOrEmailChanged) {
      if (!data.currentPassword) {
        throw new rrBadRequestException(`${this.moduleCode}CPRTCEROP001`, {
          message: 'Current password is required to change email or password.',
        });
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        throw new rrBadRequestException(`${this.moduleCode}ICP001`, {
          message: 'Invalid current password.',
        });
      }

      if (data.newPassword !== undefined) {
        updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
        updateData.passwordChangedAt = new Date();
      }
    }

    // Profile fields
    const oldAvatarUrl = user.avatarUrl;
    const oldBannerUrl = user.bannerUrl;
    const oldSidebarUrl = user.sidebarCardBackgroundUrl;

    if (data.displayName !== undefined)
      updateData.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
    if (data.sidebarCardBackgroundUrl !== undefined) {
      updateData.sidebarCardBackgroundUrl = data.sidebarCardBackgroundUrl;
    }

    const updatedUser = await this.userRepository.updateUser(
      userId,
      updateData,
    );

    // Invalidate caches
    await Promise.all([
      this.cacheService.del(`user:profile:${user.username}`),
      this.cacheService.del(`user:permissions:${userId}`),
    ]);

    // Clean up old media files
    if (data.avatarUrl !== undefined && data.avatarUrl !== oldAvatarUrl) {
      this.filesService.deleteFileByUrl(oldAvatarUrl);
    }
    if (data.bannerUrl !== undefined && data.bannerUrl !== oldBannerUrl) {
      this.filesService.deleteFileByUrl(oldBannerUrl);
    }
    if (
      data.sidebarCardBackgroundUrl !== undefined &&
      data.sidebarCardBackgroundUrl !== oldSidebarUrl
    ) {
      this.filesService.deleteFileByUrl(oldSidebarUrl);
    }

    return updatedUser;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<User> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWIDNF002`, {
        message: `User with ID ${userId} not found`,
      });
    }

    const updated = await this.userRepository.updateUser(userId, {
      profileSettings: dto.profileSettings,
    });

    await this.cacheService.del(`user:profile:${user.username}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Privacy
  // ---------------------------------------------------------------------------

  async getPrivacySettings(username: string): Promise<PrivacySettings> {
    const cacheKey = `user:privacy:${username.toLowerCase()}`;
    const cached = await this.cacheService.get<PrivacySettings>(cacheKey);
    if (cached) return cached;

    const user = await this.userRepository.findUserByUsername(username);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UUNF001`, {
        message: `User ${username} not found`,
      });
    }

    const privacy = parsePrivacy(user.privacy);
    await this.cacheService.set(cacheKey, privacy, TTL_HOUR);
    return privacy;
  }

  async updatePrivacySettings(
    userId: string,
    dto: PrivacySettingsDto,
  ): Promise<SuccessEntity> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWIDNF003`, {
        message: `User with ID ${userId} not found`,
      });
    }

    const currentPrivacy = parsePrivacy(user.privacy);
    const updatedPrivacy: PrivacySettings = {
      profile: dto.profile ?? currentPrivacy.profile,
      animeList: dto.animeList ?? currentPrivacy.animeList,
      mangaList: dto.mangaList ?? currentPrivacy.mangaList,
      tvList: dto.tvList ?? currentPrivacy.tvList,
      movieList: dto.movieList ?? currentPrivacy.movieList,
      connections: dto.connections ?? currentPrivacy.connections,
    };

    await this.userRepository.updatePrivacySettings(
      userId,
      user.username,
      updatedPrivacy,
      dto,
    );

    await this.cacheService.del(`user:privacy:${user.username}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // MFA — TOTP
  // ---------------------------------------------------------------------------

  async generateTotpSetup(userId: string): Promise<TotpSetupEntity> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
        message: 'User not found',
      });
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Runa',
      label: user.username,
      secret,
    });

    // Store pending TOTP secret for 10 minutes
    await this.cacheService.set(`pending-totp:${userId}`, secret, 600);

    return { secret, otpauthUrl };
  }

  async enableTotp(userId: string, code: string): Promise<string[]> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF002`, {
        message: 'User not found',
      });
    }

    const pendingSecret = await this.cacheService.get<string>(
      `pending-totp:${userId}`,
    );
    if (!pendingSecret) {
      throw new rrBadRequestException(`${this.moduleCode}TSHEOWNI001`, {
        message: 'TOTP setup has expired or was not initiated',
      });
    }

    const { valid } = await verify({ token: code, secret: pendingSecret });
    if (!valid) {
      throw new rrBadRequestException(`${this.moduleCode}IVC001`, {
        message: 'Invalid verification code',
      });
    }

    const encryptedSecret = encrypt(pendingSecret);
    const { backupCodes, hashedBackupCodes } =
      await this.maybeGenerateBackupCodes(user);

    await this.userRepository.updateUser(userId, {
      totpSecret: encryptedSecret,
      totpEnabled: true,
      ...(hashedBackupCodes.length > 0
        ? { backupCodes: hashedBackupCodes }
        : {}),
    });

    await this.cacheService.del(`pending-totp:${userId}`);
    await this.cacheService.del(`user:mfa-status:${userId}`);

    return backupCodes;
  }

  async disableTotp(userId: string): Promise<SuccessEntity> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF003`, {
        message: 'User not found',
      });
    }

    const remainingMfa = user.emailMfaEnabled || user.passkeys.length > 0;

    await this.userRepository.updateUser(userId, {
      totpEnabled: false,
      totpSecret: null,
      ...(!remainingMfa ? { backupCodes: [] } : {}),
    });

    await this.cacheService.del(`user:mfa-status:${userId}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // MFA — Email
  // ---------------------------------------------------------------------------

  async sendEmailMfaSetupCode(userId: string): Promise<SuccessEntity> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF004`, {
        message: 'User not found',
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`pending-email-mfa:${userId}`, code, 300); // 5 min

    await this.mailService.sendMail(
      user.email,
      'Runa - Enable Email Multi-Factor Authentication',
      `Your verification code is: ${code}. This code is valid for 5 minutes.`,
    );

    return { success: true };
  }

  async enableEmailMfa(userId: string, code: string): Promise<string[]> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF005`, {
        message: 'User not found',
      });
    }

    const cachedCode = await this.cacheService.get<string>(
      `pending-email-mfa:${userId}`,
    );
    if (!cachedCode || String(cachedCode) !== code) {
      throw new rrBadRequestException(`${this.moduleCode}IOEVC001`, {
        message: 'Invalid or expired verification code',
      });
    }

    const { backupCodes, hashedBackupCodes } =
      await this.maybeGenerateBackupCodes(user);

    await this.userRepository.updateUser(userId, {
      emailMfaEnabled: true,
      ...(hashedBackupCodes.length > 0
        ? { backupCodes: hashedBackupCodes }
        : {}),
    });

    await this.cacheService.del(`pending-email-mfa:${userId}`);
    await this.cacheService.del(`user:mfa-status:${userId}`);

    return backupCodes;
  }

  async disableEmailMfa(userId: string): Promise<SuccessEntity> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF006`, {
        message: 'User not found',
      });
    }

    const remainingMfa = user.totpEnabled || user.passkeys.length > 0;

    await this.userRepository.updateUser(userId, {
      emailMfaEnabled: false,
      ...(!remainingMfa ? { backupCodes: [] } : {}),
    });

    await this.cacheService.del(`user:mfa-status:${userId}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // MFA — Backup Codes
  // ---------------------------------------------------------------------------

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF007`, {
        message: 'User not found',
      });
    }

    const isMfaActive =
      user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;
    if (!isMfaActive) {
      throw new rrBadRequestException(`${this.moduleCode}MMBATGBC001`, {
        message: 'MFA must be active to generate backup codes',
      });
    }

    const { plain, hashed } = await this.generateBackupCodesRaw();

    await this.userRepository.updateUser(userId, { backupCodes: hashed });
    return plain;
  }

  // ---------------------------------------------------------------------------
  // MFA — Passkeys
  // ---------------------------------------------------------------------------

  async generatePasskeyRegisterOptions(userId: string): Promise<object> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF008`, {
        message: 'User not found',
      });
    }

    const rpID =
      process.env.RP_ID ??
      new URL(process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000').hostname;

    const options = await generateRegistrationOptions({
      rpName: 'Runa',
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.username,
      userDisplayName: user.displayName ?? user.username,
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key' as const,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await this.cacheService.set(
      `passkey-reg-challenge:${userId}`,
      options.challenge,
      300,
    );

    return options;
  }

  async verifyPasskeyRegister(
    userId: string,
    body: RegistrationResponseJSON,
    name?: string,
  ): Promise<string[]> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF009`, {
        message: 'User not found',
      });
    }

    const expectedChallenge = await this.cacheService.get<string>(
      `passkey-reg-challenge:${userId}`,
    );
    if (!expectedChallenge) {
      throw new rrBadRequestException(`${this.moduleCode}PRCE001`, {
        message: 'Passkey registration challenge expired',
      });
    }

    const rpID =
      process.env.RP_ID ??
      new URL(process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000').hostname;
    const expectedOrigin =
      process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Passkey verification failed';
      throw new rrBadRequestException(`${this.moduleCode}PVF001`, { message });
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new rrBadRequestException(`${this.moduleCode}PVF002`, {
        message: 'Passkey verification failed',
      });
    }

    const {
      id: credentialID,
      publicKey: credentialPublicKey,
      counter,
      transports,
    } = verification.registrationInfo.credential;

    const { backupCodes, hashedBackupCodes } =
      await this.maybeGenerateBackupCodes(user);

    await this.userRepository.createPasskey(
      {
        id: credentialID,
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: transports ?? body.response?.transports ?? [],
        name: name ?? 'Passkey',
        user: { connect: { id: user.id } },
      },
      userId,
      hashedBackupCodes.length > 0 ? hashedBackupCodes : undefined,
    );

    await this.cacheService.del(`passkey-reg-challenge:${userId}`);
    await this.cacheService.del(`user:mfa-status:${userId}`);
    await this.cacheService.del(`user:passkeys:${userId}`);

    return backupCodes;
  }

  async getPasskeys(userId: string): Promise<PasskeyEntity[]> {
    const cacheKey = `user:passkeys:${userId}`;
    const cached = await this.cacheService.get<PasskeyEntity[]>(cacheKey);
    if (cached) return cached;

    const passkeys = await this.userRepository.findPasskeysByUserId(userId);
    await this.cacheService.set(cacheKey, passkeys, TTL_HOUR);
    return passkeys;
  }

  async getMfaStatus(userId: string): Promise<MfaStatusEntity> {
    const cacheKey = `user:mfa-status:${userId}`;
    const cached = await this.cacheService.get<MfaStatusEntity>(cacheKey);
    if (cached) return cached;

    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF011`, {
        message: 'User not found',
      });
    }

    const status: MfaStatusEntity = {
      totpEnabled: user.totpEnabled,
      emailMfaEnabled: user.emailMfaEnabled,
      hasBackupCodes: user.backupCodes.length > 0,
      passkeysCount: user.passkeys.length,
    };

    await this.cacheService.set(cacheKey, status, TTL_HOUR);
    return status;
  }

  async deletePasskey(
    userId: string,
    passkeyId: string,
  ): Promise<SuccessEntity> {
    const user = await this.userRepository.findUserWithPasskeysById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF010`, {
        message: 'User not found',
      });
    }

    const passkey = user.passkeys.find((pk) => pk.id === passkeyId);
    if (!passkey) {
      throw new rrNotFoundException(`${this.moduleCode}PNF001`, {
        message: 'Passkey not found',
      });
    }

    const remainingPasskeysCount = user.passkeys.filter(
      (pk) => pk.id !== passkeyId,
    ).length;
    const remainingMfa =
      user.totpEnabled || user.emailMfaEnabled || remainingPasskeysCount > 0;

    await this.userRepository.deletePasskey(passkeyId, userId, !remainingMfa);

    await this.cacheService.del(`user:mfa-status:${userId}`);
    await this.cacheService.del(`user:passkeys:${userId}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------

  async getDevices(userId: string): Promise<DeviceEntity[]> {
    const cacheKey = `user:devices:${userId}`;
    const cached = await this.cacheService.get<DeviceEntity[]>(cacheKey);
    if (cached) return cached;

    const devices = await this.userRepository.findDevicesByUserId(userId);
    await this.cacheService.set(cacheKey, devices, TTL_HOUR);
    return devices;
  }

  async deleteDevice(userId: string, deviceId: string): Promise<SuccessEntity> {
    const device = await this.userRepository.findDeviceById(deviceId, userId);
    if (!device) {
      throw new rrNotFoundException(`${this.moduleCode}DNF001`, {
        message: 'Device not found',
      });
    }

    await this.userRepository.deleteDevice(deviceId);
    await this.cacheService.del(`user:devices:${userId}`);
    return { success: true };
  }

  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceEntity> {
    // If device already exists (same identity key), update it
    const existingDevice = await this.userRepository.findDeviceByIdentityKey(
      dto.identityKey,
      userId,
    );

    if (existingDevice) {
      const updated = await this.userRepository.updateDevice(
        existingDevice.id,
        {
          deviceName: dto.deviceName,
          userAgent: dto.userAgent ?? null,
          lastActiveAt: new Date(),
          signedPreKey: dto.signedPreKey,
        },
      );

      await this.cacheService.del(`user:devices:${userId}`);

      return {
        id: updated.id,
        deviceName: updated.deviceName,
        userAgent: updated.userAgent,
        lastActiveAt: updated.lastActiveAt,
        identityKey: updated.identityKey,
        signedPreKey: updated.signedPreKey,
        encryptedMasterKey: updated.encryptedMasterKey,
      };
    }

    // Create new device
    const device = await this.userRepository.createDevice({
      userId,
      deviceName: dto.deviceName,
      userAgent: dto.userAgent ?? null,
      identityKey: dto.identityKey,
      signedPreKey: dto.signedPreKey,
    });

    // Persist pre-keys if provided
    if (dto.preKeys && dto.preKeys.length > 0) {
      await this.userRepository.createPreKeys(device.id, dto.preKeys);
    }

    // Notify other devices of the new link request
    const otherDevices = await this.userRepository.findOtherDevicesByUserId(
      userId,
      device.id,
    );
    if (otherDevices.length > 0) {
      await this.userRepository.createDeviceLinkNotification(
        userId,
        device.id,
        dto.deviceName,
        dto.identityKey,
      );
    }

    await this.cacheService.del(`user:devices:${userId}`);

    return {
      id: device.id,
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      lastActiveAt: device.lastActiveAt,
      identityKey: device.identityKey,
      signedPreKey: device.signedPreKey,
      encryptedMasterKey: device.encryptedMasterKey,
    };
  }

  async getDeviceStatus(
    userId: string,
    deviceId: string,
  ): Promise<DeviceStatusEntity> {
    const status = await this.userRepository.getDeviceStatus(userId, deviceId);
    if (!status) {
      throw new rrNotFoundException(`${this.moduleCode}DNF002`, {
        message: 'Device not found',
      });
    }
    return status;
  }

  // ---------------------------------------------------------------------------
  // E2EE Keys
  // ---------------------------------------------------------------------------

  async getE2eeKeys(userId: string): Promise<E2eeKeysEntity> {
    const cacheKey = `user:e2ee-keys:${userId}`;
    const cached = await this.cacheService.get<E2eeKeysEntity>(cacheKey);
    if (cached) return cached;

    const keys = await this.userRepository.getE2eeKeys(userId);
    if (!keys) {
      throw new rrNotFoundException(`${this.moduleCode}UNF013`, {
        message: 'User not found',
      });
    }

    await this.cacheService.set(cacheKey, keys, TTL_HOUR);
    return keys;
  }

  async updateE2eeKeys(
    userId: string,
    userPublicKey: string,
    encryptedUserPrivateKey: string,
  ): Promise<User> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF012`, {
        message: 'User not found',
      });
    }

    const updated = await this.userRepository.updateE2eeKeys(
      userId,
      userPublicKey,
      encryptedUserPrivateKey,
    );

    await this.cacheService.del(`user:e2ee-keys:${userId}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------

  public async createApiKey(
    userId: string,
    name: string,
    expiresInDays?: number | null,
    app?: string,
  ): Promise<ApiKeyCreatedEntity> {
    const cleanApp = app || 'Polaris';
    const appPrefix = `${cleanApp.toLowerCase()}_`;
    const rawKey = appPrefix + crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);

    let expiresAt: Date | null = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const apiKey = await this.userRepository.createApiKey({
      name,
      app: cleanApp,
      keyPrefix,
      keyHash,
      expiresAt,
      user: { connect: { id: userId } },
    });

    return {
      ...apiKey,
      key: rawKey,
    };
  }

  public async findAllApiKeysByUser(userId: string): Promise<ApiKeyEntity[]> {
    const keys = await this.userRepository.findApiKeysByUser(userId);

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      app: key.app,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      truncatedKey: `${key.keyPrefix}...`,
    }));
  }

  public async regenerateApiKey(
    id: string,
    userId: string,
  ): Promise<ApiKeyCreatedEntity> {
    const existing = await this.userRepository.findApiKeyByIdAndUser(
      id,
      userId,
    );

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}AKNF001`, {
        message: 'API Key not found',
      });
    }

    const appPrefix = `${existing.app.toLowerCase()}_`;
    const rawKey = appPrefix + crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);

    let expiresAt: Date | null = null;
    if (existing.expiresAt) {
      const durationMs =
        existing.expiresAt.getTime() - existing.createdAt.getTime();
      expiresAt = new Date(Date.now() + durationMs);
    }

    const updated = await this.userRepository.updateApiKey(id, {
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      expiresAt,
    });

    return {
      ...updated,
      key: rawKey,
    };
  }

  public async deleteApiKey(
    id: string,
    userId: string,
  ): Promise<DeleteSuccessEntity> {
    const existing = await this.userRepository.findApiKeyByIdAndUser(
      id,
      userId,
    );

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}AKNF002`, {
        message: 'API Key not found',
      });
    }

    try {
      await this.userRepository.deleteApiKey(id);
    } catch {
      throw new rrInternalServerErrorException(`${this.moduleCode}FTDAK001`, {
        message: 'Failed to delete API Key',
      });
    }

    return {
      message: 'API Key deleted successfully',
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async generateBackupCodesRaw(): Promise<{
    plain: string[];
    hashed: string[];
  }> {
    const plain: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(5).toString('hex');
      plain.push(code);
      hashed.push(await bcrypt.hash(code, 10));
    }

    return { plain, hashed };
  }

  /**
   * Generates backup codes only when no MFA method is currently active.
   * Returns empty arrays when backup codes are not needed.
   */
  private async maybeGenerateBackupCodes(user: {
    totpEnabled: boolean;
    emailMfaEnabled: boolean;
    passkeys: { id: string }[];
  }): Promise<{ backupCodes: string[]; hashedBackupCodes: string[] }> {
    const isMfaAlreadyActive =
      user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;

    if (isMfaAlreadyActive) {
      return { backupCodes: [], hashedBackupCodes: [] };
    }

    const { plain, hashed } = await this.generateBackupCodesRaw();
    return { backupCodes: plain, hashedBackupCodes: hashed };
  }

  async searchUsers(
    currentUserId: string,
    query: string,
  ): Promise<UserSearchEntity[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }
    return this.userRepository.searchUsers(currentUserId, query.trim());
  }
}
