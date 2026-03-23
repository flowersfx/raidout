"use client";

import { create } from "zustand";
import type { Event, Position, Artist } from "@/types/models";

type Tab = "setup" | "artists" | "plot" | "foh" | "order";

interface DeletedPosition {
  position: Position;
  artists: Artist[];
  index: number;
}

interface DeletedArtist {
  artist: Artist;
  index: number;
}

interface EventStore {
  // Data
  event: Event | null;
  positions: Position[];
  artists: Artist[];

  // Undo state (batch — supports single or multi-delete)
  lastDeletedPositions: DeletedPosition[];
  lastDeletedArtist: DeletedArtist | null;

  // UI state
  activeTab: Tab;
  selectedPositionId: string | null;       // primary (last-clicked) for form display
  selectedPositionIds: Set<string>;        // all selected positions
  expandedArtistId: string | null;
  snapEnabled: boolean;
  snapSize: number;                        // snap grid size in stage units
  dirty: boolean;
  saving: boolean;
  saveError: string | null;

  // Event actions
  setEvent(e: Event): void;
  patchEvent(fields: Partial<Event>): void;

  // Position actions
  setPositions(p: Position[]): void;
  addPosition(p: Position): void;
  clonePosition(id: string): void;
  patchPosition(id: string, fields: Partial<Position>): void;
  removePosition(id: string): void;
  removeSelectedPositions(): void;
  undoRemovePosition(): void;
  reorderPositions(ids: string[]): void;

  // Artist actions
  setArtists(a: Artist[]): void;
  addArtist(a: Artist): void;
  patchArtist(id: string, fields: Partial<Artist>): void;
  removeArtist(id: string): void;
  undoRemoveArtist(): void;
  reorderArtists(ids: string[]): void;

  // UI actions
  setActiveTab(tab: Tab): void;
  setSelectedPosition(id: string | null): void;
  toggleSelectedPosition(id: string): void;  // ctrl/shift click
  setSelectedPositionIds(ids: Set<string>): void;
  setExpandedArtist(id: string | null): void;
  setSnapEnabled(v: boolean): void;
  setSnapSize(v: number): void;
  markDirty(): void;
  clearDirty(): void;
  setSaving(v: boolean): void;
  setSaveError(msg: string | null): void;
}

export const useEventStore = create<EventStore>((set) => ({
  event: null,
  positions: [],
  artists: [],
  lastDeletedPositions: [],
  lastDeletedArtist: null,
  activeTab: "setup",
  selectedPositionId: null,
  selectedPositionIds: new Set<string>(),
  expandedArtistId: null,
  snapEnabled: true,
  snapSize: 10, // 100 / 10 = 10 cm per snap (10 snaps per grid square)
  dirty: false,
  saving: false,
  saveError: null,

  setEvent: (e) => set({ event: e }),
  patchEvent: (fields) =>
    set((s) => ({
      event: s.event ? { ...s.event, ...fields } : s.event,
      dirty: true,
    })),

  setPositions: (p) => set({ positions: p }),
  addPosition: (p) =>
    set((s) => ({ positions: [...s.positions, p], dirty: true })),
  clonePosition: (id) =>
    set((s) => {
      const source = s.positions.find((p) => p.id === id);
      if (!source) return s;
      const newId = Math.random().toString(36).slice(2, 11);
      const clone: Position = {
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        x: source.x + 20,
        y: source.y + 20,
      };
      return { positions: [...s.positions, clone], dirty: true };
    }),
  patchPosition: (id, fields) =>
    set((s) => ({
      positions: s.positions.map((p) => (p.id === id ? { ...p, ...fields } : p)),
      dirty: true,
    })),
  removePosition: (id) =>
    set((s) => {
      const index = s.positions.findIndex((p) => p.id === id);
      const deleted = s.positions[index];
      const deletedArtists = s.artists.filter((a) => a.positionId === id);
      return {
        positions: s.positions.filter((p) => p.id !== id),
        artists: s.artists.map((a) =>
          a.positionId === id ? { ...a, positionId: null } : a
        ),
        lastDeletedPositions: deleted ? [{ position: deleted, artists: deletedArtists, index }] : [],
        selectedPositionId: s.selectedPositionId === id ? null : s.selectedPositionId,
        selectedPositionIds: (() => { const n = new Set(s.selectedPositionIds); n.delete(id); return n; })(),
        dirty: true,
      };
    }),
  removeSelectedPositions: () =>
    set((s) => {
      const ids = s.selectedPositionIds;
      if (ids.size === 0) return s;
      const deleted = s.positions.filter((p) => ids.has(p.id));
      const batch: DeletedPosition[] = deleted.map((pos) => ({
        position: pos,
        artists: s.artists.filter((a) => a.positionId === pos.id),
        index: s.positions.findIndex((p) => p.id === pos.id),
      }));
      return {
        positions: s.positions.filter((p) => !ids.has(p.id)),
        artists: s.artists.map((a) => ids.has(a.positionId ?? "") ? { ...a, positionId: null } : a),
        lastDeletedPositions: batch,
        selectedPositionId: null,
        selectedPositionIds: new Set(),
        dirty: true,
      };
    }),
  undoRemovePosition: () =>
    set((s) => {
      if (s.lastDeletedPositions.length === 0) return s;
      let artists = [...s.artists];
      const restoredPositions = s.lastDeletedPositions.map((d) => d.position);
      for (const { position, artists: deletedArtists } of s.lastDeletedPositions) {
        artists = artists.map((a) => {
          const restored = deletedArtists.find((da) => da.id === a.id);
          return restored ? { ...a, positionId: position.id } : a;
        });
      }
      // Re-insert each restored position at its original index, then renumber sortOrder
      const merged = [...s.positions];
      for (const deleted of s.lastDeletedPositions) {
        const insertAt = Math.min(deleted.index, merged.length);
        merged.splice(insertAt, 0, deleted.position);
      }
      const positions = merged.map((p, i) => ({ ...p, sortOrder: i }));
      return {
        positions,
        artists,
        lastDeletedPositions: [],
        dirty: true,
      };
    }),

  setArtists: (a) => set({ artists: a }),
  addArtist: (a) =>
    set((s) => ({ artists: [...s.artists, a], dirty: true })),
  patchArtist: (id, fields) =>
    set((s) => ({
      artists: s.artists.map((a) => (a.id === id ? { ...a, ...fields } : a)),
      dirty: true,
    })),
  removeArtist: (id) =>
    set((s) => {
      const index = s.artists.findIndex((a) => a.id === id);
      const deleted = s.artists[index];
      return {
        artists: s.artists.filter((a) => a.id !== id),
        expandedArtistId: s.expandedArtistId === id ? null : s.expandedArtistId,
        lastDeletedArtist: deleted ? { artist: deleted, index } : s.lastDeletedArtist,
        dirty: true,
      };
    }),
  undoRemoveArtist: () =>
    set((s) => {
      if (!s.lastDeletedArtist) return s;
      const { artist, index } = s.lastDeletedArtist;
      const merged = [...s.artists];
      merged.splice(Math.min(index, merged.length), 0, artist);
      const artists = merged.map((a, i) => ({ ...a, sortOrder: i }));
      return { artists, lastDeletedArtist: null, dirty: true };
    }),
  reorderArtists: (ids) =>
    set((s) => ({
      artists: ids
        .map((id, i) => {
          const a = s.artists.find((x) => x.id === id);
          return a ? { ...a, sortOrder: i } : null;
        })
        .filter(Boolean) as Artist[],
      dirty: true,
    })),
  reorderPositions: (ids) =>
    set((s) => ({
      positions: ids
        .map((id, i) => {
          const p = s.positions.find((x) => x.id === id);
          return p ? { ...p, sortOrder: i } : null;
        })
        .filter(Boolean) as import("@/types/models").Position[],
      dirty: true,
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedPosition: (id) => set({
    selectedPositionId: id,
    selectedPositionIds: id ? new Set([id]) : new Set(),
  }),
  toggleSelectedPosition: (id) => set((s) => {
    const next = new Set(s.selectedPositionIds);
    if (next.has(id)) {
      next.delete(id);
      return {
        selectedPositionIds: next,
        selectedPositionId: next.size > 0 ? [...next][next.size - 1] : null,
      };
    } else {
      next.add(id);
      return { selectedPositionIds: next, selectedPositionId: id };
    }
  }),
  setSelectedPositionIds: (ids) => set({
    selectedPositionIds: ids,
    selectedPositionId: ids.size > 0 ? [...ids][ids.size - 1] : null,
  }),
  setExpandedArtist: (id) => set({ expandedArtistId: id }),
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setSnapSize: (v) => set({ snapSize: v }),
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  setSaving: (v) => set({ saving: v }),
  setSaveError: (msg) => set({ saveError: msg }),
}));
