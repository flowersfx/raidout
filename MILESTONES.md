# Raidout — Implementation Plan

Implementation order: **M4 → M1 → M2 → M3 → M5**

---

## Context

- Next.js 16 App Router, Prisma 5 (PostgreSQL / Neon), Zustand, Tailwind v4
- No icon library — use inline SVGs matching existing patterns in the codebase
- Dev auth stub: `DEV_USER_ID()` in `lib/actions/events.ts` — real auth is Phase 9, not in scope
- Auto-save: 800ms debounce, full snapshot upsert via `saveEventSnapshot` in `lib/actions/events.ts`
- `StageSVG` is a single component (`mode: 'edit' | 'view'`) used in SetupTab, StagePlotTab, ShareView, and PDF
- `StageCanvas` wraps `StageSVG` with CSS-transform pan/zoom; transform state lives in Zustand `canvasTransforms[stageId]`
- Read AGENTS.md and the Next.js docs in `node_modules/next/dist/docs/` before writing any Next.js code

---

## M4 — Artists tab: resizable two-panel layout

**Goal:** Mirror the SetupTab layout — sortable artist list on the left, selected artist form on the right, resizable divider.

### Current state
`components/editor/tabs/ArtistsTab.tsx` renders a single centred `max-w-3xl` column of `ArtistCard` components (each expands inline to show `ArtistForm`). The `expandedArtistId` field in Zustand tracks which card is open.

### Target state
- Left panel (default 340px, same as SetupTab): sortable list of artist rows
- Resizable divider: copy `onDividerMouseDown` pattern from SetupTab verbatim
- Right panel (`flex-1`): renders `ArtistForm` for selected artist, or empty-state prompt if none selected
- Selection: clicking a row sets `expandedArtistId` (already in store — reuse as selectedArtistId)
- Inline-expand of `ArtistCard` no longer needed; card becomes a slim selection row

### Artist row (simplified ArtistCard header)
Keep: drag handle, colour dot, artist name (bold/truncated), time range (mono/muted), intake badge, position badge, active highlight.
Remove: chevron, inline `ArtistForm` expansion.

### Files to change
- `components/editor/tabs/ArtistsTab.tsx` — full rewrite
- `components/editor/artist/ArtistCard.tsx` — strip chevron and inline form; pure selection row

### Files NOT to change
- `components/editor/artist/ArtistForm.tsx` — used as-is in right panel
- `store/eventStore.ts` — `expandedArtistId`/`setExpandedArtist` already serves as selected artist

---

## M1 — Optimistic concurrency + 1-minute polling

**Goal:** Prevent silent overwrites. Save fails and notifies user when snapshot is based on stale data. Clients auto-refresh every 60s when idle.

### Neon note
Neon uses pgBouncer pooling — `LISTEN/NOTIFY` does not work through the pooler. Polling is correct. If the connection string is ever changed to a direct (non-pooler) URL, Postgres `LISTEN/NOTIFY` becomes viable but is out of scope.

### 1. Schema
Add to Event model: `version Int @default(1)`
Migration: `prisma migrate dev --name add_event_version`

### 2. saveEventSnapshot
Add `clientVersion: number` to snapshot payload.
Replace `event.update` with `event.updateMany` where version matches; increment version on success.
If `result.count === 0`, throw `new Error("STALE_DATA")`.
Return new version so client can update local copy.

### 3. Store
Add `version: number`, set during hydration (`setEvent`). Auto-save sends it; on success update to returned value.

### 4. useAutoSave
Catch `STALE_DATA` error. On conflict: set `saveError: "conflict"`, re-fetch event, hydrate store.
Message: "Someone else saved changes — your edits have been reset to the latest version."

### 5. useEventPoll (new `hooks/useEventPoll.ts`)
Polls every 60s when document is visible and store is not dirty.
Fetches `getEvent`, compares `updatedAt` — if newer, hydrates store.
Mount in `EventEditor`.

### Files to change
- `prisma/schema.prisma`
- `lib/actions/events.ts`
- `store/eventStore.ts`
- `hooks/useAutoSave.ts`
- `hooks/useEventPoll.ts` (new)
- `components/editor/EventEditor.tsx`
- `components/editor/AutoSaveIndicator.tsx`

---

## M2 — Share page restructure

### 2a. Pinned stage plot + section tabs
Stage plot sections stay at the top (outside tabs, scroll away naturally).
Sticky tab bar below: **Timeline | Running Order | Artist Profiles | Signal Routing**.
In `printMode`: render all sections without tabs.
`ShareView` already has `"use client"` from pan/zoom work.

### 2b. Proportional running order cards
In `RunningOrderGrid.tsx`:
- `BASE_HEIGHT = 56px` = shortest slot
- row `minHeight = Math.max(BASE_HEIGHT, (rowDurationMinutes / minDuration) * BASE_HEIGHT)`
- Colour bar `self-stretch` works automatically
- Change `items-center` to `items-start` on row grid

### 2c. Click-through to artist profiles
- `FOHArtistCard` wrappers: `id="artist-{artist.id}"`
- Running order slots: `onClick` switches to Artist Profiles tab, then `scrollIntoView` after 50ms
- Timeline bar blocks: same click handler

### 2d. Renames
- "Master Input / Channel List" → "Signal Routing" in `ShareView.tsx`
- "Channel" column header → "Type" in `components/editor/foh/MasterInputList.tsx`

### 2e. Collapsed artist profiles
`FOHArtistCard`: default collapsed (one-line summary), click to expand.
Local `useState` per card. In `printMode`: always expanded.

### 2f. Print/PDF backgrounds
- `TimelineBar`: accept `printMode` prop, white lane backgrounds in print
- `RunningOrderGrid`: accept and pass `printMode`
- Stage plot container already handled via `StageCanvas` `printMode` path

### 2g. Arrow glyphs
Replace Unicode arrows with inline SVGs (strokeWidth 1.5, rounded caps, match `PositionForm.tsx` style):

| File | Current | Replace with |
|---|---|---|
| `EventEditor.tsx:82` | `← Events` | left chevron SVG |
| `EventEditor.tsx:94` | `Share →` | right chevron SVG |
| `EventCard.tsx:148` | `→` (navigate) | right chevron SVG |
| `EventCard.tsx:178` | `↓ Export` | down chevron SVG |
| `DownloadButton.tsx:34` | `↓ Download PDF` | down chevron SVG |

Viewboxes: right/left `"0 0 6 10"`, down `"0 0 10 6"`
Paths: right `"M1 1l4 4-4 4"`, left `"M5 1l-4 4 4 4"`, down `"M1 1l4 4 4-4"`

---

## M3 — Canvas: fit icon + fullscreen

### 3a. New fit icon
Replace `FitIcon` in `StageCanvas.tsx` with outer rectangle + four short inward arrows at edge midpoints.
Reads as "fit content to frame", not "go fullscreen".

```tsx
function FitIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="12" height="12" rx="1.5" />
      <path d="M7 1v3M7 10v3M1 7h3M10 7h3" />
    </svg>
  );
}
```

### 3b. Fullscreen
Add `onFullscreen?(): void` and `isFullscreen?: boolean` to `ZoomControls` props.
`FullscreenIcon`: four corners pointing outward (freed up from old `FitIcon`).
`ExitFullscreenIcon`: four corners pointing inward.

In `StageCanvas`:
- `useState` for `isFullscreen`
- `containerRef.current.requestFullscreen()` / `document.exitFullscreen()`
- `document.fullscreenchange` listener to sync state
- Toolbar stays as `absolute` bottom overlay inside the fullscreen element

### Files to change
- `components/editor/stage/StageCanvas.tsx` only

---

## M5 — Setup tab: text position type

**Goal:** Label-only stage element — transparent fill, no border, no size annotation.
No migration needed — `shape` is already a `String` field with no enum constraint.

### StageSVG.tsx
When `pos.shape === "text"`: force `showBorders=false`, `showSize=false` in render logic (2–3 lines).

### SetupTab.tsx
Add "Text Label" to the add-position menu:
```ts
addPosition({
  shape: "text",
  showBorders: false,
  showSize: false,
  name: "Label",
  color: "#ffffff",
  width: 200,
  height: 40,
  // ...other standard defaults
});
```

### PositionForm.tsx
When `shape === "text"`: hide colour picker, border toggle, size toggle, shape selector.
Show name + x/y/width/height only. Add note: "Text label — no border or fill".

### Files to change
- `components/editor/tabs/SetupTab.tsx`
- `components/editor/stage/PositionForm.tsx`
- `components/editor/stage/StageSVG.tsx`

---

## File map

| File | Milestone(s) |
|---|---|
| `components/editor/tabs/ArtistsTab.tsx` | M4 |
| `components/editor/artist/ArtistCard.tsx` | M4 |
| `components/editor/artist/ArtistForm.tsx` | M4 (read-only, used as-is) |
| `components/editor/stage/StageSVG.tsx` | M5 |
| `components/editor/stage/StageCanvas.tsx` | M3 |
| `components/editor/stage/PositionForm.tsx` | M5 |
| `components/editor/running-order/RunningOrderGrid.tsx` | M2b, M2c, M2f |
| `components/editor/running-order/TimelineBar.tsx` | M2c, M2f |
| `components/editor/foh/MasterInputList.tsx` | M2d |
| `components/editor/foh/FOHArtistCard.tsx` | M2e |
| `components/editor/EventEditor.tsx` | M1, M2g |
| `components/editor/AutoSaveIndicator.tsx` | M1 |
| `components/share/ShareView.tsx` | M2a, M2b, M2c, M2f |
| `components/EventCard.tsx` | M2g |
| `components/share/DownloadButton.tsx` | M2g |
| `hooks/useAutoSave.ts` | M1 |
| `hooks/useEventPoll.ts` | M1 (new) |
| `store/eventStore.ts` | M1 |
| `lib/actions/events.ts` | M1 |
| `prisma/schema.prisma` | M1 |
