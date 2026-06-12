export class AuthResponseEntity {
  user: {
    id: string;
    email: string;
    username: string;
    permissions: number[];
    avatarUrl: string | null;
    displayName: string | null;
    passwordChangedAt: Date | null;
  };
  token: string;
}
