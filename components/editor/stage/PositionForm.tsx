"use client";

import React, { useId, useState, useRef, useEffect } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { POSITION_COLORS } from "@/types/models";
import type { Position } from "@/types/models";

interface Props {
  position: Position;
  dragHandle?: React.ReactNode;
}

export function PositionForm({ position, dragHandle }: Props) {
  const { patchPosition, removePosition, clonePosition, selectedPositionIds, setSelectedPosition } = useEventStore();
  const uid = useId();
  const isSelected = selectedPositionIds.has(position.id);
  const [collapsed, setCollapsed] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const patch = (fields: Partial<Position>) => patchPosition(position.id, fields);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorOpen) return;
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [colorOpen]);

  return (
    <div
      className="p-3 rounded-lg bg-raised flex flex-col gap-2 cursor-pointer transition-colors"
      style={{
        border: isSelected ? `2px solid ${position.color}` : "1px solid var(--border)",
      }}
      onClick={() => setSelectedPosition(isSelected ? null : position.id)}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="flex items-center justify-between gap-2 h-7" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle (injected by sortable parent) */}
        {dragHandle}
        {/* Color swatch — clicking opens the palette in place of the other controls */}
        <div ref={colorRef} className="flex items-center shrink-0">
          <button
            type="button"
            title="Change color"
            onClick={() => setColorOpen(true)}
            className={`w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform border border-transparent${colorOpen ? " opacity-50" : ""}`}
            style={{ backgroundColor: position.color }}
          />
          {colorOpen && (
            <div className="flex items-center gap-1.5 ml-1.5">
              {POSITION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => { patch({ color: c }); setColorOpen(false); }}
                  className="w-4 h-4 rounded-full border border-transparent hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c, borderColor: c === position.color ? "white" : "transparent" }}
                />
              ))}
            </div>
          )}
        </div>
        {colorOpen ? (
          /* Spacer to push buttons out of view while palette is open */
          <div className="flex-1" />
        ) : (
          /* Normal controls */
          <>
            <input
              className="bg-transparent border-none text-sm font-semibold text-text focus:outline-none w-full"
              value={position.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Position name"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <svg
                width="10" height="10" viewBox="0 0 10 10"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.15s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
              >
                <polyline points="2,3 5,7 8,3" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clonePosition(position.id)}
              title="Clone position"
            >
              ⧉
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => removePosition(position.id)}
              title="Remove position"
            >
              ✕
            </Button>
          </>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <Input
              id={`${uid}-x`}
              label="X"
              inline
              type="number"
              value={String(position.x)}
              onChange={(e) => patch({ x: Number(e.target.value) })}
              min={0}
            />
            <Input
              id={`${uid}-y`}
              label="Y"
              inline
              type="number"
              value={String(position.y)}
              onChange={(e) => patch({ y: Number(e.target.value) })}
              min={0}
            />
            <Input
              id={`${uid}-rot`}
              label="R°"
              inline
              type="number"
              className="show-spin"
              value={String(position.rotation)}
              onChange={(e) => patch({ rotation: Number(e.target.value) })}
              min={-180}
              max={180}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              id={`${uid}-w`}
              label="W"
              inline
              type="number"
              value={String(position.width)}
              onChange={(e) => patch({ width: Number(e.target.value) })}
              min={20}
            />
            <Input
              id={`${uid}-h`}
              label="H"
              inline
              type="number"
              value={String(position.height)}
              onChange={(e) => patch({ height: Number(e.target.value) })}
              min={20}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={position.showSize ?? true}
              onChange={(e) => patch({ showSize: e.target.checked })}
              className="accent-accent"
            />
            Show size on stage
          </label>
        </>
      )}
    </div>
  );
}
