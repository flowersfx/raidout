"use client";

import { useId, useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StageSVG } from "@/components/editor/stage/StageSVG";
import { PositionForm } from "@/components/editor/stage/PositionForm";
import { POSITION_COLORS } from "@/types/models";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function SetupTab() {
  const uid = useId();
  const { event, positions, patchEvent, addPosition, lastDeletedPosition, undoRemovePosition, snapEnabled, snapSize, setSnapEnabled, setSnapSize } = useEventStore();
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss undo toast after 5 seconds
  useEffect(() => {
    if (lastDeletedPosition) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        useEventStore.setState({ lastDeletedPosition: null });
      }, 5000);
    }
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [lastDeletedPosition]);

  if (!event) return null;

  function handleAddPosition() {
    const colorIndex = positions.length % POSITION_COLORS.length;
    addPosition({
      id: generateId(),
      eventId: event!.id,
      name: `Position ${positions.length + 1}`,
      x: 80 + (positions.length % 4) * 180,
      y: 80 + Math.floor(positions.length / 4) * 120,
      width: 140,
      height: 80,
      color: POSITION_COLORS[colorIndex],
      rotation: 0,
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: form fields */}
      <div className="w-72 flex-shrink-0 border-r border-border overflow-y-auto p-4 flex flex-col gap-5">
        {/* Event meta */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Event</h2>
          <div className="flex flex-col gap-3">
            <Input
              id={`${uid}-name`}
              label="Name"
              value={event.name}
              onChange={(e) => patchEvent({ name: e.target.value })}
            />
            <Input
              id={`${uid}-date`}
              label="Date"
              type="date"
              value={event.date.slice(0, 10)}
              onChange={(e) => patchEvent({ date: e.target.value })}
            />
            <Input
              id={`${uid}-venue`}
              label="Venue"
              value={event.venue}
              onChange={(e) => patchEvent({ venue: e.target.value })}
            />
          </div>
        </section>

        {/* Stage dimensions */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Stage</h2>
          <div className="grid grid-cols-2 gap-2">
            <Input
              id={`${uid}-sw`}
              label="Width (cm)"
              type="number"
              min={200}
              max={2000}
              value={event.stageWidth}
              onChange={(e) => patchEvent({ stageWidth: Number(e.target.value) })}
            />
            <Input
              id={`${uid}-sd`}
              label="Depth (cm)"
              type="number"
              min={100}
              max={2000}
              value={event.stageDepth}
              onChange={(e) => patchEvent({ stageDepth: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className="accent-accent"
              />
              Snap
            </label>
            {snapEnabled && (
              <Input
                id={`${uid}-snap`}
                label="cm"
                inline
                type="number"
                min={1}
                max={100}
                value={snapSize}
                onChange={(e) => setSnapSize(Math.max(1, Number(e.target.value)))}
                className="w-16 text-xs"
              />
            )}
          </div>
        </section>

        {/* Positions */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-muted uppercase tracking-wider">Positions</h2>
            <Button size="sm" variant="outline" onClick={handleAddPosition}>
              + Add
            </Button>
          </div>
          {positions.length === 0 && (
            <p className="text-xs text-dim py-2">No positions yet.</p>
          )}
          {positions.map((pos) => (
            <PositionForm key={pos.id} position={pos} />
          ))}
          {lastDeletedPosition && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted">
              <span>Deleted <strong className="text-text">{lastDeletedPosition.position.name}</strong></span>
              <Button size="sm" variant="outline" onClick={undoRemovePosition}>
                Undo
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Right panel: live stage preview */}
      <div className="flex-1 flex flex-col p-4 gap-2 overflow-hidden">
        <p className="text-xs text-muted uppercase tracking-wider flex-shrink-0">
          Stage Preview — drag positions to reposition
        </p>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full h-full max-h-full">
            <StageSVG mode="edit" />
          </div>
        </div>
      </div>
    </div>
  );
}
