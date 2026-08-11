import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import * as bcrypt from 'bcrypt';

import { prisma } from '@runa/database';

import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { CacheService } from '../../../providers/cache/cache.service';
import {
  rrError,
  rrNotFoundException,
  rrUnauthorizedException,
} from 'src/providers/error';
import { Request } from 'express';

import type { AuthPayload, ExtendedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  private readonly guardCode: string = 'AhGd-';

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  private readonly isRedis =
    process.env.CACHE_DRIVER === 'redis' && process.env.REDIS_URL;

  private readonly passwordChangeCache = new Map<
    string,
    { timestamp: number; lastChecked: number }
  >();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<ExtendedRequest>();

    try {
      // API Key (Highest priority)
      let apiKey: string | string[] | undefined = request.headers['x-api-key'];

      if (apiKey && Array.isArray(apiKey)) {
        apiKey = apiKey[0];
      }

      if (apiKey) {
        const keyPrefix = apiKey.slice(0, 16);

        const record = await prisma.apiKey.findFirst({
          where: {
            keyPrefix,
          },
          select: {
            keyHash: true,
            id: true,
            lastUsedAt: true,
            expiresAt: true,
            user: {
              select: {
                id: true,
                username: true,
                permissions: true,
              },
            },
          },
        });

        if (!record) {
          throw new rrUnauthorizedException(`${this.guardCode}AKNF001`, {
            message: 'Api key not found',
          });
        }

        if (record.expiresAt && record.expiresAt < new Date()) {
          throw new rrUnauthorizedException(`${this.guardCode}AKE001`, {
            message: 'API Key expired',
          });
        }

        const valid: boolean = await bcrypt.compare(apiKey, record.keyHash);

        if (!valid) {
          throw new rrUnauthorizedException(`${this.guardCode}IAK001`, {
            message: 'Invalid API Key',
          });
        }

        const delay = new Date(Date.now() - 30 * 1000); // 30 sec delay so it doesnt spam the db
        if (!record.lastUsedAt || record.lastUsedAt < delay) {
          void prisma.apiKey
            .update({
              where: { id: record.id },
              data: { lastUsedAt: new Date() },
            })
            .catch((e) =>
              console.error('Failed to update api key lastUsedAt', e),
            );
        }

        request.user = {
          id: record.user.id,
          username: record.user.username,
          permissions: record.user.permissions,
        };

        return true;
      }

      const token = this.extractToken(request);

      if (!token) {
        if (isPublic) return true;
        throw new rrUnauthorizedException(`${this.guardCode}NATF001`, {
          message: 'No authentication token found',
        });
      }

      const { payload } = await jwtVerify<AuthPayload>(token, this.secret, {
        algorithms: ['HS256'],
      }).catch((e) => {
        throw new rrError(`${this.guardCode}FTVJT001`, {
          message: `Failed to verify JWT token`,
        });
      });

      // Verify if password has changed since token issuance (throttled to 5 minutes)
      const userId = payload.sub;
      const now = Date.now();
      const cached = this.passwordChangeCache.get(userId);

      let changedAt: number | null = null;

      if (cached && now - cached.lastChecked < 300000) {
        changedAt = cached.timestamp;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { passwordChangedAt: true },
        });

        const timestamp = user?.passwordChangedAt
          ? Math.floor(user.passwordChangedAt.getTime() / 1000)
          : null;

        this.passwordChangeCache.set(userId, {
          timestamp: timestamp || 0,
          lastChecked: now,
        });
        changedAt = timestamp;
      }

      if (changedAt && payload.iat && payload.iat < changedAt) {
        throw new rrUnauthorizedException(`${this.guardCode}TEDTPC001`, {
          message: 'Token expired due to a password change',
        });
      }

      const cacheKey = `user:permissions:${userId}`;
      let permissions = await this.cacheService.get<number[]>(cacheKey);

      if (!permissions) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { permissions: true },
        });

        if (!user) {
          throw new rrNotFoundException(`${this.guardCode}UNF001`, {
            message: 'User not found',
          });
        }

        permissions = user.permissions

        const ttl = this.isRedis ? 86400 : 2; // 2s TTL for in-memory cache to allow quick updates, 24h for Redis
        await this.cacheService.set(cacheKey, permissions, ttl);
      }

      request.user = {
        id: payload.sub,
        username: payload.name,
        email: payload.email,
        permissions: permissions || [],
      };
      return true;
    } catch (error) {
      if (isPublic) return true;
      throw error;
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    const url = new URL(request.url, `https://${request.headers['host']}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }

    return null;
  }
}
