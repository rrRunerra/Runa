/// <reference path="./next-auth.d.ts" />
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
const API_URL = process.env.NEST_API_URL || process.env.NEXT_PUBLIC_API_URL;

if (!process.env.NEXTAUTH_URL) {
  throw new Error("[AUTH] NEXTAUTH_URL env variable is not defined");
}

if (!API_URL) {
  throw new Error("[AUTH] API url is not defined");
}

function getJwtExpiry(tokenString: string): number | null {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        mfaSuccessToken: { label: "MFA Success Token", type: "text" },
        passkeyResponse: { label: "Passkey Response", type: "text" },
        isPasskeyOnly: { label: "Is Passkey Only", type: "text" },
        isLoginCode: { label: "Is Login Code", type: "text" },
        loginCode: { label: "Login Code", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.identifier &&
          credentials?.isPasskeyOnly !== "true" &&
          credentials?.isLoginCode !== "true"
        ) {
          throw new Error("Missing identifier");
        }

        const requestBody: any = {};
        if (credentials?.identifier) {
          requestBody.identifier = credentials.identifier;
        }

        if (credentials?.mfaSuccessToken) {
          requestBody.mfaSuccessToken = credentials.mfaSuccessToken;
        } else if (credentials?.isPasskeyOnly === "true") {
          requestBody.isPasskeyOnly = "true";
          requestBody.passkeyResponse = credentials.passkeyResponse;
        } else if (credentials?.isLoginCode === "true") {
          requestBody.isLoginCode = "true";
          requestBody.loginCode = credentials.loginCode;
        } else {
          if (!credentials.password) {
            throw new Error("Missing password");
          }
          requestBody.password = credentials.password;
        }

        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(
            "[AUTH] NextAuth authorize failed. Status:",
            res.status,
            "Response:",
            data,
          );
          throw new Error(data.message || "Authentication failed");
        }

        return {
          ...data.user,
          accessToken: data.token,
        };
      },
    }),
  ],

  pages: {
    signIn: "/polaris/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session) {
          if (session.displayName) token.displayName = session.displayName;
          if (session.avatarUrl || session.avatarUrl === null)
            token.avatarUrl = session.avatarUrl;
          if (
            session.sidebarCardBackgroundUrl ||
            session.sidebarCardBackgroundUrl === null
          ) {
            token.sidebarCardBackgroundUrl = session.sidebarCardBackgroundUrl;
          }
          if (session.username) token.username = session.username;
          if (session.email) token.email = session.email;
          if (session.permissions) token.permissions = session.permissions;
          if (session.accessToken) token.accessToken = session.accessToken;
          if (session.passwordChangedAt)
            token.passwordChangedAt = session.passwordChangedAt;
        }

        try {
          const { prisma } = await import("@runa/database");
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              permissions: true,
              displayName: true,
              avatarUrl: true,
              sidebarCardBackgroundUrl: true,
            },
          });

          if (dbUser) {
            token.permissions = dbUser.permissions;
            token.displayName = dbUser.displayName;
            token.avatarUrl = dbUser.avatarUrl;
            token.sidebarCardBackgroundUrl = dbUser.sidebarCardBackgroundUrl;
          }
        } catch (error) {
          console.error("[AUTH] Failed to fetch user on update:", error);
        }
      }

      if (user) {
        const u = user as {
          id: string;
          email: string;
          username: string;
          displayName: string | null;
          avatarUrl: string | null;
          sidebarCardBackgroundUrl: string | null;
          permissions: number[];
          accessToken: string;
          iat?: number;
          passwordChangedAt?: string | Date | null;
        };

        token.id = u.id;
        token.email = u.email;
        token.username = u.username;
        token.displayName = u.displayName;
        token.avatarUrl = u.avatarUrl;
        token.sidebarCardBackgroundUrl = u.sidebarCardBackgroundUrl;
        token.permissions = u.permissions;
        token.accessToken = u.accessToken;
        token.iat = u.iat;
        token.passwordChangedAt = u.passwordChangedAt
          ? Math.floor(new Date(u.passwordChangedAt).getTime() / 1000)
          : null;
      }

      // Initialize randomized check interval for this session (jittered between 30 and 90 seconds)
      if (!token.permissionsCheckInterval) {
        token.permissionsCheckInterval =
          Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
        token.permissionsLastChecked = Date.now();
      }

      // Check if it's time to verify permissions against Redis cache
      const now = Date.now();
      const lastChecked = token.permissionsLastChecked || 0;
      const interval = token.permissionsCheckInterval || 60000;

      if (token.id && (now - lastChecked > interval)) {
        try {
          const { createCacheClient } = await import("@runa/cache");
          const cache = createCacheClient();
          const cacheKey = `user:permissions:${token.id}`;

          let permissions = await cache.get<number[]>(cacheKey);
          if (permissions === null) {
            // Redis cache was invalidated/cleared. Re-query from DB and rebuild cache.
            const { prisma } = await import("@runa/database");
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { permissions: true },
            });
            if (dbUser) {
              permissions = dbUser.permissions;
              await cache.set(cacheKey, permissions, 86400); // 24h
            }
          }

          if (permissions !== null) {
            token.permissions = permissions;
          }
          token.permissionsLastChecked = now;
        } catch (error) {
          console.error("[AUTH] Background permission sync failed:", error);
        }
      }

      if (
        typeof token.passwordChangedAt === "number" &&
        typeof token.iat === "number" &&
        token.iat < token.passwordChangedAt
      ) {
        return { ...token, error: "TokenExpired" };
      }

      if (token.accessToken) {
        const expiry = getJwtExpiry(token.accessToken as string);
        if (!expiry || Date.now() >= expiry) {
          return { ...token, error: "AccessTokenExpired" };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.error) {
        return {
          ...session,
          error: token.error as string,
          user: undefined as any,
        };
      }
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          username: token.username,
          displayName: token.displayName,
          avatarUrl: token.avatarUrl,
          sidebarCardBackgroundUrl: token.sidebarCardBackgroundUrl,
          permissions: token.permissions,
        };
        session.accessToken = token.accessToken;
        session.user.passwordChangedAt = token.passwordChangedAt;
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV !== "production",
};

export const auth = () => getServerSession(authOptions);
