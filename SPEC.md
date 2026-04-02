# RAIDOUT — Stage Tech Rider Consolidation Tool

## What This Is

A web app for nightclub/event managers who collect individual tech riders from electronic music artists and need to produce **one consolidated technical specification** for the venue's FOH engineer and technicians.

The typical workflow today: receive 4–7 artist riders (PDF/email), manually draw a top-down stage layout in Photoshop showing table positions and equipment, then email the venue a cobbled-together summary. This tool replaces that.

## Core User Story

> As an event manager, I create an **event** with one or more stages and time slots. I add **artists**, enter their gear, venue requirements, signal routing, and table space needs. I assign each artist to a **stage position** and time slot. The app generates a **shareable consolidated tech rider** with: a top-down stage plot, per-artist equipment/routing details, a master input list for FOH, and a running order with changeover timing.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL via Prisma
- **State management**: Zustand
- **Styling**: Tailwind CSS
- **Stage plot rendering**: SVG (server-renderable, printable, no canvas)
- **Drag & drop**: @dnd-kit (artist reordering)
- **PDF export**: Puppeteer (`puppeteer-core` + `@sparticuz/chromium-min`) via the share page print route
- **Deployment target**: Vercel
- **Auth**: NextAuth.js (planned — currently using dev user stub)

## Data Model

```
Event
  id                    String    @id @default(cuid())
  name                  String              // "Syntax Error: STACK OVERFLOW"
  date                  DateTime
  venue                 String
  shareToken            String    @unique @default(cuid())  // for public read-only link
  createdBy             String              // user id
  stages                Stage[]
  positions             Position[]
  artists               Artist[]
  sortOrder             Int       @default(0)
  artistsLastReviewedAt DateTime?           // tracks when manager last viewed intake updates
  version               Int       @default(1) // optimistic concurrency
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

Stage
  id            String    @id @default(cuid())
  eventId       String
  name          String    @default("Stage")  // "Main Stage", "Second Room"
  stageWidth    Int       @default(800)   // cm
  stageDepth    Int       @default(400)   // cm
  fohPosition   String    @default("bottom")  // "bottom" | "top" | "left" | "right" | "none"
  sortOrder     Int       @default(0)
  positions     Position[]

Position
  id            String   @id @default(cuid())
  eventId       String
  stageId       String
  name          String              // "DJ Booth A", "Live Act B"
  x             Int                 // position on stage SVG (cm)
  y             Int
  width         Int                 // table/booth footprint (cm)
  height        Int
  color         String   @default("#00e5ff")
  rotation      Int      @default(0)      // degrees (-180 to 180)
  sortOrder     Int      @default(0)
  showSize      Boolean  @default(true)   // show dimensions label on plot
  showBorders   Boolean  @default(true)   // show border on plot
  shape         String   @default("rectangular")  // "rectangular" | "round"
  collapsed     Boolean  @default(false)  // collapse card in positions list
  artists       Artist[]

Artist
  id                  String    @id @default(cuid())
  eventId             String
  positionId          String?
  name                String              // DJ/act name
  startTime           String              // "22:30" — HH:MM
  endTime             String              // "23:45"
  tableMin            String?             // "160×60 cm" — freeform
  gearBrings          String    @default("")
  venueNeeds          String    @default("")
  routing             String    @default("")
  notes               String    @default("")
  extraSlots          String    @default("[]")  // JSON: [{startTime, endTime}]
  arrivalTime         String?             // HH:MM
  soundcheckStart     String?             // HH:MM
  soundcheckEnd       String?             // HH:MM
  soundcheckMinLength String?             // e.g. "30 min" — from intake form
  intakeToken         String    @unique @default(cuid())  // for artist self-fill link
  intakeSentAt        DateTime?
  intakeUpdatedAt     DateTime?           // set when artist submits intake form
  sortOrder           Int       @default(0)

User
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  events    Event[]  // via createdBy
```

## Pages / Routes

```
/                         Landing / dashboard (list of user's events)
/event/new                Create new event
/event/[id]               Event editor (tabbed interface, see below)
/event/[id]/share         Public read-only consolidated rider (tabbed)
/event/[id]/share/pdf     PDF download (Puppeteer renders share page with ?print=1)
/intake/[token]           Artist self-fill intake form (no auth, per-artist token)
```

## Event Editor — Tabbed Interface

Seven tabs split into two groups: **Edit** (Setup, Artists) and **View** (Stage Plot, Artist Profiles, Running Order, Timeline, Signal Routing).

### 1. Setup
- Event name, date (locale-formatted), venue
- **Multiple stages**: add/remove stages, each with a name and independent dimensions
- Stage dimensions in cm (width × depth), with 100cm grid
- FOH position per stage: bottom (default), top, left, right, or none (hidden)
- Snap-to-grid toggle with configurable snap size (default 10cm)
- Resizeable split pane (positions list ↔ stage preview)
- **Positions**: add, clone, delete (with undo), color picker (inline single-swatch that expands, including grey options)
- Position properties: X, Y, W, H (cm), rotation (degrees), shape (rectangular/round), show size, show borders, collapsed
- Live stage preview with:
  - Drag to reposition (with snapping)
  - Multi-select via Ctrl/Shift+click or marquee drag
  - Multi-drag: move all selected positions together
  - Click background to deselect
  - Delete/Backspace key removes selected positions

### 2. Artists
- List of artists as expandable cards, sorted by sort order
- Color-coded by their assigned position
- Drag to reorder
- Unread intake indicator (animated dot on tab badge when artist has submitted new intake data)
- Expand to edit:
  - Name, arrival time, position (dropdown), min table space
  - Start/end time with midnight-crossing support
  - Extra time slots (+ Add time slot) for artists playing multiple sets
  - Soundcheck start/end times
  - Gear, venue needs, signal routing (multi-line textareas)
  - Notes, duplicate, delete actions
  - **Intake link**: copy-to-clipboard per-artist URL for artist self-fill

### 3. Stage Plot (read-only)
- Top-down SVG of the stage with 100cm grid
- Positions as labeled, colored, rotatable rectangles or circles
- Artists listed inside each position (with overflow handling)
- All gear items from all artists annotated below each position
- FOH label position configurable per stage (or hidden)
- **Free pan & zoom** with mouse/touch drag + zoom buttons (1% step)
- Multiple stages rendered in sequence

### 4. Artist Profiles (read-only)
- Per-artist cards: name, position, time slots, arrival, soundcheck, gear, venue needs, routing, table space, notes
- Clicking an artist in Running Order / Timeline navigates to their profile card

### 5. Running Order (read-only)
- Multi-column running order grid: one column per position, overlapping artists shown side-by-side
- Changeover indicators per position column (overlap=red, tight=yellow, comfortable=green)
- Midnight-crossing aware sorting and gap calculations

### 6. Timeline (read-only)
- Multi-lane timeline bar: one lane per position, with sub-lane packing for overlapping artists

### 7. Signal Routing (read-only)
- Consolidated master input/channel list: every routing line from every artist, grouped by position

## Artist Intake (`/intake/[token]`)

- Accessed via a per-artist token — no auth required
- Artist sees the event name/date/venue and their own name
- Can fill in: gear they bring, venue needs, table space, arrival time, soundcheck minimum length, notes
- Auto-saves as they type (debounced)
- Sets `intakeUpdatedAt` on submit, which triggers the unread badge in the editor
- No access to other artists' data or event editing

## Shareable Read-Only View (`/event/[id]/share`)

- Accessed via event ID — no auth required (uses shareToken implicitly via the route)
- Sticky action bar: event name/date, Print button, Download PDF button
- Stage plot(s) always shown above the tab bar (scroll away naturally)
- **Tabs**: Artist Profiles, Timeline, Running Order, Signal Routing
- Print mode (`?print=1`): all sections rendered, tab bar hidden, event header visible — used by PDF renderer
- No editing, no navigation to other events

## Design Direction

- **Dark theme** as default (matches backstage/tech context)
- Clean print/PDF mode: white background, high contrast, no interactive chrome
- Monospace for technical data (channel lists, routing, gear lists)
- Color-coding tied to stage positions throughout the entire app
- Dense but readable — working tool, not marketing site
- Mobile-responsive but desktop-first

## PDF Export

PDF is generated by Puppeteer rendering `/event/[id]/share?print=1` headlessly via the `/event/[id]/share/pdf` route. All print-mode CSS is applied (white background, hidden interactive elements, full-page layout).

## Implementation Status

### Completed
1. Event CRUD (create, edit, delete, reorder)
2. Event import/export (JSON snapshot)
3. Multiple stages per event, with per-stage name and FOH position
4. Position editor: drag, snap-to-grid, multi-select, multi-drag, rotation, clone, undo
5. Position shapes: rectangular and round
6. Position display toggles: show size, show borders, collapsed card
7. Artist CRUD with all fields (extra time slots, arrival, soundcheck, intake tracking)
8. Artist intake: per-artist self-fill form at `/intake/[token]`, auto-save, unread badge
9. Stage plot SVG: pan & zoom, gear annotations, multi-stage, FOH position variants
10. Artist Profiles tab (per-artist detail cards)
11. Running Order tab (multi-column grid with changeover indicators)
12. Timeline tab (multi-lane bar)
13. Signal Routing tab (master input list)
14. Shareable read-only view with tabs and print mode
15. PDF export via Puppeteer
16. Auto-save with optimistic concurrency (version field)
17. Background polling for external changes

### Remaining
- Auth (currently using dev user stub)
- Share via email (send the share link to venue contact from within the app)
- Print stylesheet polish
