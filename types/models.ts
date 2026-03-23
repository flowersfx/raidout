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
  shareToken: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  artistsLastReviewedAt: string | null; // ISO string
}

export interface Stage {
  id: string;
  eventId: string;
  name: string;
  stageWidth: number;
  stageDepth: number;
  fohPosition: string;
  sortOrder: number;
}

export interface Position {
  id: string;
  eventId: string;
  stageId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  sortOrder: number;
  showSize: boolean;
  showBorders: boolean;
  shape: string;
  collapsed: boolean;
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
  soundcheckMinLength: string | null;
  intakeToken: string;
  intakeUpdatedAt: string | null; // ISO string
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
  "#9e9e9e",
  "#546e7a",
] as const;
