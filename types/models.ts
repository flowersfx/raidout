// Client-side TypeScript mirrors of Prisma models.
// Prisma types are server-only; these are used in client components + Zustand store.

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO string (serialized from DateTime)
  venue: string;
  stageWidth: number;
  stageDepth: number;
  shareToken: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  eventId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}

export interface Artist {
  id: string;
  eventId: string;
  positionId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  tableMin: string | null;
  gearBrings: string;
  venueNeeds: string;
  routing: string;
  notes: string;
  sortOrder: number;
}

// Palette for new positions
export const POSITION_COLORS = [
  "#00e5ff",
  "#ff4081",
  "#69f0ae",
  "#ffab40",
  "#e040fb",
  "#ff6e40",
  "#40c4ff",
  "#b2ff59",
] as const;
