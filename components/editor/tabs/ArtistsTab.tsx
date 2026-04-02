"use client";

import React, { useState, useCallback, useRef } from "react";
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
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEventStore } from "@/store/eventStore";
import { ArtistCard } from "@/components/editor/artist/ArtistCard";
import { ArtistForm } from "@/components/editor/artist/ArtistForm";
import { Button } from "@/components/ui/Button";
import type { Artist } from "@/types/models";

function SortableArtist({ artist }: { artist: Artist }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: artist.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <ArtistCard artist={artist} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

export function ArtistsTab() {
  const [leftWidth, setLeftWidth] = useState(340);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    function onMouseMove(ev: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(ev.clientX - rect.left, 180), rect.width - 200);
      setLeftWidth(newWidth);
    }

    function onMouseUp() {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  const {
    artists, event, expandedArtistId, setExpandedArtist,
    addArtist, reorderArtists, lastDeletedArtist, undoRemoveArtist,
  } = useEventStore();

  const sorted = [...artists].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedArtist = artists.find((a) => a.id === expandedArtistId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((a) => a.id === active.id);
    const newIndex = sorted.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    reorderArtists(reordered.map((a) => a.id));
  }

  function handleAddArtist() {
    if (!event) return;
    const newId = Math.random().toString(36).slice(2, 11);
    addArtist({
      id: newId,
      eventId: event.id,
      positionId: null,
      name: "New Artist",
      startTime: "22:00",
      endTime: "23:00",
      tableMin: null,
      gearBrings: "",
      venueNeeds: "",
      routing: "",
      notes: "",
      extraSlots: "[]",
      arrivalTime: null,
      soundcheckStart: null,
      soundcheckEnd: null,
      soundcheckMinLength: null,
      intakeToken: crypto.randomUUID(),
      intakeSentAt: null,
      intakeUpdatedAt: null,
      sortOrder: artists.length,
    });
    setExpandedArtist(newId);
  }

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left panel: artist list */}
      <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-muted uppercase tracking-wider">
            Artists{" "}
            <span className="font-normal">({artists.length})</span>
          </h2>
          <Button size="sm" onClick={handleAddArtist}>
            + Add Artist
          </Button>
        </div>

        {artists.length === 0 ? (
          <div className="border border-border rounded-lg p-10 text-center">
            <p className="text-muted text-sm">No artists yet.</p>
            <Button size="sm" className="mt-3" onClick={handleAddArtist}>
              Add your first artist
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {(() => {
                  const items: React.ReactNode[] = sorted.map((artist) => (
                    <SortableArtist key={artist.id} artist={artist} />
                  ));
                  if (lastDeletedArtist) {
                    const toast = (
                      <div key="undo-toast" className="flex items-center justify-between gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted">
                        <span>
                          Deleted <strong className="text-text">{lastDeletedArtist.artist.name}</strong>
                        </span>
                        <Button size="sm" variant="outline" onClick={undoRemoveArtist}>Undo</Button>
                      </div>
                    );
                    items.splice(Math.min(lastDeletedArtist.index, items.length), 0, toast);
                  }
                  return items;
                })()}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Resizable divider */}
      <div
        onMouseDown={onDividerMouseDown}
        className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-accent transition-colors"
      />

      {/* Right panel: artist form */}
      <div className="flex-1 overflow-y-auto">
        {selectedArtist ? (
          <ArtistForm artist={selectedArtist} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            Select an artist to edit
          </div>
        )}
      </div>
    </div>
  );
}
