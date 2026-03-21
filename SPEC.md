# RAIDOUT — Stage Tech Rider Consolidation Tool

## What This Is

A web app for nightclub/event managers who collect individual tech riders from electronic music artists and need to produce **one consolidated technical specification** for the venue's FOH engineer and technicians.

The typical workflow today: receive 4–7 artist riders (PDF/email), manually draw a top-down stage layout in Photoshop showing table positions and equipment, then email the venue a cobbled-together summary. This tool replaces that.

## Core User Story

> As an event manager, I create an **event** with a stage layout and time slots. I add **artists**, enter their gear, venue requirements, signal routing, and table space needs. I assign each artist to a **stage position** and time slot. The app generates a **shareable consolidated tech rider** with: a top-down stage plot, per-artist equipment/routing details, a master input list for FOH, and a running order with changeover timing.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: SQLite via Prisma (simple, zero-config, easy to migrate to Postgres later)
- **State management**: Zustand
- **Styling**: Tailwind CSS
- **Stage plot rendering**: SVG (server-renderable, printable, no canvas)
- **Drag & drop**: @dnd-kit (artist reordering)
- **PDF export**: `@react-pdf/renderer` or `puppeteer` (for print-quality output from the same views)
- **Deployment target**: Vercel (or any Node-compatible host)
- **Auth**: NextAuth.js (planned — currently using dev user stub)

## Data Model

```
Event
  id            String    @id @default(cuid())
  name          String              // "Syntax Error: STACK OVERFLOW"
  date          DateTime
  venue         String
  stageWidth    Int       @default(800)   // cm — stage dimensions
  stageDepth    Int       @default(400)   // cm
  shareToken    String    @unique @default(cuid())  // for public read-only link
  createdBy     String              // user id
  positions     Position[]
  artists       Artist[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

Position
  id            String    @id @default(cuid())
  eventId       String
  name          String              // "DJ Booth A", "Live Act B"
  x             Int                 // position on stage SVG (cm)
  y             Int
  width         Int                 // table/booth footprint (cm)
  height        Int
  color         String    @default("#00e5ff")  // for visual coding
  rotation      Int       @default(0)          // degrees (-180 to 180)
  artists       Artist[]

Artist
  id            String    @id @default(cuid())
  eventId       String
  positionId    String?
  name          String              // DJ/act name
  startTime     String              // "22:30" — HH:MM format
  endTime       String              // "23:45"
  tableMin      String?             // "160×60 cm" — freeform
  gearBrings    String    @default("")  // multi-line: what they bring
  venueNeeds    String    @default("")  // multi-line: what venue must provide
  routing       String    @default("")  // multi-line: signal routing spec
  notes         String    @default("")
  extraSlots    String    @default("[]")  // JSON array of {startTime, endTime} for multiple slots
  arrivalTime   String?             // HH:MM — when artist arrives
  soundcheckStart String?           // HH:MM
  soundcheckEnd   String?           // HH:MM
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
- Event name, date (locale-formatted), venue
- Stage dimensions in cm (width × depth), with 100cm grid
- Snap-to-grid toggle with configurable snap size (default 10cm)
- **Positions**: add, clone, delete (with undo), color picker (inline single-swatch that expands)
- Position properties: X, Y, W, H (cm), rotation (degrees)
- Live stage preview with:
  - Drag to reposition (with snapping)
  - Multi-select via Ctrl/Shift+click or marquee drag
  - Multi-drag: move all selected positions together
  - Click background to deselect

### 2. Artists
- List of artists as expandable cards, sorted by sort order
- Color-coded by their assigned position
- Drag to reorder
- Expand to edit:
  - Name, arrival time, position (dropdown), min table space
  - Start/end time with midnight-crossing support (end < start = next day)
  - Extra time slots (+ Add time slot) for artists playing multiple sets
  - Soundcheck start/end times
  - Gear, venue needs, signal routing (multi-line textareas)
  - Notes, duplicate, delete actions

### 3. Stage Plot (read-only view)
- Top-down SVG of the stage with 100cm grid
- Positions as labeled, colored, rotatable rectangles
- Artists listed inside each position (with overflow handling)
- **All** gear items from **all** artists annotated below each position
- "FRONT OF HOUSE" label at bottom
- Selected positions expand to show all artists with word-wrap

### 4. FOH Summary
- **Per-artist cards**: name, position, time slots, arrival, soundcheck, gear, venue needs, routing, table space, notes
- **Consolidated master input/channel list**: every routing line from every artist, grouped by position

### 5. Running Order
- **Multi-lane timeline bar**: one lane per position, with sub-lane packing for overlapping artists
- **Multi-column running order grid**: one column per position, overlapping artists shown side-by-side
- Stacked entries when multiple artists overlap at the same position
- **Changeover indicators** per position column (overlap=red, tight=yellow, comfortable=green)
- Midnight-crossing aware sorting and gap calculations

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

## Implementation Status

### Completed
1. Event CRUD + position editor with draggable stage preview
2. Position rotation, cloning, delete with undo
3. Multi-select positions (Ctrl/Shift + marquee) with multi-drag and snap-to-grid
4. Artist CRUD with all fields (including extra time slots, arrival, soundcheck)
5. Stage plot SVG view with overflow handling and gear annotations
6. FOH summary view with master input list
7. Running order with multi-lane timeline and multi-column grid
8. Midnight-crossing time handling
9. Shareable read-only link
10. Auto-save with snapshot persistence

### Remaining
- PDF export
- Auth (currently using dev user stub)
- Print stylesheet

## What This Is NOT

- Not a full rider builder for individual artists (tools like Ridermaker already do that)
- Not a venue management system
- Not a ticketing or scheduling platform
- No real-time collaboration needed (single editor per event is fine)
