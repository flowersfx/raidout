"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateUserId } from "@/lib/identity";
import type { Event, Position, Artist } from "@/types/models";

export async function getEvents() {
  const userId = await getOrCreateUserId();
  return prisma.event.findMany({
    where: { createdBy: userId },
    orderBy: { date: "desc" },
  });
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      positions: { orderBy: { sortOrder: "asc" } },
      artists: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getEventByShareToken(token: string) {
  return prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      positions: { orderBy: { sortOrder: "asc" } },
      artists: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createEvent(data: {
  name: string;
  date: string;
  venue: string;
}) {
  const userId = await getOrCreateUserId();
  const event = await prisma.event.create({
    data: {
      name: data.name,
      date: new Date(data.date),
      venue: data.venue,
      createdBy: userId,
    },
  });
  revalidatePath("/");
  return event;
}

export async function updateEventMeta(
  id: string,
  data: Partial<Pick<Event, "name" | "date" | "venue" | "stageWidth" | "stageDepth">>
) {
  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.venue !== undefined && { venue: data.venue }),
      ...(data.stageWidth !== undefined && { stageWidth: data.stageWidth }),
      ...(data.stageDepth !== undefined && { stageDepth: data.stageDepth }),
    },
  });
  revalidatePath(`/event/${id}`);
  return updated;
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidatePath("/");
}

/**
 * Full snapshot save — called by auto-save.
 * Overwrites all positions and artists for the event atomically.
 */
export async function saveEventSnapshot(snapshot: {
  event: Event;
  positions: Position[];
  artists: Artist[];
}) {
  const { event, positions, artists } = snapshot;

  await prisma.$transaction(async (tx) => {
    // Update event meta
    await tx.event.update({
      where: { id: event.id },
      data: {
        name: event.name,
        date: new Date(event.date),
        venue: event.venue,
        stageWidth: event.stageWidth,
        stageDepth: event.stageDepth,
      },
    });

    // Sync positions: upsert all, delete removed ones
    const positionIds = positions.map((p) => p.id);
    await tx.position.deleteMany({
      where: { eventId: event.id, id: { notIn: positionIds } },
    });
    for (const p of positions) {
      await tx.position.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          eventId: event.id,
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation ?? 0,
          sortOrder: p.sortOrder ?? 0,
        },
        update: {
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation ?? 0,
          sortOrder: p.sortOrder ?? 0,
        },
      });
    }

    // Sync artists: upsert all, delete removed ones
    const artistIds = artists.map((a) => a.id);
    await tx.artist.deleteMany({
      where: { eventId: event.id, id: { notIn: artistIds } },
    });
    for (const a of artists) {
      await tx.artist.upsert({
        where: { id: a.id },
        create: {
          id: a.id,
          eventId: event.id,
          positionId: a.positionId,
          name: a.name,
          startTime: a.startTime,
          endTime: a.endTime,
          tableMin: a.tableMin,
          gearBrings: a.gearBrings,
          venueNeeds: a.venueNeeds,
          routing: a.routing,
          notes: a.notes,
          extraSlots: a.extraSlots ?? "[]",
          arrivalTime: a.arrivalTime,
          soundcheckStart: a.soundcheckStart,
          soundcheckEnd: a.soundcheckEnd,
          sortOrder: a.sortOrder,
        },
        update: {
          positionId: a.positionId,
          name: a.name,
          startTime: a.startTime,
          endTime: a.endTime,
          tableMin: a.tableMin,
          gearBrings: a.gearBrings,
          venueNeeds: a.venueNeeds,
          routing: a.routing,
          notes: a.notes,
          extraSlots: a.extraSlots ?? "[]",
          arrivalTime: a.arrivalTime,
          soundcheckStart: a.soundcheckStart,
          soundcheckEnd: a.soundcheckEnd,
          sortOrder: a.sortOrder,
        },
      });
    }
  });
}

type EventExportPosition = {
  _ref: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
};

type EventExportArtist = {
  name: string;
  positionRef: string | null;
  startTime: string;
  endTime: string;
  tableMin: string | null;
  gearBrings: string;
  venueNeeds: string;
  routing: string;
  notes: string;
  extraSlots: string;
  arrivalTime: string | null;
  soundcheckStart: string | null;
  soundcheckEnd: string | null;
  sortOrder: number;
};

export type EventExport = {
  version: number;
  exportedAt: string;
  event: {
    name: string;
    date: string | Date;
    venue: string;
    stageWidth: number;
    stageDepth: number;
  };
  positions: EventExportPosition[];
  artists: EventExportArtist[];
};

export async function importEvent(data: EventExport) {
  const userId = await getOrCreateUserId();

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        name: data.event.name,
        date: new Date(data.event.date),
        venue: data.event.venue,
        stageWidth: data.event.stageWidth,
        stageDepth: data.event.stageDepth,
        createdBy: userId,
      },
    });

    // Build a map from export _ref -> new position id
    const refToId = new Map<string, string>();

    for (const p of data.positions) {
      const created = await tx.position.create({
        data: {
          eventId: event.id,
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation,
        },
      });
      refToId.set(p._ref, created.id);
    }

    for (const a of data.artists) {
      await tx.artist.create({
        data: {
          eventId: event.id,
          positionId: a.positionRef ? (refToId.get(a.positionRef) ?? null) : null,
          name: a.name,
          startTime: a.startTime,
          endTime: a.endTime,
          tableMin: a.tableMin,
          gearBrings: a.gearBrings,
          venueNeeds: a.venueNeeds,
          routing: a.routing,
          notes: a.notes,
          extraSlots: a.extraSlots ?? "[]",
          arrivalTime: a.arrivalTime,
          soundcheckStart: a.soundcheckStart,
          soundcheckEnd: a.soundcheckEnd,
          sortOrder: a.sortOrder,
        },
      });
    }

    revalidatePath("/");
    return event.id;
  });
}
