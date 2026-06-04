import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { User } from '@runa/database';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivacySettingsDto } from './dto/privacy-settings.dto';
import bcrypt from 'bcrypt';

const RESERVED_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "null", "return", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "package", "private", "protected", "public", "static",
  "any", "boolean", "constructor", "declare", "get", "module",
  "require", "number", "set", "string", "symbol", "type", "undefined",
  "unknown", "never", "readonly", "keyof", "infer", "as", "from",
  "of", "namespace", "interface", "implements", "enum", "await",
  "select", "insert", "update", "drop", "truncate", "alter",
  "create", "table", "database", "index", "use", "where", "join",
  "left", "right", "inner", "outer", "on", "and", "or", "not",
  "union", "values", "into", "order", "by", "group", "having",
  "limit", "offset", "distinct", "all", "exists", "like", "between", "is"
]);

export interface PrivacySettings {
  [key: string]: boolean;
  profile: boolean;
  animeList: boolean;
  mangaList: boolean;
  tvList: boolean;
  movieList: boolean;
  connections: boolean;
}

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

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(UserService.name);

  async create(data: CreateUserDto): Promise<User> {
    const errors: string[] = [];
    const sanitizedUsername = data.username.replace(/[^a-zA-Z0-9_]/g, "");
    const lowerUsername = sanitizedUsername.toLowerCase();

    if (RESERVED_KEYWORDS.has(lowerUsername)) {
      errors.push('Username cannot be a reserved keyword.');
    }

    const existing = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: lowerUsername }],
      },
    });

    if (existing?.email.toLowerCase() === data.email.toLowerCase()) {
      errors.push('Email is already taken.');
    }

    if (existing?.username.toLowerCase() === lowerUsername) {
      errors.push('Username is already taken.');
    }

    if (errors.length > 0) {
      throw new ConflictException(errors);
    }

    const hasAdmin = await this.prisma.client.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    });

    const passHash = await bcrypt.hash(data.password, 10);

    return await this.prisma.client.user
      .create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username.toLowerCase(),
          passwordHash: passHash,
          role: hasAdmin ? 'USER' : 'ADMIN',
        },
      })
      .catch((err) => {
        this.logger.error(err);
        throw new BadRequestException('Failed to create user');
      });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        connections: true,
      },
    });
  }

  async update(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateData: any = {};
    let passwordOrEmailChanged = false;

    // Email change check
    if (data.email !== undefined && data.email.toLowerCase() !== user.email) {
      passwordOrEmailChanged = true;

      // Ensure the email is not already taken
      const existingEmail = await this.prisma.client.user.findFirst({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictException('Email is already taken.');
      }
      updateData.email = data.email.toLowerCase();
    }

    // Password change check
    if (data.newPassword !== undefined) {
      passwordOrEmailChanged = true;
    }

    // Enforce password confirmation for password or email changes
    if (passwordOrEmailChanged) {
      if (!data.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change email or password.',
        );
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Invalid current password.');
      }

      if (data.newPassword !== undefined) {
        updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
        updateData.passwordChangedAt = new Date();
      }
    }

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    if (data.bannerUrl !== undefined) {
      updateData.bannerUrl = data.bannerUrl;
    }

    if (data.sidebarCardBackgroundUrl !== undefined) {
      updateData.sidebarCardBackgroundUrl = data.sidebarCardBackgroundUrl;
    }

    return await this.prisma.client.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getPrivacySettings(username: string): Promise<PrivacySettings> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        privacy: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }

    return parsePrivacy(user.privacy);
  }

  async updatePrivacySettings(userId: string, dto: PrivacySettingsDto): Promise<{ success: boolean }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        privacy: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const currentPrivacy = parsePrivacy(user.privacy);
    const updatedPrivacy: PrivacySettings = {
      profile: dto.profile !== undefined ? dto.profile : currentPrivacy.profile,
      animeList: dto.animeList !== undefined ? dto.animeList : currentPrivacy.animeList,
      mangaList: dto.mangaList !== undefined ? dto.mangaList : currentPrivacy.mangaList,
      tvList: dto.tvList !== undefined ? dto.tvList : currentPrivacy.tvList,
      movieList: dto.movieList !== undefined ? dto.movieList : currentPrivacy.movieList,
      connections: dto.connections !== undefined ? dto.connections : currentPrivacy.connections,
    };

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { privacy: updatedPrivacy },
      }),
      ...(dto.animeList !== undefined
        ? [
            this.prisma.client.aquilaAnimeUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.animeList },
            }),
          ]
        : []),
      ...(dto.mangaList !== undefined
        ? [
            this.prisma.client.aquilaMangaUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.mangaList },
            }),
          ]
        : []),
      ...(dto.tvList !== undefined
        ? [
            this.prisma.client.aquilaTvUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.tvList },
            }),
          ]
        : []),
      ...(dto.movieList !== undefined
        ? [
            this.prisma.client.aquilaMovieUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.movieList },
            }),
          ]
        : []),
      ...(dto.connections !== undefined
        ? [
            this.prisma.client.connections.updateMany({
              where: { username: user.username },
              data: { private: dto.connections },
            }),
          ]
        : []),
    ]);

    return { success: true };
  }


  async updateSettings(userId: string, settings: any) {
    return await this.prisma.client.user.update({
      where: { id: userId },
      data: { profileSettings: settings },
    });
  }
}
