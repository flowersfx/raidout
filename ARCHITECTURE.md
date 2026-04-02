# RAIDOUT — Architecture Reference

This document is the authoritative technical reference for AI agents working in this codebase. It covers file layout, key patterns, data flow, and non-obvious constraints. Read this before writing or modifying any code.

---

## File Layout

```
raidout/
├── app/
│   ├── layout.tsx                    # Root layout: dark theme, JetBrains Mono, print-mode class injection
│   ├── page.tsx                      # Dashboard — event list, animated VU-meter header, FFX logo footer
│   ├── globals.css                   # Tailwind base + print/pdf media overrides, FOH bar animations
│   │
│   ├── event/
│   │   ├── new/page.tsx              # Create event form
│   │   └── [id]/
│   │       ├── page.tsx              # Editor shell — server component, hydrates Zustand store
│   │       ├── loading.tsx
│   │       └── share/
│   │           ├── page.tsx          # Public read-only rider — server component
│   │           └── pdf/route.ts      # GET → Puppeteer renders /share?print=1 → streams PDF
│   │
│   ├── intake/
│   │   └── [token]/page.tsx          # Artist self-fill form — no auth, token-gated
│   │
│   └── api/
│       └── events/[id]/export/route.ts  # JSON snapshot export
│
├── components/
│   ├── ui/                           # Primitives: Button, Input, Textarea, Badge, ColorPicker
│   │
│   ├── editor/
│   │   ├── EventEditor.tsx           # Tab shell (7 tabs), auto-save + poll wiring, keyboard handler
│   │   ├── AutoSaveIndicator.tsx
│   │   │
│   │   ├── tabs/
│   │   │   ├── SetupTab.tsx          # Stage/position editor: resizeable split pane
│   │   │   ├── ArtistsTab.tsx        # Sortable artist cards with intake badge
│   │   │   ├── StagePlotTab.tsx      # Full-size pan/zoom stage canvas (read-only)
│   │   │   ├── ArtistProfilesTab.tsx # Per-artist detail cards
│   │   │   ├── RunningOrderTab.tsx   # Multi-column grid with changeover indicators
│   │   │   ├── TimelineTab.tsx       # Multi-lane horizontal timeline bar
│   │   │   └── SignalRoutingTab.tsx  # Consolidated channel/input list
│   │   │
│   │   ├── stage/
│   │   │   ├── StageCanvas.tsx       # Pan/zoom wrapper around StageSVG; handles pointer events
│   │   │   ├── StageSVG.tsx          # SVG renderer — edit (draggable) and view modes; used everywhere
│   │   │   └── PositionForm.tsx      # Inline position property editor
│   │   │
│   │   ├── artist/
│   │   │   ├── ArtistCard.tsx        # Collapsed chip: color dot, name, time, position badge
│   │   │   └── ArtistForm.tsx        # Expanded inline editor: all artist fields
│   │   │
│   │   ├── foh/
│   │   │   ├── FOHArtistCard.tsx     # One card per artist: gear, routing, notes
│   │   │   └── MasterInputList.tsx   # Aggregated channel list from all routing fields
│   │   │
│   │   └── running-order/
│   │       ├── TimelineBar.tsx       # Horizontal color-coded timeline blocks
│   │       ├── RunningOrderGrid.tsx  # Multi-column tabular running order
│   │       └── ChangeoverBadge.tsx   # Gap indicator: green/yellow/red
│   │
│   ├── share/
│   │   ├── ShareView.tsx             # Full consolidated read-only view (tabbed + printMode)
│   │   ├── DownloadButton.tsx        # Triggers /event/[id]/share/pdf
│   │   └── PrintButton.tsx           # Triggers browser print dialog
│   │
│   ├── intake/
│   │   ├── IntakeForm.tsx            # Artist self-fill form with auto-save
│   │   └── IntakeAutoSaveIndicator.tsx
│   │
│   ├── EventList.tsx                 # Dashboard event list with reorder + delete
│   ├── EventCard.tsx                 # Single event row with unread intake badge
│   └── ImportButton.tsx             # JSON snapshot import
│
├── lib/
│   ├── db.ts                         # Prisma client singleton (globalThis pattern for dev HMR)
│   ├── identity.ts                   # Dev user stub — returns hardcoded user until auth is wired
│   │
│   ├── actions/
│   │   ├── events.ts                 # All event/stage/position/artist server actions + saveEventSnapshot
│   │   └── intake.ts                 # Intake server actions: getArtistByIntakeToken, saveIntake
│   │
│   └── utils/
│       ├── cn.ts                     # clsx + tailwind-merge
│       ├── time.ts                   # parseHHMM, diffMinutes, sortableStartTime, changeover status
│       └── routing.ts                # parseRoutingLines(text) → [{channel, description}]
│
├── store/
│   └── eventStore.ts                 # Zustand store — single source of truth for editor UI
│
├── hooks/
│   ├── useAutoSave.ts                # Debounced save (800ms) with optimistic concurrency
│   ├── useEventPoll.ts               # Background refresh every 60s when tab is visible and not dirty
│   ├── useStageDrag.ts               # SVG mousedown/move/up → position x/y delta + snap
│   ├── useStageHandles.ts            # Resize handles for positions on the stage
│   ├── useCanvasTransform.ts         # Pan/zoom state management for StageCanvas
│   ├── useChangeovers.ts             # Derives changeover data from sorted artists[]
│   └── useIntakeAutoSave.ts          # Debounced save for the intake form
│
├── types/
│   └── models.ts                     # Client-side TS interfaces (Prisma types are server-only)
│                                     # Also exports: getAllSlots(artist), POSITION_COLORS
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Key Patterns

### Types: server vs. client split

Prisma-generated types are **server-only**. Client components and the Zustand store use the interfaces in `types/models.ts`. These mirror the Prisma schema with one important difference: `DateTime` fields become `string` (ISO 8601). When passing event data from a server component to a client component, serialize dates with `.toISOString()` first. The editor shell (`app/event/[id]/page.tsx`) does this before hydrating the store.

### Zustand store (`store/eventStore.ts`)

All editor state lives here. The store is hydrated once on mount in `EventEditor.tsx` from server-fetched data. After that, all mutations go through store actions — never direct server calls from components.

Key state:
- `event`, `stages`, `positions`, `artists` — the working copy
- `version` — mirrors `Event.version` for optimistic concurrency
- `dirty` — set by every mutating action; drives auto-save
- `activeStageId` — which stage the Setup tab is showing
- `selectedPositionId` / `selectedPositionIds: Set<string>` — primary selection (for form) and full multi-select set
- `canvasTransforms: Record<stageId, {panX, panY, scale}>` — pan/zoom state per stage, persists across tab switches
- `lastDeletedPositions` / `lastDeletedArtist` — undo buffers (single batch)

### Auto-save (`hooks/useAutoSave.ts`)

Watches `dirty`. On dirty → 800ms debounce → calls `saveEventSnapshot` server action with full snapshot (event + stages + positions + artists) and current `version`. On success, updates `version` in store and clears `dirty`. On `STALE_DATA` error, reloads fresh data from server (conflict resolution — last-write wins with notification). No partial patches — always a full overwrite.

### Optimistic concurrency

`Event.version` (integer) is incremented server-side on every save. The client sends `clientVersion` with each save. If `clientVersion !== current DB version`, the server throws `STALE_DATA` and the client reloads. This protects against tab-vs-tab conflicts.

### Background polling (`hooks/useEventPoll.ts`)

Polls every 60 seconds when `document.visibilityState === "visible"` and `!dirty`. Compares `updatedAt` — only reloads store if server has a newer version. Skips when there are unsaved local changes.

### Stage/position hierarchy

An event has `stages[]`. Each stage has `positions[]`. A position belongs to exactly one stage via `stageId`. Artists reference a position via `positionId` (nullable). When filtering positions for a stage: `positions.filter(p => p.stageId === stageId)`.

### StageSVG / StageCanvas split

`StageSVG` is the pure SVG renderer — takes `mode: 'edit' | 'view'`, positions, artists, and renders everything. It is used in the editor (edit mode) and in the share page and PDF (view mode).

`StageCanvas` wraps `StageSVG` with pan/zoom support (pointer event handling, transform matrix, zoom buttons). Use `StageCanvas` when you need pan/zoom (StagePlotTab, ShareView). Use `StageSVG` directly only when embedding a fixed-size non-interactive plot.

### PDF export

`/event/[id]/share/pdf/route.ts` launches Puppeteer, navigates to `/event/[id]/share?print=1`, and streams the result as `application/pdf`. The `?print=1` param is detected in the root layout, which adds a `print-mode` class to `<html>`. CSS in `globals.css` targets `.print-mode` and `@media print` — same rules cover both browser print and PDF. The share page hides its tab bar and renders all sections when `printMode=true`.

### Print mode CSS conventions

- `.no-print` — hidden in print/PDF (interactive chrome, navigation)
- `.print-only` — hidden in normal view, visible in print/PDF (event header on share page)
- `mono` — applies JetBrains Mono (used for technical data: channel lists, routing, gear)

### Artist intake

Each artist has a unique `intakeToken`. `/intake/[token]` is a public, no-auth page where the artist fills in their gear/needs. It auto-saves via `useIntakeAutoSave` (debounced). On save, `intakeUpdatedAt` is set server-side. The editor polls `artistsLastReviewedAt` vs `intakeUpdatedAt` to show an unread badge on the Artists tab. Viewing the Artists tab clears the badge by setting `artistsLastReviewedAt` via `markArtistsTabViewed`.

### Routing line parser (`lib/utils/routing.ts`)

`parseRoutingLines(text)` splits multi-line routing fields into `{channel, description}` pairs. Input: `"Ch 1-2: Stereo master (XLR)\nCh 3: Monitor send"`. Used by `MasterInputList` to build the consolidated channel table.

### Midnight-crossing time handling

All times are `HH:MM` strings. `sortableStartTime(time, allStartTimes)` in `lib/utils/time.ts` uses the distribution of all start times to infer which times are "next day" and returns a sortable integer that handles shows running past midnight correctly.

### Identity / auth

`lib/identity.ts` returns a hardcoded dev user. All server actions call `getDevUser()` from here. When auth is added, only this file and the server actions need to change — no component changes required.

---

## Tech Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router | Server components for shareable view + PDF, server actions for mutations |
| DB | PostgreSQL + Prisma | Migrated from SQLite for Vercel/production |
| Styling | Tailwind CSS 4 + clsx/tailwind-merge | Utility-first; dark/print modes via class variants |
| Stage drag | Custom SVG pointer handlers via `useStageDrag` | One focused interaction; no drag library needed |
| Artist reorder | `@dnd-kit/sortable` | Clean React DnD for list reordering |
| State | Zustand | Cross-tab store without prop drilling or context |
| PDF | Puppeteer + `@sparticuz/chromium-min` | Reuses exact HTML/CSS/SVG — no separate layout |
| Monospace font | JetBrains Mono via `next/font/google` | Dense and legible for technical data |
| No UI lib | Rolling own in `components/ui/` | Bespoke dense UI; no library aesthetic to fight |

---

## What Is Deliberately Not Here

- **Real-time collaboration** — no WebSockets, no Pusher. Single editor per event is fine.
- **Auth** — dev user stub in `lib/identity.ts`. NextAuth.js planned but not started.
- **Import from PDF** — OCR is a separate product.
- **Multiple venues / venue profiles** — not in scope.
- **Revision history / comments** — not in scope.
- **Share via email** — copying the share link is manual. Sending it from within the app is planned but not built.
