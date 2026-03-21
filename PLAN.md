# RAIDOUT — Implementation Plan

## Overview

Single-developer Next.js app. App Router throughout. Zero external services at dev time.
Auth is last — scaffold with a hardcoded dev user first, bolt on NextAuth at the end.
Auto-save replaces explicit save buttons everywhere in the editor.

---

## Tech Decisions (rationale included)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Server components for shareable view, server actions for mutations |
| DB | SQLite + Prisma | Zero-config local, one-line swap to Postgres |
| Styling | Tailwind CSS 4 + `clsx`/`tailwind-merge` | Utility-first, easy dark/print modes |
| Drag (stage positions) | Custom SVG mouse handlers via `useStageDrag` | Avoids a whole library for one interaction |
| Drag (artist list reorder) | `@dnd-kit/sortable` | Clean React DnD, no DOM hacks, accessible |
| State (editor) | Zustand | Share state across 5 tabs without prop drilling or context gymnastics |
| PDF export | Puppeteer via `@sparticuz/chromium-min` | Reuses same HTML/CSS/SVG views exactly — no separate layout to maintain |
| Font (monospace data) | `JetBrains Mono` via `next/font/google` | Legible at dense sizes, free |
| Validation | Zod | Schema-first, works in server actions and API routes |
| Auth (Phase 9) | NextAuth.js v5 (beta) / Auth.js | Email+password or magic link, minimal setup |

---

## Filesystem Structure (actual)

```
raidout/
├── app/
│   ├── layout.tsx                    # Root layout: dark theme, JetBrains Mono, metadata
│   ├── page.tsx                      # Dashboard — event list + "New Event" CTA
│   ├── globals.css                   # Tailwind base + print media overrides
│   │
│   ├── event/
│   │   ├── new/
│   │   │   └── page.tsx              # Create event form (name, date, venue, dimensions)
│   │   └── [id]/
│   │       ├── page.tsx              # Event editor shell — reads event, hydrates Zustand
│   │       └── share/
│   │           ├── page.tsx          # Public read-only consolidated rider (server component)
│   │           └── pdf/
│   │               └── route.ts      # GET → puppeteer renders /share → streams PDF
│
├── components/
│   │
│   ├── ui/                           # Dumb, unstyled-ish primitive components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Badge.tsx                 # Color dot + label — used for position tags
│   │   └── ColorPicker.tsx           # Swatch grid for position colors
│   │
│   ├── editor/                       # Event editor: the core product UI
│   │   ├── EventEditor.tsx           # Tab shell, reads from Zustand, renders active tab
│   │   ├── AutoSaveIndicator.tsx     # "Saving…" / "Saved" / "Error" status dot
│   │   │
│   │   ├── tabs/
│   │   │   ├── SetupTab.tsx          # Event meta + position list + mini stage preview
│   │   │   ├── ArtistsTab.tsx        # Sortable artist card list
│   │   │   ├── StagePlotTab.tsx      # Full-size read-only SVG stage plot
│   │   │   ├── FOHTab.tsx            # Per-artist cards + master input list
│   │   │   └── RunningOrderTab.tsx   # Timeline bar + detailed list + changeover warnings
│   │   │
│   │   ├── stage/
│   │   │   ├── StageSVG.tsx          # Shared SVG renderer (edit + view modes; drag handled via useStageDrag)
│   │   │   └── PositionForm.tsx      # Inline form: name, color, X/Y/W/H inputs
│   │   │
│   │   ├── artist/
│   │   │   ├── ArtistCard.tsx        # Collapsed chip: color dot, name, time, position badge
│   │   │   └── ArtistForm.tsx        # Expanded inline editor: all artist fields
│   │   │
│   │   ├── foh/
│   │   │   ├── FOHArtistCard.tsx     # One card per artist: gear + routing + notes
│   │   │   └── MasterInputList.tsx   # Aggregated channel list from all routing fields
│   │   │
│   │   └── running-order/
│   │       ├── TimelineBar.tsx       # Horizontal SVG/div timeline, color-coded blocks
│   │       └── ChangeoverBadge.tsx   # Gap indicator: green/yellow/red
│   │
│   └── share/
│       ├── ShareView.tsx             # Full consolidated read-only view (composes sub-views)
│       ├── DownloadButton.tsx        # Client component: triggers /event/[id]/share/pdf
│       └── PrintButton.tsx           # Client component: triggers browser print dialog
│
├── lib/
│   ├── db.ts                         # Prisma client singleton (globalThis pattern for dev HMR)
│   │
│   ├── actions/
│   │   └── events.ts                 # All server actions: event/position/artist CRUD consolidated here
│   │
│   └── utils/
│       ├── cn.ts                     # clsx + tailwind-merge helper
│       ├── time.ts                   # parseHHMM, diffMinutes, formatDuration, changeover status
│       └── routing.ts                # parseRoutingLines(text) → [{channel, description, artist}]
│
├── store/
│   └── eventStore.ts                 # Zustand store: event, positions[], artists[], dirty flag
│                                     # Actions: patch fields, add/remove/reorder, trigger auto-save
│
├── hooks/
│   ├── useAutoSave.ts                # Watches dirty flag, debounces 800ms, calls server action
│   ├── useStageDrag.ts               # SVG mousedown/mousemove/mouseup → position x/y delta
│   └── useChangeovers.ts             # Derives changeover data from sorted artists[]
│
├── prisma/
│   ├── schema.prisma                 # Exact schema from SPEC.md
│   ├── seed.ts                       # Dev seed: one event, 3 artists, 2 positions
│   └── migrations/                   # Auto-generated by prisma migrate dev
│
├── .env                              # DATABASE_URL (gitignored)
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Deviations from original plan

- **No `DraggablePosition.tsx`** — drag logic lives inline in `StageSVG.tsx` via `useStageDrag` hook
- **No `RunningOrderList.tsx`** — tabular list embedded directly in `RunningOrderTab.tsx`
- **No separate `lib/actions/artists.ts` or `positions.ts`** — all mutations consolidated into `lib/actions/events.ts`
- **No `types/` directory** — Prisma-generated types used directly on the client
- **No `Tabs.tsx` or `Tooltip.tsx` UI primitives** — tabs handled inline in `EventEditor.tsx`, tooltips not needed
- **No `loading.tsx`** — editor loads fast enough without a skeleton
- **Extra `PrintButton.tsx`** in share components (not in original plan) — triggers browser print dialog

---

## Dependencies

```bash
# Core
npx create-next-app@latest raidout --typescript --tailwind --app --src-dir no --import-alias "@/*"

# DB
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite

# State
npm install zustand

# Validation
npm install zod

# Drag and drop (artist list only)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Styling utilities
npm install clsx tailwind-merge

# PDF export
npm install puppeteer-core @sparticuz/chromium-min
# NOTE: puppeteer-core + chromium-min keeps the install lean for Vercel
# In dev: use full puppeteer instead (npm install -D puppeteer)

# Auth (Phase 9 only — don't install until you reach it)
# npm install next-auth@beta
```

No UI component library (Radix, shadcn, etc.) — the UI is bespoke and dense enough that
rolling your own primitives in `components/ui/` is less overhead than fighting a library's
aesthetic defaults. Add if it gets painful.

---

## Build Order (matching SPEC MVP scope)

### Phase 1 — Foundation ✅
1. `prisma/schema.prisma` — exact schema from spec
2. `prisma/seed.ts` — seed data for dev iteration
3. `lib/db.ts` — Prisma singleton
4. `store/eventStore.ts` — Zustand store
5. `lib/utils/cn.ts`, `time.ts`, `routing.ts`
6. `app/globals.css` — dark theme base, print overrides, monospace data class

### Phase 2 — Event CRUD + Setup Tab ✅
7. `lib/actions/events.ts` (includes position + artist mutations)
8. `app/page.tsx` — dashboard with event list
9. `app/event/new/page.tsx` — create event form
10. `app/event/[id]/page.tsx` — editor shell (tabs, loads data into store)
11. `components/editor/tabs/SetupTab.tsx`
12. `components/editor/stage/StageSVG.tsx` — write this once, reuse everywhere (drag logic via `useStageDrag`)
13. `components/editor/stage/PositionForm.tsx`
14. `hooks/useAutoSave.ts` + `components/editor/AutoSaveIndicator.tsx`

### Phase 3 — Artist CRUD ✅
15. `components/editor/artist/ArtistCard.tsx` + `ArtistForm.tsx`
16. `components/editor/tabs/ArtistsTab.tsx` — with `@dnd-kit` sort

### Phase 4 — Stage Plot View ✅
17. `components/editor/tabs/StagePlotTab.tsx`
    — Full-size `StageSVG` in read-only mode
    — Annotate gear near positions
    — FOH label, grid lines

### Phase 5 — FOH Summary ✅
18. `components/editor/foh/FOHArtistCard.tsx`
19. `components/editor/foh/MasterInputList.tsx`
20. `components/editor/tabs/FOHTab.tsx`

### Phase 6 — Running Order ✅
21. `hooks/useChangeovers.ts`
22. `components/editor/running-order/TimelineBar.tsx`
23. `components/editor/running-order/ChangeoverBadge.tsx`
24. `components/editor/tabs/RunningOrderTab.tsx` (includes tabular list inline)

### Phase 7 — Shareable Link ✅
25. `app/event/[id]/share/page.tsx` — server component, validates shareToken
26. `components/share/ShareView.tsx` — composes StageSVG + FOH cards + running order
27. `components/share/DownloadButton.tsx` + `PrintButton.tsx`

### Phase 8 — PDF Export ✅
28. `app/event/[id]/share/pdf/route.ts`
    — Spawns puppeteer, navigates to `/event/[id]/share?print=1`
    — `?print=1` param triggers white-bg print styles in globals.css
    — Streams PDF response

### Phase 9 — Auth ⬜
29. `lib/auth.ts` + `app/api/auth/[...nextauth]/route.ts`
30. Middleware for protected routes
31. Login page + session display in dashboard
32. Swap hardcoded dev user for `session.user.id`

---

## Key Implementation Notes

### StageSVG.tsx — reuse everywhere
Pass `mode: 'edit' | 'view'` prop. In edit mode, positions are draggable via `useStageDrag`.
In view mode, plain SVG `<rect>` elements. Same component renders in the
editor, the share page, and the puppeteer PDF render.

### Auto-save pattern
```
useAutoSave:
  watch store.dirty flag
  on dirty → start 800ms debounce timer
  on timer fire → call server action with full current state snapshot
  on success → store.clearDirty()
  on error → set store.saveError, show indicator
```
Server action does an `upsert`-style `update` — never partial patches, always
overwrites the full event + cascade positions + artists. Simpler than tracking diffs.

### SVG drag math
```
useStageDrag:
  onMouseDown(e, positionId) → capture startX/startY, svgBoundingRect
  onMouseMove(e) → delta = (e.clientX - startX) / (svgWidth / stageWidth)
  onMouseUp → commit new x/y to store → triggers auto-save
  Clamp x/y to 0..stageWidth and 0..stageDepth respectively
```

### Changeover calculation
```typescript
// lib/utils/time.ts
function parseHHMM(t: string): number  // returns total minutes since 00:00
function changeover(prevEnd: string, nextStart: string): {
  gapMinutes: number
  status: 'overlap' | 'tight' | 'comfortable'  // <0 | 0-15 | >15
  samePosition: boolean
}
```

### Routing line parser
```typescript
// lib/utils/routing.ts
// Input: "Ch 1-2: Stereo master from DJM (XLR)\nCh 3: Monitor send (TRS)"
// Output: [{raw: "Ch 1-2: ...", channel: "Ch 1-2", description: "Stereo master from DJM (XLR)"}]
// Used by MasterInputList to build consolidated channel table
```

### PDF route
```typescript
// app/event/[id]/share/pdf/route.ts
// 1. Validate shareToken from DB
// 2. Get full public URL of /event/[id]/share?print=1
// 3. Launch chromium, goto URL, waitUntil networkidle0
// 4. page.pdf({ format: 'A4', printBackground: true })
// 5. Return Response with content-type: application/pdf
// In dev: use local puppeteer. In prod (Vercel): use @sparticuz/chromium-min.
```

### Print styles
```css
/* globals.css */
@media print, (query: print=1 via ?print param via JS class toggle) {
  body { background: white; color: black; }
  .no-print { display: none; }
  .monospace-data { font-family: 'JetBrains Mono', monospace; }
}
```
Simplest approach: `?print=1` in URL → root layout adds `print-mode` class to `<html>` → CSS targets `.print-mode`.

---

## Zustand Store Shape

```typescript
// store/eventStore.ts
interface EventStore {
  // Data
  event: Event | null
  positions: Position[]
  artists: Artist[]

  // UI state
  activeTab: 'setup' | 'artists' | 'plot' | 'foh' | 'order'
  expandedArtistId: string | null
  dirty: boolean
  saving: boolean
  saveError: string | null

  // Actions
  setEvent(e: Event): void
  patchEvent(fields: Partial<Event>): void
  setPositions(p: Position[]): void
  addPosition(p: Position): void
  patchPosition(id: string, fields: Partial<Position>): void
  removePosition(id: string): void
  setArtists(a: Artist[]): void
  addArtist(a: Artist): void
  patchArtist(id: string, fields: Partial<Artist>): void
  removeArtist(id: string): void
  reorderArtists(ids: string[]): void
  setActiveTab(tab: EventStore['activeTab']): void
  setExpandedArtist(id: string | null): void
  markDirty(): void
  clearDirty(): void
}
```

---

## Color System

Position colors should cover enough visual range to distinguish 4–8 positions at a glance.
Starter palette (all work on dark backgrounds, all print legibly on white):

```
#00e5ff  cyan      (default)
#ff4081  pink
#69f0ae  green
#ffab40  amber
#e040fb  purple
#ff6e40  deep-orange
#40c4ff  light-blue
#b2ff59  lime
```

---

## Deployment Checklist (when ready)

- [ ] Switch `DATABASE_URL` to Postgres connection string
- [ ] Change `prisma/schema.prisma` datasource provider to `postgresql`
- [ ] Run `prisma migrate deploy`
- [ ] Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` env vars on Vercel
- [ ] Confirm `@sparticuz/chromium-min` bundle size fits Vercel function limit (50MB)
      — if not, use `playwright` + `playwright-aws-lambda` or an external PDF service

---

## What NOT to build yet

- Real-time collaboration (no WebSockets, no Pusher)
- Artist-facing input form (this is manager-only)
- Comments or revision history
- Multiple venues or venue profiles
- Import from PDF riders (OCR is a separate product)
