# جدولي (Gadwly)

An Arabic-first (RTL, `ar` default / `en` toggle) study-schedule dashboard:
weekly schedule table, a standalone focus timer, an exam countdown with
fuzzy granularity, and geolocated prayer times with an adhan alert.



## Stack

- **Next.js 16**
- **Prisma 7** → Postgres
- **tRPC 11**
  client ⇄ server data (schedule CRUD, pomodoro logging, preferences)
- **shadcn-style components**
- **next-intl** for `ar`/`en`, Arabic as default at `/`, English at `/en`
- **better-auth** with the Prisma adapter + Google OAuth only

## Getting started

```bash
bun install
cp .env.example .env        # fill in DATABASE_URL + Google OAuth keys
bun db:push          # creates tables from prisma/schema.prisma
bun run dev
```

Google OAuth: console.cloud.google.com → Credentials → OAuth client ID →
Web application → authorized redirect URI:
`http://localhost:3000/api/auth/callback/google`.
