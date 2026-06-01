import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { ConnectionLinkedTo, ConnectionProvider } from '@runa/database';

@Injectable()
export class ConnectionService {
  constructor(private readonly prisma: PrismaService) {}

  private toProvider(value: string): ConnectionProvider {
    const upper = value.toUpperCase() as ConnectionProvider;
    if (!Object.values(ConnectionProvider).includes(upper)) {
      throw new BadRequestException(`Invalid provider: ${value}`);
    }
    return upper;
  }

  private readonly PROVIDERS: Record<string, any> = {
    anilist: {
      authUrl: 'https://anilist.co/api/v2/oauth/authorize',
      tokenUrl: 'https://anilist.co/api/v2/oauth/token',
      clientId: process.env.ANILIST_CLIENT_ID,
      clientSecret: process.env.ANILIST_CLIENT_SECRET,
      profileUrl: 'https://graphql.anilist.co',
      async getProfile(token: string) {
        const res = await fetch(this.profileUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{ Viewer { id name } }',
          }),
        });
        const { data } = await res.json();
        return { id: String(data.Viewer.id), username: data.Viewer.name };
      },
    },
    mal: {
      authUrl: 'https://myanimelist.net/v1/oauth2/authorize',
      tokenUrl: 'https://myanimelist.net/v1/oauth2/token',
      clientId: process.env.MAL_CLIENT_ID,
      clientSecret: process.env.MAL_CLIENT_SECRET,
      profileUrl: 'https://api.myanimelist.net/v2/users/@me',
      async getProfile(token: string) {
        const res = await fetch(this.profileUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return { id: String(data.id), username: data.name };
      },
    },
    simkl: {
      authUrl: 'https://simkl.com/oauth/authorize',
      tokenUrl: 'https://api.simkl.com/oauth/token',
      clientId: process.env.SIMKL_CLIENT_ID,
      clientSecret: process.env.SIMKL_CLIENT_SECRET,
      profileUrl: 'https://api.simkl.com/users/settings',
      async getProfile(token: string) {
        const res = await fetch(this.profileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'simkl-api-key': process.env.SIMKL_CLIENT_ID!,
          },
        });
        const data = await res.json();
        return { id: String(data.user.id), username: data.user.name };
      },
    },
  };

  async getAuthUrl(providerId: string, token: string, redirectUrl?: string) {
    const provider = this.PROVIDERS[providerId.toLowerCase()];
    if (!provider) {
      throw new BadRequestException(`Invalid provider: ${providerId}`);
    }

    const clientId = provider.clientId?.trim().replace(/^"|"$/g, '');
    if (!clientId) {
      throw new BadRequestException(
        `Missing configuration for provider: ${providerId}`,
      );
    }

    // Backend redirect back to itself
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/callback`;

    const url = new URL(provider.authUrl);
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    
    // Encode token and redirectUrl together in the state string
    const state = redirectUrl ? `${token}:::${redirectUrl}` : token;
    url.searchParams.append('state', state);

    if (providerId.toLowerCase() === 'mal') {
      const codeChallenge = (
        process.env.MAL_CODE_CHALLANGE_STRING ||
        'fghnxfu5zer5uze5uzrthzfdhze5yherthd4rtze4g463rtgdzrgzde4h4h'
      ).trim();
      url.searchParams.append('code_challenge', codeChallenge);
      url.searchParams.append('code_challenge_method', 'plain');
    }

    return url.toString();
  }

  async handleCallback(providerId: string, code: string, username: string) {
    const provider = this.PROVIDERS[providerId.toLowerCase()];
    if (!provider) {
      throw new BadRequestException(`Invalid provider: ${providerId}`);
    }

    const clientId = provider.clientId?.trim().replace(/^"|"$/g, '');
    const clientSecret = provider.clientSecret?.trim().replace(/^"|"$/g, '');

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        `Missing configuration for provider: ${providerId}`,
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/callback`;

    // 1. Exchange code for token
    const isSimkl = providerId.toLowerCase() === 'simkl';
    const tokenPayload: any = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    if (providerId.toLowerCase() === 'mal') {
      const codeVerifier = (
        process.env.MAL_CODE_CHALLANGE_STRING ||
        'fghnxfu5zer5uze5uzrthzfdhze5yherthd4rtze4g463rtgdzrgzde4h4h'
      ).trim();
      tokenPayload.code_verifier = codeVerifier;
    }

    const headers: Record<string, string> = {
      'Content-Type': isSimkl
        ? 'application/json'
        : 'application/x-www-form-urlencoded',
      'User-Agent': 'Astral-App/1.0',
    };

    if (!isSimkl) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      body: isSimkl
        ? JSON.stringify(tokenPayload)
        : new URLSearchParams(tokenPayload),
      headers,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    // 2. Fetch profile info
    const profile = await provider.getProfile(accessToken);

    // 3. Save connection
    await this.upsert(username, {
      provider: providerId.toUpperCase(),
      connectionId: profile.id,
      linkedUsername: profile.username,
      accessToken,
      refreshToken,
      expiresAt,
      linkedTo: ConnectionLinkedTo.AQUILA,
    });

    return { success: true };
  }

  async findAll(username: string, linkedTo?: ConnectionLinkedTo) {
    return this.prisma.client.connections.findMany({
      where: {
        username,
        linkedTo: linkedTo ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        linkedUsername: true,
        connectionId: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        linkedTo: true,
      },
    });
  }

  async upsert(
    username: string,
    data: {
      provider: string;
      linkedUsername?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      connectionId?: string;
      linkedTo?: ConnectionLinkedTo;
    },
  ) {
    const provider = this.toProvider(data.provider);

    const connection = await this.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider },
      },
      update: {
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
      },
      create: {
        username,
        provider,
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
      },
    });

    return {
      id: connection.id,
      provider: connection.provider,
      linkedUsername: connection.linkedUsername,
      connectionId: connection.connectionId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      expiresAt: connection.expiresAt,
      linkedTo: connection.linkedTo,
    };
  }

  async remove(username: string, providerRaw: string) {
    const provider = this.toProvider(providerRaw);

    const existing = await this.prisma.client.connections.findUnique({
      where: {
        username_provider: { username, provider },
      },
    });

    if (!existing) {
      throw new NotFoundException('Connection not found');
    }

    await this.prisma.client.connections.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }
}
