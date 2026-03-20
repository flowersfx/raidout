"use client";

import { create } from "zustand";
import type { Event, Position, Artist } from "@/types/models";

type Tab = "setup" | "artists" | "plot" | "foh" | "order";

interface EventStore {
  // Data
  event: Event | null;
  positions: Position[];
  artists: Artist[];

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
  patchPosition(id: string, fields: Partial<Position>): void;
  removePosition(id: string): void;

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
  patchPosition: (id, fields) =>
    set((s) => ({
      positions: s.positions.map((p) => (p.id === id ? { ...p, ...fields } : p)),
      dirty: true,
    })),
  removePosition: (id) =>
    set((s) => ({
      positions: s.positions.filter((p) => p.id !== id),
      // Unassign artists that were at this position
      artists: s.artists.map((a) =>
        a.positionId === id ? { ...a, positionId: null } : a
      ),
      dirty: true,
    })),

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
