import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      sidebarCardBackgroundUrl?: string | null;
      permissions: number[];
      passwordChangedAt?: number | null;
    };
    accessToken?: string;
    iat?: number;
    error?: string;
  }

  interface User {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    sidebarCardBackgroundUrl?: string | null;
    permissions: number[];
    accessToken?: string;
    passwordChangedAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    sidebarCardBackgroundUrl?: string | null;
    permissions: number[];
    accessToken?: string;
    passwordChangedAt?: number | null;
    iat?: number;
    permissionsLastChecked?: number;
    permissionsCheckInterval?: number;
    error?: string;
  }
}
