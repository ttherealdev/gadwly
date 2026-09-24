import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";

// better-auth docs: https://www.better-auth.com/docs/adapters/prisma
// After changing this file, regenerate the DB schema with:
//   npx @better-auth/cli generate   (writes prisma/schema.prisma additions)
//   npx prisma db push
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Always show Google's account chooser instead of silently reusing
      // whichever Google account the browser is already signed into.
      prompt: "select_account",
    },
  },
  // Must stay the last plugin so it can set cookies on the response.
  plugins: [nextCookies()],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day of activity
    // getSession() reads a signed cookie instead of hitting Postgres on every
    // navigation. Trade-off: a revoked session (or a changed role) stays valid
    // until this window expires, so it is kept short. For sensitive actions
    // call getSession with `query: { disableCookieCache: true }`.
    cookieCache: {
      enabled: true,
      maxAge: 60, // seconds
    },
  },
  // One JOINed query for session + user instead of two round trips.
  // Requires the relations in prisma/schema.prisma (the CLI generates them).
  // better-auth <= 1.6 uses `experimental: { joins: true }` instead.
  advanced: {
    database: { joins: true },
  },
  // Every new user gets an empty preferences + exam-target row so the
  // dashboard widgets never have to special-case "no row yet".
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.userPreference.create({
            data: { userId: user.id },
          });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
