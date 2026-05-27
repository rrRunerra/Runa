import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { User } from '@runa/database';
import { CreateUserDto } from './dto/create-user.dto';
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
    });
  }
}
