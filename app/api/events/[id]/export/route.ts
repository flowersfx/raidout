import { type NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/actions/events";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    event: {
      name: event.name,
      date: event.date,
      venue: event.venue,
    },
    stages: event.stages.map((s) => ({
      _ref: s.id,
      name: s.name,
      stageWidth: s.stageWidth,
      stageDepth: s.stageDepth,
      fohPosition: s.fohPosition,
      sortOrder: s.sortOrder,
    })),
    positions: event.positions.map((p) => ({
      _ref: p.id,
      stageRef: p.stageId,
      name: p.name,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      color: p.color,
      rotation: p.rotation,
    })),
    artists: event.artists.map((a) => ({
      name: a.name,
      positionRef: a.positionId ?? null,
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
    })),
  };

  const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dateStr = new Date(event.date).toISOString().slice(0, 10);

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="raidout-${slug}-${dateStr}.json"`,
    },
  });
}
