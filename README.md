# جدولي (Gadwly)

An Arabic-first (RTL, `ar` default / `en` toggle) study-schedule dashboard:
weekly schedule table, a standalone focus timer, an exam countdown with
fuzzy granularity, and geolocated prayer times with an adhan alert.

## Stack

- **Next.js 15** (App Router, Turbopack) + **React 19**
- **Prisma 8** → Postgres
- **tRPC 11** (`@trpc/react-query` + `@tanstack/react-query`) for all
  client ⇄ server data (schedule CRUD, pomodoro logging, preferences)
- **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js` needed)
- **shadcn-style components**, hand-rolled on Radix primitives (not the
  CLI, per your note — but same structure so `npx shadcn add` still works
  if you want more later)
- **next-intl** for `ar`/`en`, Arabic as default at `/`, English at `/en`
- **better-auth** with the Prisma adapter + Google OAuth only

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL + Google OAuth keys
npx prisma db push          # creates tables from prisma/schema.prisma
npx @better-auth/cli generate   # double-check the auth tables match your
                                 # installed better-auth version, in case
                                 # the API shifted since this was written
npm run dev
```

Google OAuth: console.cloud.google.com → Credentials → OAuth client ID →
Web application → authorized redirect URI:
`http://localhost:3000/api/auth/callback/google`.

