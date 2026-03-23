"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateUserId } from "@/lib/identity";
import type { Event, Stage, Position, Artist } from "@/types/models";

export async function getEvents() {
  const userId = await getOrCreateUserId();
  return prisma.event.findMany({
    where: { createdBy: userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function reorderEvents(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.event.update({ where: { id }, data: { sortOrder: i * 10 } })
    )
  );
  revalidatePath("/");
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      positions: { orderBy: { sortOrder: "asc" } },
      artists: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getEventByShareToken(token: string) {
  return prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
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
      stages: {
        create: {
          name: "Stage",
          stageWidth: 800,
          stageDepth: 400,
          fohPosition: "bottom",
          sortOrder: 0,
        },
      },
    },
  });
  revalidatePath("/");
  return event;
}

export async function updateEventMeta(
  id: string,
  data: Partial<Pick<Event, "name" | "date" | "venue">>
) {
  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.venue !== undefined && { venue: data.venue }),
    },
  });
  revalidatePath(`/event/${id}`);
  return updated;
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidatePath("/");
}

export async function duplicateEvent(id: string) {
  const userId = await getOrCreateUserId();
  const source = await getEvent(id);
  if (!source) throw new Error("Event not found");

  return prisma.$transaction(async (tx) => {
    // Normalize existing events and find insertion point for the clone
    const allEvents = await tx.event.findMany({
      where: { createdBy: userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    const sourceIndex = allEvents.findIndex((e) => e.id === id);
    await Promise.all(
      allEvents.map((e, i) =>
        tx.event.update({ where: { id: e.id }, data: { sortOrder: i * 10 } })
      )
    );

    const copy = await tx.event.create({
      data: {
        name: `${source.name} (copy)`,
        date: source.date,
        venue: source.venue,
        createdBy: userId,
        sortOrder: sourceIndex * 10 + 5,
      },
    });

    // Copy stages, building a map from source stage id → new stage id
    const stageIdMap = new Map<string, string>();
    for (const s of source.stages) {
      const created = await tx.stage.create({
        data: {
          eventId: copy.id,
          name: s.name,
          stageWidth: s.stageWidth,
          stageDepth: s.stageDepth,
          fohPosition: s.fohPosition,
          sortOrder: s.sortOrder,
        },
      });
      stageIdMap.set(s.id, created.id);
    }

    // Copy positions
    const positionIdMap = new Map<string, string>();
    for (const p of source.positions) {
      const newStageId = stageIdMap.get(p.stageId) ?? [...stageIdMap.values()][0];
      const created = await tx.position.create({
        data: {
          eventId: copy.id,
          stageId: newStageId,
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation,
          shape: p.shape,
          showSize: p.showSize,
          showBorders: p.showBorders,
          sortOrder: p.sortOrder,
        },
      });
      positionIdMap.set(p.id, created.id);
    }

    for (const a of source.artists) {
      await tx.artist.create({
        data: {
          eventId: copy.id,
          positionId: a.positionId ? (positionIdMap.get(a.positionId) ?? null) : null,
          name: a.name,
          startTime: a.startTime,
          endTime: a.endTime,
          tableMin: a.tableMin,
          gearBrings: a.gearBrings,
          venueNeeds: a.venueNeeds,
          routing: a.routing,
          notes: a.notes,
          extraSlots: a.extraSlots,
          arrivalTime: a.arrivalTime,
          soundcheckStart: a.soundcheckStart,
          soundcheckEnd: a.soundcheckEnd,
          sortOrder: a.sortOrder,
        },
      });
    }

    revalidatePath("/");
    return copy.id;
  });
}

/**
 * Full snapshot save — called by auto-save.
 * Atomically syncs all stages, positions, and artists for the event.
 */
export async function saveEventSnapshot(snapshot: {
  event: Event;
  stages: Stage[];
  positions: Position[];
  artists: Artist[];
}) {
  const { event, stages, positions, artists } = snapshot;

  await prisma.$transaction(async (tx) => {
    // Update event meta
    await tx.event.update({
      where: { id: event.id },
      data: {
        name: event.name,
        date: new Date(event.date),
        venue: event.venue,
      },
    });

    // Sync stages: upsert all, delete removed ones
    const stageIds = stages.map((s) => s.id);
    await tx.stage.deleteMany({
      where: { eventId: event.id, id: { notIn: stageIds } },
    });
    for (const s of stages) {
      await tx.stage.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          eventId: event.id,
          name: s.name,
          stageWidth: s.stageWidth,
          stageDepth: s.stageDepth,
          fohPosition: s.fohPosition,
          sortOrder: s.sortOrder ?? 0,
        },
        update: {
          name: s.name,
          stageWidth: s.stageWidth,
          stageDepth: s.stageDepth,
          fohPosition: s.fohPosition,
          sortOrder: s.sortOrder ?? 0,
        },
      });
    }

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
          stageId: p.stageId,
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation ?? 0,
          sortOrder: p.sortOrder ?? 0,
          showSize: p.showSize ?? true,
          showBorders: p.showBorders ?? true,
          shape: p.shape ?? "rectangular",
          collapsed: p.collapsed ?? false,
        },
        update: {
          stageId: p.stageId,
          name: p.name,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          color: p.color,
          rotation: p.rotation ?? 0,
          sortOrder: p.sortOrder ?? 0,
          showSize: p.showSize ?? true,
          showBorders: p.showBorders ?? true,
          shape: p.shape ?? "rectangular",
          collapsed: p.collapsed ?? false,
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

// ─── Export / Import ──────────────────────────────────────────────────────────

type EventExportStage = {
  _ref: string;
  name: string;
  stageWidth: number;
  stageDepth: number;
  fohPosition: string;
  sortOrder: number;
};

type EventExportPosition = {
  _ref: string;
  stageRef: string;
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
    // v1 legacy fields (single stage)
    stageWidth?: number;
    stageDepth?: number;
  };
  // v2: stages array; v1: absent (single stage inferred from event fields)
  stages?: EventExportStage[];
  positions: (EventExportPosition & { stageRef?: string })[];
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
        createdBy: userId,
      },
    });

    // Build stage ref → new stage id map
    const stageRefToId = new Map<string, string>();

    if (data.stages && data.stages.length > 0) {
      // v2: explicit stages array
      for (const s of data.stages) {
        const created = await tx.stage.create({
          data: {
            eventId: event.id,
            name: s.name,
            stageWidth: s.stageWidth,
            stageDepth: s.stageDepth,
            fohPosition: s.fohPosition,
            sortOrder: s.sortOrder,
          },
        });
        stageRefToId.set(s._ref, created.id);
      }
    } else {
      // v1 legacy: single stage from event fields
      const created = await tx.stage.create({
        data: {
          eventId: event.id,
          name: "Stage",
          stageWidth: data.event.stageWidth ?? 800,
          stageDepth: data.event.stageDepth ?? 400,
          fohPosition: "bottom",
          sortOrder: 0,
        },
      });
      stageRefToId.set("__default__", created.id);
    }

    const defaultStageId = [...stageRefToId.values()][0];

    // Build position ref → new position id map
    const refToId = new Map<string, string>();
    for (const p of data.positions) {
      const stageId = p.stageRef
        ? (stageRefToId.get(p.stageRef) ?? defaultStageId)
        : defaultStageId;
      const created = await tx.position.create({
        data: {
          eventId: event.id,
          stageId,
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
