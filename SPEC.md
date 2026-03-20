# RAIDOUT — Stage Tech Rider Consolidation Tool

## What This Is

A web app for nightclub/event managers who collect individual tech riders from electronic music artists and need to produce **one consolidated technical specification** for the venue's FOH engineer and technicians.

The typical workflow today: receive 4–7 artist riders (PDF/email), manually draw a top-down stage layout in Photoshop showing table positions and equipment, then email the venue a cobbled-together summary. This tool replaces that.

## Core User Story

> As an event manager, I create an **event** with a stage layout and time slots. I add **artists**, enter their gear, venue requirements, signal routing, and table space needs. I assign each artist to a **stage position** and time slot. The app generates a **shareable consolidated tech rider** with: a top-down stage plot, per-artist equipment/routing details, a master input list for FOH, and a running order with changeover timing.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: SQLite via Prisma (simple, zero-config, easy to migrate to Postgres later)
- **Styling**: Tailwind CSS
- **Stage plot rendering**: SVG (server-renderable, printable, no canvas)
- **PDF export**: `@react-pdf/renderer` or `puppeteer` (for print-quality output from the same views)
- **Deployment target**: Vercel (or any Node-compatible host)
- **Auth**: NextAuth.js with a simple email/password or magic link flow (keep it minimal — this isn't a social app)

## Data Model

```
Event
  id            String    @id @default(cuid())
  name          String              // "Syntax Error: STACK OVERFLOW"
  date          DateTime
  venue         String
  stageWidth    Int       @default(800)   // visual units for SVG
  stageDepth    Int       @default(400)
  shareToken    String    @unique @default(cuid())  // for public read-only link
  createdBy     String              // user id
  positions     Position[]
  artists       Artist[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

Position
  id            String    @id @default(cuid())
  eventId       String
  event         Event     @relation(fields: [eventId])
  name          String              // "DJ Booth A", "Live Act B"
  x             Int                 // position on stage SVG
  y             Int
  width         Int                 // table/booth footprint
  height        Int
  color         String    @default("#00e5ff")  // for visual coding
  artists       Artist[]

Artist
  id            String    @id @default(cuid())
  eventId       String
  event         Event     @relation(fields: [eventId])
  positionId    String?
  position      Position? @relation(fields: [positionId])
  name          String              // DJ/act name
  startTime     String              // "22:30" — store as HH:MM string
  endTime       String              // "23:45"
  tableMin      String?             // "160×60 cm" — freeform, artists specify differently
  gearBrings    String    @default("")  // multi-line: what they bring
  venueNeeds    String    @default("")  // multi-line: what venue must provide
  routing       String    @default("")  // multi-line: signal routing spec
  notes         String    @default("")
  sortOrder     Int       @default(0)

User
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  events        Event[]   // via createdBy
```

## Pages / Routes

```
/                         Landing / dashboard (list of user's events)
/event/new                Create new event
/event/[id]               Event editor (tabbed interface, see below)
/event/[id]/share         Public read-only consolidated rider (via shareToken)
/event/[id]/share/pdf     PDF download endpoint
```

## Event Editor — Tabbed Interface

The event editor is the core UI. Five tabs:

### 1. Event Setup
- Event name, date, venue
- Stage dimensions (width × depth in arbitrary units — just for the SVG proportions)
- **Table/Booth positions**: add/remove positions, set name, color, and drag or input X/Y/W/H coordinates on the stage
- Positions should be draggable directly on a mini stage preview

### 2. Artists
- List of artists as clickable cards/chips, sorted by start time
- Color-coded by their assigned position
- Click to expand inline editor with fields:
  - Name, assigned position (dropdown), start time, end time
  - Min table space (freeform text, e.g. "160×60 cm")
  - **Gear they bring** (multi-line textarea)
  - **Venue must provide** (multi-line textarea)
  - **Signal routing** (multi-line textarea, e.g. "Ch 1-2: Stereo master from DJM (XLR)")
  - Notes (freeform)
- Duplicate and delete actions
- Drag to reorder (or auto-sort by time)

### 3. Stage Plot (read-only view)
- Top-down SVG of the stage
- Positions rendered as labeled rectangles with their color
- Artists assigned to each position listed inside/below the rectangle
- Key gear items annotated near each position
- "FRONT OF HOUSE" label at bottom edge
- Grid lines for spatial reference
- This is the "money view" — it replaces the Photoshop drawing

### 4. FOH Summary
- **Per-artist cards** showing: name, position, time slot, gear they bring, venue must provide, signal routing, table space, notes
- **Consolidated master input/channel list**: every routing line from every artist, grouped by position or by channel number, with artist name attached
- This is what the venue sound tech actually works from

### 5. Running Order
- **Visual timeline bar**: horizontal, color-coded blocks per artist
- **Detailed list**: chronological with start/end times, artist name, position
- **Changeover indicators**: calculated gaps between consecutive artists, shown as warnings (overlap = red, tight = yellow, comfortable = green)
- Changeover at same position vs different position should be visually distinct (same-position changeovers are the critical ones)

## Shareable Read-Only View (`/event/[id]/share`)

- Accessed via `shareToken` — no auth required
- Clean, printable layout combining: event header, stage plot SVG, running order, and per-artist FOH cards
- "Download PDF" button
- No editing, no navigation to other events
- This is the URL you send to the venue

## Design Direction

- **Dark theme** as default (matches backstage/tech context), with a clean print mode (white background, high contrast)
- Monospace for technical data (channel lists, routing, gear lists)
- Color-coding tied to stage positions throughout the entire app (artist chips, timeline blocks, FOH cards, stage plot)
- Dense but readable — this is a working tool, not a marketing site
- Mobile-responsive but desktop-first (you're building this at a desk, not on your phone)

## PDF Export

The PDF should contain:
1. **Page 1**: Event header (name, date, venue, contact) + stage plot SVG
2. **Page 2**: Running order table
3. **Pages 3+**: Per-artist FOH detail cards (1–2 per page depending on content density)
4. **Final page**: Consolidated master input list

Use the same visual language as the web view. The PDF is what gets emailed if the venue doesn't want a link.

## Implementation Notes

- Start with SQLite + Prisma for zero-config dev. Switching to Postgres for production is a one-line Prisma datasource change.
- Stage position dragging: simplest approach is `onMouseDown`/`onMouseMove` on SVG `<rect>` elements with coordinate math. No need for a canvas library.
- For the shareable link, validate `shareToken` in a server component — no client-side auth check needed.
- Multi-line text fields (gear, routing, etc.) are stored as plain strings with newlines. Render with `whitespace-pre-wrap`. Don't over-engineer this into structured sub-models unless there's a clear need later.
- Auto-save with debounce on the editor. No explicit "save" button.
- The running order changeover calculation: parse `HH:MM` strings, diff in minutes between previous artist's `endTime` and next artist's `startTime`. Flag overlaps and zero-gaps.

## What This Is NOT

- Not a full rider builder for individual artists (tools like Ridermaker already do that)
- Not a venue management system
- Not a ticketing or scheduling platform
- No real-time collaboration needed (single editor per event is fine)

## MVP Scope

Build these first, in this order:
1. Event CRUD + position editor with draggable stage preview
2. Artist CRUD with all fields
3. Stage plot SVG view
4. FOH summary view
5. Running order with timeline and changeover calc
6. Shareable read-only link
7. PDF export
8. Auth (can be last — start with a single-user hardcoded setup if needed)
