"use client";

import { create } from "zustand";
import type { Event, Position, Artist } from "@/types/models";

type Tab = "setup" | "artists" | "plot" | "foh" | "order";

interface DeletedPosition {
  position: Position;
  artists: Artist[];
}

interface EventStore {
  // Data
  event: Event | null;
  positions: Position[];
  artists: Artist[];

  // Undo state
  lastDeletedPosition: DeletedPosition | null;

  // UI state
  activeTab: Tab;
  expandedArtistId: string | null;
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
  undoRemovePosition(): void;

  // Artist actions
  setArtists(a: Artist[]): void;
  addArtist(a: Artist): void;
  patchArtist(id: string, fields: Partial<Artist>): void;
  removeArtist(id: string): void;
  reorderArtists(ids: string[]): void;

  // UI actions
  setActiveTab(tab: Tab): void;
  setExpandedArtist(id: string | null): void;
  markDirty(): void;
  clearDirty(): void;
  setSaving(v: boolean): void;
  setSaveError(msg: string | null): void;
}

export const useEventStore = create<EventStore>((set) => ({
  event: null,
  positions: [],
  artists: [],
  lastDeletedPosition: null,
  activeTab: "setup",
  expandedArtistId: null,
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
      const deleted = s.positions.find((p) => p.id === id);
      const deletedArtists = s.artists.filter((a) => a.positionId === id);
      return {
        positions: s.positions.filter((p) => p.id !== id),
        artists: s.artists.map((a) =>
          a.positionId === id ? { ...a, positionId: null } : a
        ),
        lastDeletedPosition: deleted
          ? { position: deleted, artists: deletedArtists }
          : null,
        dirty: true,
      };
    }),
  undoRemovePosition: () =>
    set((s) => {
      if (!s.lastDeletedPosition) return s;
      const { position, artists: deletedArtists } = s.lastDeletedPosition;
      return {
        positions: [...s.positions, position],
        artists: s.artists.map((a) => {
          const restored = deletedArtists.find((da) => da.id === a.id);
          return restored ? { ...a, positionId: position.id } : a;
        }),
        lastDeletedPosition: null,
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
    set((s) => ({
      artists: s.artists.filter((a) => a.id !== id),
      expandedArtistId: s.expandedArtistId === id ? null : s.expandedArtistId,
      dirty: true,
    })),
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

  setActiveTab: (tab) => set({ activeTab: tab }),
  setExpandedArtist: (id) => set({ expandedArtistId: id }),
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  setSaving: (v) => set({ saving: v }),
  setSaveError: (msg) => set({ saveError: msg }),
}));
