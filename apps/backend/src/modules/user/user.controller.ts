import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@runa/database';

import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { rrNotFoundException } from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { UserService, parsePrivacy } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  PrivacySettingsDto,
  UpdateSettingsDto,
  EnableTotpDto,
  EnableEmailMfaDto,
  VerifyPasskeyDto,
  RegisterDeviceDto,
  CreateApiKeyDto,
  IdParamDto,
  EmailParamDto,
  UsernameParamDto,
} from './user.dto';
import type {
  UserProfileEntity,
  UserSearchEntity,
  TotpSetupEntity,
  PasskeyEntity,
  MfaStatusEntity,
  DeviceEntity,
  DeviceStatusEntity,
  EncryptionKeysEntity,
  SuccessEntity,
  PrivacySettings,
  ApiKeyEntity,
  ApiKeyCreatedEntity,
  DeleteSuccessEntity,
} from './user.entities';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  private readonly moduleCode = 'UrCtr-';

  constructor(private readonly usersService: UserService) {}

  // ---------------------------------------------------------------------------
  // Collection: /users
  // ---------------------------------------------------------------------------

  @Public()
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post()
  async create(@Body() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }

  // ---------------------------------------------------------------------------
  // Singleton: /users/me — authenticated user
  // ---------------------------------------------------------------------------

  @Put('me')
  async update(
    @Req() req: ExtendedRequest,
    @Body() data: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(req.user!.id, data);
  }

  @Get('me/privacy')
  async getPrivacy(@Req() req: ExtendedRequest): Promise<PrivacySettings> {
    return this.usersService.getPrivacySettings(req.user!.username);
  }

  @Put('me/privacy')
  async updatePrivacy(
    @Req() req: ExtendedRequest,
    @Body() data: PrivacySettingsDto,
  ): Promise<SuccessEntity> {
    return this.usersService.updatePrivacySettings(req.user!.id, data);
  }

  @Put('me/settings')
  async updateSettings(
    @Req() req: ExtendedRequest,
    @Body() data: UpdateSettingsDto,
  ): Promise<User> {
    return this.usersService.updateSettings(req.user!.id, data);
  }

  // ---------------------------------------------------------------------------
  // MFA — TOTP
  // ---------------------------------------------------------------------------

  @Post('me/mfa/totp/setup')
  async setupTotp(@Req() req: ExtendedRequest): Promise<TotpSetupEntity> {
    return this.usersService.generateTotpSetup(req.user!.id);
  }

  @Post('me/mfa/totp/enable')
  async enableTotp(
    @Req() req: ExtendedRequest,
    @Body() data: EnableTotpDto,
  ): Promise<string[]> {
    return this.usersService.enableTotp(req.user!.id, data.code);
  }

  @Post('me/mfa/totp/disable')
  async disableTotp(@Req() req: ExtendedRequest): Promise<SuccessEntity> {
    return this.usersService.disableTotp(req.user!.id);
  }

  // ---------------------------------------------------------------------------
  // MFA — Email
  // ---------------------------------------------------------------------------

  @Post('me/mfa/email/send-setup-code')
  async sendEmailMfaSetupCode(
    @Req() req: ExtendedRequest,
  ): Promise<SuccessEntity> {
    return this.usersService.sendEmailMfaSetupCode(req.user!.id);
  }

  @Post('me/mfa/email/enable')
  async enableEmailMfa(
    @Req() req: ExtendedRequest,
    @Body() data: EnableEmailMfaDto,
  ): Promise<string[]> {
    return this.usersService.enableEmailMfa(req.user!.id, data.code);
  }

  @Post('me/mfa/email/disable')
  async disableEmailMfa(@Req() req: ExtendedRequest): Promise<SuccessEntity> {
    return this.usersService.disableEmailMfa(req.user!.id);
  }

  // ---------------------------------------------------------------------------
  // MFA — Backup Codes
  // ---------------------------------------------------------------------------

  @Post('me/mfa/backup-codes/regenerate')
  async regenerateBackupCodes(@Req() req: ExtendedRequest): Promise<string[]> {
    return this.usersService.regenerateBackupCodes(req.user!.id);
  }

  // ---------------------------------------------------------------------------
  // MFA — Passkeys
  // ---------------------------------------------------------------------------

  @Post('me/mfa/passkey/register-options')
  async generatePasskeyRegisterOptions(
    @Req() req: ExtendedRequest,
  ): Promise<object> {
    return this.usersService.generatePasskeyRegisterOptions(req.user!.id);
  }

  @Post('me/mfa/passkey/register-verify')
  async verifyPasskeyRegister(
    @Req() req: ExtendedRequest,
    @Body() data: VerifyPasskeyDto,
  ): Promise<string[]> {
    return this.usersService.verifyPasskeyRegister(
      req.user!.id,

      data.response as any,
      data.name,
    );
  }

  @Get('me/mfa/passkeys')
  async getPasskeys(@Req() req: ExtendedRequest): Promise<PasskeyEntity[]> {
    return this.usersService.getPasskeys(req.user!.id);
  }

  @Get('me/mfa/status')
  async getMfaStatus(@Req() req: ExtendedRequest): Promise<MfaStatusEntity> {
    return this.usersService.getMfaStatus(req.user!.id);
  }

  @Delete('me/mfa/passkeys/:id')
  async deletePasskey(
    @Req() req: ExtendedRequest,
    @Param() params: IdParamDto,
  ): Promise<SuccessEntity> {
    return this.usersService.deletePasskey(req.user!.id, params.id);
  }

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------

  @Get('me/devices')
  async getDevices(@Req() req: ExtendedRequest): Promise<DeviceEntity[]> {
    return this.usersService.getDevices(req.user!.id);
  }

  @Post('me/devices')
  async registerDevice(
    @Req() req: ExtendedRequest,
    @Body() body: RegisterDeviceDto,
  ): Promise<DeviceEntity> {
    return this.usersService.registerDevice(req.user!.id, body);
  }

  @Delete('me/devices/:id')
  async deleteDevice(
    @Req() req: ExtendedRequest,
    @Param() params: IdParamDto,
  ): Promise<SuccessEntity> {
    return this.usersService.deleteDevice(req.user!.id, params.id);
  }

  @Get('me/devices/:id/status')
  async getDeviceStatus(
    @Req() req: ExtendedRequest,
    @Param() params: IdParamDto,
  ): Promise<DeviceStatusEntity> {
    return this.usersService.getDeviceStatus(req.user!.id, params.id);
  }

  // ---------------------------------------------------------------------------
  // Encryption Keys
  // ---------------------------------------------------------------------------

  @Put('me/encryption-keys')
  async updateEncryptionKeys(
    @Req() req: ExtendedRequest,
    @Body() body: { userPublicKey: string; userMlKemPublicKey: string; encryptedUserPrivateKey: string },
  ): Promise<User> {
    return this.usersService.updateEncryptionKeys(
      req.user!.id,
      body.userPublicKey,
      body.userMlKemPublicKey,
      body.encryptedUserPrivateKey,
    );
  }

  @Get('me/encryption-keys')
  async getEncryptionKeys(@Req() req: ExtendedRequest): Promise<EncryptionKeysEntity> {
    return this.usersService.getEncryptionKeys(req.user!.id);
  }

  // ---------------------------------------------------------------------------
  // Resource lookups — /users/by-email/:email & /users/:username
  // ---------------------------------------------------------------------------

  @Get('by-email/:email')
  async findByEmail(@Param() params: EmailParamDto): Promise<UserSearchEntity> {
    const user = await this.usersService.findByEmail(params.email);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWENF001`, {
        message: `User with email ${params.email} not found`,
      });
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
    };
  }

  @Get()
  async findAll(
    @Req() req: ExtendedRequest,
    @Query('q') query: string,
  ): Promise<UserSearchEntity[]> {
    return this.usersService.searchUsers(req.user!.id, query);
  }

  @Get(':username/public-key')
  async getPublicKeyByUsername(
    @Param('username') username: string,
  ): Promise<{ id: string; username: string; userPublicKey: string | null; userMlKemPublicKey: string | null }> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF099`, {
        message: `User ${username} not found`,
      });
    }
    return {
      id: user.id,
      username: user.username,
      userPublicKey: user.userPublicKey,
      userMlKemPublicKey: user.userMlKemPublicKey,
    };
  }

  @Public()
  @Get(':username')
  async findOne(@Param() params: UsernameParamDto): Promise<UserProfileEntity> {
    const user = await this.usersService.findByUsername(params.username);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWWNF001`, {
        message: `User with username ${params.username} not found`,
      });
    }

    const safeConnections = (user.connections ?? [])
      .filter((conn) => !conn.private)
      .map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        linkedUsername: conn.linkedUsername,
        linkedTo: conn.linkedTo,
        private: conn.private,
        metadata: conn.metadata as Record<string, unknown> | null,
      }));

    const privacy = parsePrivacy(user.privacy);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      sidebarCardBackgroundUrl: user.sidebarCardBackgroundUrl,
      profileSettings: user.profileSettings as Record<
        string,
        string | number | boolean | null
      > | null,
      private: privacy.profile,
      connections: safeConnections,
    };
  }

  // ---------------------------------------------------------------------------
  // API Keys — /users/me/api-keys
  // ---------------------------------------------------------------------------

  @Get('me/api-keys')
  async findAllApiKeys(@Req() req: ExtendedRequest): Promise<ApiKeyEntity[]> {
    return this.usersService.findAllApiKeysByUser(req.user!.id);
  }

  @Post('me/api-keys')
  async createApiKey(
    @Req() req: ExtendedRequest,
    @Body() body: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedEntity> {
    return this.usersService.createApiKey(
      req.user!.id,
      body.name,
      body.expiresInDays,
      body.app,
    );
  }

  @Post('me/api-keys/:id/regenerate')
  async regenerateApiKey(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
  ): Promise<ApiKeyCreatedEntity> {
    return this.usersService.regenerateApiKey(id, req.user!.id);
  }

  @Delete('me/api-keys/:id')
  async removeApiKey(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
  ): Promise<DeleteSuccessEntity> {
    return this.usersService.deleteApiKey(id, req.user!.id);
  }
}
