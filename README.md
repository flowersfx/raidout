# RAIDOUT

Stage tech rider consolidation tool for nightclub and event managers. Collect individual tech riders from electronic music artists and produce one consolidated technical specification for venue FOH engineers.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **PostgreSQL** (Neon, AWS eu-central-1) via Prisma ORM
- **Zustand** for client state
- **Tailwind CSS** for styling
- **@dnd-kit** for drag-and-drop
- **SVG** for stage plot rendering

## Getting Started

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed creates a dev user and a sample event with positions and artists.

## Project Structure

```
app/                    Next.js App Router pages
components/
  editor/               Event editor components
    artist/             Artist card + form
    foh/                FOH summary cards + master input list
    running-order/      Timeline bar + changeover badges
    stage/              Stage SVG + position form
    tabs/               Tab content components
  share/                Shareable read-only view
  ui/                   Reusable UI primitives (Button, Input, Badge, etc.)
hooks/                  Custom hooks (drag, changeovers)
lib/
  actions/              Server actions (CRUD, snapshot save)
  utils/                Time parsing, midnight crossing, cn helper
store/                  Zustand event store
types/                  TypeScript models
prisma/                 Schema + migrations + seed
```

## Key Features

- **Stage plot editor** — drag, rotate, resize, color-code positions on a cm-scale SVG grid
- **Multi-select & multi-drag** — Ctrl/Shift+click or marquee select, drag groups with snap-to-grid
- **Artist management** — time slots, multiple sets, arrival/soundcheck times, gear, routing
- **Midnight crossing** — times like 23:45–00:15 handled correctly throughout
- **Running order** — multi-lane timeline (one lane per position) + multi-column grid with changeover indicators
- **FOH summary** — per-artist cards + consolidated master input list
- **Shareable link** — read-only view via share token, no auth required
- **Auto-save** — debounced snapshot save to Postgres

## Deployment

Hosted on Vercel with functions pinned to `fra1` (Frankfurt) in `vercel.json`, next to the Neon database in `aws-eu-central-1`. Keep the two in the same region: every query is a round trip from the function. See SPEC.md for more deployment notes.

## Environment Variables

```
# Pooled connection (host contains "-pooler"), used by the app at runtime
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"
# Direct connection (no "-pooler"), used by prisma migrate
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
```
