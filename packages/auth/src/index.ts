/// <reference path="./next-auth.d.ts" />
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@runa/database";
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
      },
      async authorize(credentials) {
        if (!credentials?.identifier && credentials?.isPasskeyOnly !== "true") {
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
  if (trigger === "update" && session) {
    if (session.displayName) token.displayName = session.displayName;
    if (session.avatarUrl || session.avatarUrl === null) token.avatarUrl = session.avatarUrl;
    if (session.sidebarCardBackgroundUrl || session.sidebarCardBackgroundUrl === null) {
      token.sidebarCardBackgroundUrl = session.sidebarCardBackgroundUrl;
    }
    if (session.username) token.username = session.username;
    if (session.email) token.email = session.email;
    if (session.permissions) token.permissions = session.permissions;
    if (session.accessToken) token.accessToken = session.accessToken;
    if (session.passwordChangedAt) token.passwordChangedAt = session.passwordChangedAt;

    try {
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
    token.iat = u.iat
    token.passwordChangedAt = u.passwordChangedAt
      ? Math.floor(new Date(u.passwordChangedAt).getTime() / 1000)
      : null;
  }

  if (
    typeof token.passwordChangedAt === "number" &&
    typeof token.iat === "number" &&
    token.iat < token.passwordChangedAt
  ) {
    throw new Error("Token expired due to password change");
  }

  if (token.accessToken) {
    const expiry = getJwtExpiry(token.accessToken as string);
    if (!expiry) {
      throw new Error("Invalid access token");
    }
    if (Date.now() >= expiry) {
      throw new Error("Access token expired");
    }
  }

  return token;
},
    async session({ session, token }) {
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
