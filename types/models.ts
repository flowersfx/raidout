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
  sortOrder: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
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
  extraSlots: string; // JSON array of TimeSlot[]
  arrivalTime: string | null;
  soundcheckStart: string | null;
  soundcheckEnd: string | null;
  sortOrder: number;
}

/** Get all time slots for an artist (primary + extras) */
export function getAllSlots(artist: Artist): TimeSlot[] {
  const primary: TimeSlot = { startTime: artist.startTime, endTime: artist.endTime };
  try {
    const extras: TimeSlot[] = JSON.parse(artist.extraSlots || "[]");
    return [primary, ...extras];
  } catch {
    return [primary];
  }
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
