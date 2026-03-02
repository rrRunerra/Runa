import { User } from '@runa/database';

export class AuthResponseEntity {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    avatarUrl: string | null;
    displayName: string | null;
    passwordChangedAt: Date | null;
  };
  token: string;
}
