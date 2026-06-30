import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Put,
  Req,
  Delete,
} from '@nestjs/common';
import { parsePrivacy, UserService } from './user.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { User } from '@runa/database';
import { Public } from '../../common/decorators/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivacySettingsDto } from './dto/privacy-settings.dto';
import { Throttle } from '@nestjs/throttler';
import { rrNotFoundException } from 'src/providers/error';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  private readonly moduleCode = 'UsCtr-';

  constructor(private readonly usersService: UserService) {}

  @Public()
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('create')
  create(@Body() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }

  @Get('privacy')
  async getPrivacy(@Req() req: any) {
    const username = req.user.username;
    return this.usersService.getPrivacySettings(username);
  }

  @Put('privacy')
  async updatePrivacy(@Req() req: any, @Body() data: PrivacySettingsDto) {
    const userId = req.user.id;
    return this.usersService.updatePrivacySettings(userId, data);
  }

  @Put('settings')
  async updateSettings(
    @Req() req: any,
    @Body() data: { profileSettings: any },
  ) {
    const userId = req.user.id;
    return this.usersService.updateSettings(userId, data.profileSettings);
  }

  @Put('update')
  async update(@Req() req: any, @Body() data: UpdateUserDto) {
    const userId = req.user.id;
    return this.usersService.update(userId, data);
  }

  // --- User MFA Management Endpoints ---

  @Post('mfa/totp/setup')
  async setupTotp(@Req() req: any) {
    return this.usersService.generateTotpSetup(req.user.id);
  }

  @Post('mfa/totp/enable')
  async enableTotp(@Req() req: any, @Body('code') code: string) {
    return this.usersService.enableTotp(req.user.id, code);
  }

  @Post('mfa/totp/disable')
  async disableTotp(@Req() req: any) {
    return this.usersService.disableTotp(req.user.id);
  }

  @Post('mfa/email/send-setup-code')
  async sendEmailMfaSetupCode(@Req() req: any) {
    return this.usersService.sendEmailMfaSetupCode(req.user.id);
  }

  @Post('mfa/email/enable')
  async enableEmailMfa(@Req() req: any, @Body('code') code: string) {
    return this.usersService.enableEmailMfa(req.user.id, code);
  }

  @Post('mfa/email/disable')
  async disableEmailMfa(@Req() req: any) {
    return this.usersService.disableEmailMfa(req.user.id);
  }

  @Post('mfa/backup-codes/regenerate')
  async regenerateBackupCodes(@Req() req: any) {
    return this.usersService.regenerateBackupCodes(req.user.id);
  }

  @Post('mfa/passkey/register-options')
  async generatePasskeyRegisterOptions(@Req() req: any) {
    return this.usersService.generatePasskeyRegisterOptions(req.user.id);
  }

  @Post('mfa/passkey/register-verify')
  async verifyPasskeyRegister(
    @Req() req: any,
    @Body('response') response: any,
    @Body('name') name?: string,
  ) {
    return this.usersService.verifyPasskeyRegister(req.user.id, response, name);
  }

  @Get('mfa/passkeys')
  async getPasskeys(@Req() req: any) {
    return this.usersService.getPasskeys(req.user.id);
  }

  @Get('mfa/status')
  async getMfaStatus(@Req() req: any) {
    return this.usersService.getMfaStatus(req.user.id);
  }

  @Delete('mfa/passkey/:id')
  async deletePasskey(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deletePasskey(req.user.id, id);
  }

  // --- Device Management Endpoints ---

  @Get('devices')
  async getDevices(@Req() req: any) {
    return this.usersService.getDevices(req.user.id);
  }

  @Delete('device/:id')
  async deleteDevice(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deleteDevice(req.user.id, id);
  }

  @Post('device/register')
  async registerDevice(@Req() req: any, @Body() body: any) {
    return this.usersService.registerDevice(req.user.id, body);
  }

  @Get('device/status/:id')
  async getDeviceStatus(@Req() req: any, @Param('id') id: string) {
    return this.usersService.getDeviceStatus(req.user.id, id);
  }

  @Put(['e2ee-keys', 'e2e-keys'])
  async updateE2eeKeys(
    @Req() req: any,
    @Body() body: { userPublicKey: string; encryptedUserPrivateKey: string },
  ) {
    return this.usersService.updateE2eeKeys(
      req.user.id,
      body.userPublicKey,
      body.encryptedUserPrivateKey,
    );
  }

  @Get(['e2ee-keys', 'e2e-keys'])
  async getE2eeKeys(@Req() req: any) {
    return this.usersService.getE2eeKeys(req.user.id);
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWENF001`, {
        message: `User with email ${email} not found`,
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

  @Public()
  @Get(':username')
  async findOne(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UWWNF001`, {
        message: `User with username ${username} not found`,
      });
    }
    // Map connections to hide tokens, filtering out private ones
    const safeConnections =
      (user as any).connections
        ?.filter((conn: any) => !conn.private)
        ?.map((conn: any) => ({
          id: conn.id,
          provider: conn.provider,
          linkedUsername: conn.linkedUsername,
          linkedTo: conn.linkedTo,
          private: conn.private,
          metadata: conn.metadata,
        })) || [];

    const privacy = parsePrivacy(user.privacy);

    // Return only public fields
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      sidebarCardBackgroundUrl: (user as any).sidebarCardBackgroundUrl,
      profileSettings: user.profileSettings,
      private: privacy.profile,
      connections: safeConnections,
    };
  }
}
