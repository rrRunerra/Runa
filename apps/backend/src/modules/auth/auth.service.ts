import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignJWT } from 'jose';
import { PrismaService } from '../../providers/database/prisma.service';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  async login(data: LoginAuthDto) {
    const user = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.identifier }, { username: data.identifier }],
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passHash = await bcrypt.compare(data.password, user.passwordHash);

    if (!passHash) {
      throw new BadRequestException('Invalid password');
    }

    const token = await this.signToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        passwordChangedAt: user.passwordChangedAt,
      },
      token,
    };
  }

  async signToken(user: any) {
    return await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
      passwordChangedAt: user.passwordChangedAt,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }
}
