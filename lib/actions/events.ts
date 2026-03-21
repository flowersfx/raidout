"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Event, Position, Artist } from "@/types/models";

// Dev user stub — replaced by session.user.id once auth is wired up
const DEV_USER_ID = async () => {
  const user = await prisma.user.findUnique({ where: { email: "dev@raidout.local" } });
  if (!user) throw new Error("Dev user not found — run: npx prisma db seed");
  return user.id;
};

export async function getEvents() {
  const userId = await DEV_USER_ID();
  return prisma.event.findMany({
    where: { createdBy: userId },
    orderBy: { date: "desc" },
  });
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      positions: { orderBy: { name: "asc" } },
      artists: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getEventByShareToken(token: string) {
  return prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      positions: { orderBy: { name: "asc" } },
      artists: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createEvent(data: {
  name: string;
  date: string;
  venue: string;
}) {
  const userId = await DEV_USER_ID();
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
        },
        update: {
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation ?? 0,
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
