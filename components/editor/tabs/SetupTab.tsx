"use client";

import React, { useId, useState, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StageSVG } from "@/components/editor/stage/StageSVG";
import { PositionForm } from "@/components/editor/stage/PositionForm";
import { POSITION_COLORS, type Position } from "@/types/models";

function SortablePositionRow({ position }: { position: Position }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: position.id });

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing text-dim hover:text-muted touch-none"
      tabIndex={-1}
      aria-label="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="4" cy="3" r="1.5" />
        <circle cx="8" cy="3" r="1.5" />
        <circle cx="4" cy="8" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="4" cy="13" r="1.5" />
        <circle cx="8" cy="13" r="1.5" />
      </svg>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <PositionForm position={position} dragHandle={dragHandle} />
    </div>
  );
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function SetupTab() {
  const uid = useId();
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
  const { event, positions, patchEvent, addPosition, reorderPositions, lastDeletedPositions, undoRemovePosition, snapEnabled, snapSize, setSnapEnabled, setSnapSize } = useEventStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = positions.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderPositions(arrayMove(ids, oldIndex, newIndex));
  }

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  if (!event) return null;

  function handleAddPosition(shape: string = "rectangular") {
    const colorIndex = positions.length % POSITION_COLORS.length;
    addPosition({
      id: generateId(),
      eventId: event!.id,
      name: `Position ${positions.length + 1}`,
      x: 80 + (positions.length % 4) * 180,
      y: 80 + Math.floor(positions.length / 4) * 120,
      width: 140,
      height: shape === "round" ? 140 : 80,
      color: POSITION_COLORS[colorIndex],
      rotation: 0,
      sortOrder: positions.length,
      showSize: true,
      shape,
      collapsed: false,
    });
    setAddMenuOpen(false);
  }

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left panel: form fields */}
      <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-5">
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
            <div className="flex items-end gap-1.5">
              <Input
                id={`${uid}-sw`}
                label="Width"
                type="number"
                min={200}
                max={2000}
                value={event.stageWidth}
                onChange={(e) => patchEvent({ stageWidth: Number(e.target.value) })}
              />
              <span className="text-xs text-muted uppercase tracking-wider pb-2">cm</span>
            </div>
            <div className="flex items-end gap-1.5">
              <Input
                id={`${uid}-sd`}
                label="Depth"
                type="number"
                min={100}
                max={2000}
                value={event.stageDepth}
                onChange={(e) => patchEvent({ stageDepth: Number(e.target.value) })}
              />
              <span className="text-xs text-muted uppercase tracking-wider pb-2">cm</span>
            </div>
          </div>
          {/* FOH compass (left) + Snap (right) share one row */}
          <div className="flex items-start justify-between gap-2 mt-2">
            {/* FOH position */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted">FOH</span>
              <div className="grid grid-cols-3 gap-0.5" style={{ width: 54 }}>
              {[
                [null,     "top",    null   ],
                ["left",   null,     "right"],
                [null,     "bottom", null   ],
              ].map((row, ri) =>
                row.map((pos, ci) => {
                  if (!pos) return <div key={`${ri}-${ci}`} />;
                  const icons: Record<string, string> = { top: "↓", left: "→", right: "←", bottom: "↑" };
                  const active = (event.fohPosition ?? "bottom") === pos;
                  return (
                    <button
                      key={pos}
                      title={pos.charAt(0).toUpperCase() + pos.slice(1)}
                      onClick={() => patchEvent({ fohPosition: pos })}
                      className={`w-full aspect-square text-xs rounded transition-colors flex items-center justify-center ${
                        active
                          ? "bg-accent/20 text-accent border border-accent"
                          : "text-muted hover:bg-hover border border-border"
                      }`}
                    >
                      {icons[pos]}
                    </button>
                  );
                })
              )}
              </div>
            </div>{/* end FOH wrapper */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                <>
                  <Input
                    id={`${uid}-snap`}
                    inline
                    type="number"
                    min={1}
                    max={100}
                    value={snapSize}
                    onChange={(e) => setSnapSize(Math.max(1, Number(e.target.value)))}
                    className="w-16 text-xs"
                  />
                  <span className="text-xs text-muted uppercase tracking-wider">cm</span>
                </>
              )}
            </div>
          </div>{/* end FOH+snap row */}
        </section>

        {/* Positions */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-muted uppercase tracking-wider">Positions</h2>
            <div ref={addMenuRef} className="relative">
              <Button size="sm" variant="outline" onClick={() => setAddMenuOpen((o) => !o)}>
                + Add ▾
              </Button>
              {addMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[120px]"
                  onMouseLeave={() => setAddMenuOpen(false)}
                >
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => handleAddPosition("rectangular")}
                  >
                    ▭ Rectangular
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => handleAddPosition("round")}
                  >
                    ◯ Round
                  </button>
                </div>
              )}
            </div>
          </div>
          {positions.length === 0 && (
            <p className="text-xs text-dim py-2">No positions yet.</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={positions.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {(() => {
                const toastIndex = lastDeletedPositions.length > 0
                  ? lastDeletedPositions[0].index
                  : -1;
                const items: React.ReactNode[] = positions.map((pos) => (
                  <SortablePositionRow key={pos.id} position={pos} />
                ));
                if (toastIndex >= 0) {
                  const toast = (
                    <div key="undo-toast" className="flex items-center justify-between gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted">
                      <span>
                        {lastDeletedPositions.length === 1
                          ? <>Deleted <strong className="text-text">{lastDeletedPositions[0].position.name}</strong></>
                          : <>Deleted <strong className="text-text">{lastDeletedPositions.length} positions</strong></>
                        }
                      </span>
                      <Button size="sm" variant="outline" onClick={undoRemovePosition}>Undo</Button>
                    </div>
                  );
                  items.splice(Math.min(toastIndex, items.length), 0, toast);
                }
                return items;
              })()}
            </SortableContext>
          </DndContext>
        </section>
      </div>

      {/* Resizable divider */}
      <div
        onMouseDown={onDividerMouseDown}
        className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-accent transition-colors"
      />

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
