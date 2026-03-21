# RAIDOUT

Stage tech rider consolidation tool for nightclub and event managers. Collect individual tech riders from electronic music artists and produce one consolidated technical specification for venue FOH engineers.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **SQLite** via Prisma ORM
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
- **Auto-save** — debounced snapshot save to SQLite

## Deployment

See SPEC.md for full deployment notes. Current database is SQLite (file-based) — for production, switch the Prisma datasource to Postgres with a one-line change.

## Environment Variables

```
DATABASE_URL="file:./dev.db"
```
