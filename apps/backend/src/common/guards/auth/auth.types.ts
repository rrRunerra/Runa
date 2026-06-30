import { Request } from 'express';
import { JWTPayload } from 'jose';

export interface AuthPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  permissions: string[];
  avatarUrl: string | null;
  displayName: string | null;
  passwordChangedAt: string | null;
}

export interface ExtendedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
    permissions: number[];
  };
}
