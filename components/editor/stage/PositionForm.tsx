"use client";

import { useId, useState, useRef, useEffect } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { POSITION_COLORS } from "@/types/models";
import type { Position } from "@/types/models";

interface Props {
  position: Position;
}

export function PositionForm({ position }: Props) {
  const { patchPosition, removePosition, clonePosition, selectedPositionIds, setSelectedPosition } = useEventStore();
  const uid = useId();
  const isSelected = selectedPositionIds.has(position.id);
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
      <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Color swatch / inline picker */}
        <div ref={colorRef} className="relative flex items-center shrink-0">
          {colorOpen ? (
            <div className="flex gap-1">
              {POSITION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    patch({ color: c });
                    setColorOpen(false);
                  }}
                  className="w-4 h-4 rounded-full border border-transparent hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c, borderColor: c === position.color ? "white" : "transparent" }}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              title="Change color"
              onClick={() => setColorOpen(true)}
              className="w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform border border-transparent"
              style={{ backgroundColor: position.color }}
            />
          )}
        </div>
        <input
          className="bg-transparent border-none text-sm font-semibold text-text focus:outline-none w-full"
          value={position.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Position name"
        />
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
      </div>

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
          label="R"
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
    </div>
  );
}
