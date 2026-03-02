import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { functional, IConnection } from "../../api";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const connection: IConnection = {
          host: `http://localhost:${process.env.NEST_PORT}`,
        };

        const res = await functional.auth.login(connection, {
          identifier: credentials.identifier,
          password: credentials.password,
        });

        if (!res.user) {
          throw new Error("Login failed");
        }

        return {
          ...res.user,
          accessToken: res.token,
        };
      },
    }),
  ],

  pages: {
    signIn: `${process.env.NEXT_PUBLIC_AUTH}/login`,
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.displayName) token.displayName = session.displayName;
        if (session.avatarUrl || session.avatarUrl === null)
          token.avatarUrl = session.avatarUrl;
        if (session.username) token.username = session.username;
        if (session.email) token.email = session.email;
        if (session.role) token.role = session.role;
        if (session.accessToken) token.accessToken = session.accessToken;
        if (session.passwordChangedAt)
          token.passwordChangedAt = session.passwordChangedAt;
      }

      const u = user as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (u) {
        token.id = u.id;
        token.email = u.email;
        token.username = u.username;
        token.displayName = u.displayName;
        token.avatarUrl = u.avatarUrl;
        token.role = u.role;
        token.accessToken = u.accessToken;

        // Store passwordChangedAt timestamp
        token.passwordChangedAt = u.passwordChangedAt
          ? Math.floor(new Date(u.passwordChangedAt).getTime() / 1000)
          : null;
      }

      // Check if password has changed since token issue
      if (
        typeof token.passwordChangedAt === "number" &&
        typeof token.iat === "number"
      ) {
        // Allow for a small clock drift or processing delay (e.g. 1 second)
        // If token issued BEFORE password change, it's invalid
        if (token.iat < token.passwordChangedAt) {
          return Promise.reject(
            new Error("Token expired due to password change"),
          );
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
          role: token.role,
        };
        session.accessToken = token.accessToken;
        session.passwordChangedAt = token.passwordChangedAt;
      }
      return session;
    },
  },

  debug: true,
};

export const auth = () => getServerSession(authOptions);
