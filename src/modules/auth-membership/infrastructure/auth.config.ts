import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { verifyCredentials } from "../application/register.service";

function createAuthInstance() {
  const secret = serverEnv.authSecret;
  if (!secret) return null;

  return NextAuth({
    adapter: PrismaAdapter(prisma),
    secret,
    session: { strategy: "jwt" },
    pages: {
      signIn: "/login",
    },
    providers: [
      Credentials({
        name: "Email",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!email || !password) return null;
          return verifyCredentials(email, password);
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          if (user.name) token.name = user.name;
          if (user.email) token.email = user.email;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) {
          if (token.id) session.user.id = token.id as string;
          if (token.name) session.user.name = token.name as string;
          if (token.email) session.user.email = token.email as string;
        }
        return session;
      },
    },
  });
}

const authInstance = createAuthInstance();

export const handlers = authInstance?.handlers;
export const auth = authInstance?.auth;
export const signIn = authInstance?.signIn;
export const signOut = authInstance?.signOut;

export function isAuthConfigured(): boolean {
  return authInstance !== null;
}
