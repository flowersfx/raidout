"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { EventCard } from "./EventCard";
import { reorderEvents } from "@/lib/actions/events";

interface EventData {
  id: string;
  name: string;
  date: string;
  venue: string;
  stageName: string;
}

interface PendingClone {
  afterId: string;
  name: string;
  uid: string;
}


function PendingCloneCard({ name }: { name: string }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 16);
    return () => clearTimeout(t);
  }, []);

  return (
    <li
      className="grid"
      style={{
        gridTemplateRows: entered ? "1fr" : "0fr",
        opacity: entered ? 1 : 0,
        transition: "grid-template-rows 0.3s ease, opacity 0.25s ease",
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex items-stretch gap-2">
          <div className="w-5 shrink-0" /> {/* drag handle placeholder */}
          <div className="flex-1 flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-48 rounded bg-raised animate-pulse" />
              <div className="h-2.5 w-32 rounded bg-raised animate-pulse opacity-60" />
            </div>
            <span className="text-dim text-xs mono ml-4">Cloning {name}…</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="w-9 h-8 rounded-lg border border-border bg-raised animate-pulse opacity-30" />
              <div className="w-9 h-8 rounded-lg border border-border bg-raised animate-pulse opacity-30" />
            </div>
            <div className="flex-1 rounded-lg border border-border bg-raised animate-pulse opacity-30" />
          </div>
        </div>
      </div>
    </li>
  );
}

export function EventList({ events: initialEvents }: { events: EventData[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [pendingClones, setPendingClones] = useState<PendingClone[]>([]);

  // Sync when server re-renders with updated data; clear placeholders at the same time
  useEffect(() => {
    setEvents(initialEvents);
    setPendingClones([]);
  }, [initialEvents]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = events.map((ev) => ev.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const reordered = arrayMove(events, oldIndex, newIndex);
    setEvents(reordered); // optimistic update
    reorderEvents(reordered.map((ev) => ev.id));
  }

  function startPendingClone(afterId: string, name: string) {
    const uid = `${afterId}-${Date.now()}`;
    setPendingClones((prev) => [...prev, { afterId, name, uid }]);
  }

  const items: React.ReactNode[] = [];
  for (const event of events) {
    items.push(
      <EventCard
        key={event.id}
        id={event.id}
        name={event.name}
        date={event.date}
        venue={event.venue}
        stageName={event.stageName}
        onDuplicateStart={() => startPendingClone(event.id, event.name)}
      />
    );
    pendingClones
      .filter((p) => p.afterId === event.id)
      .forEach((p) => items.push(<PendingCloneCard key={p.uid} name={p.name} />));
  }

  return (
    <DndContext id="event-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3">{items}</ul>
      </SortableContext>
    </DndContext>
  );
}
