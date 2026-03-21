"use client";

import { useId } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import type { Position } from "@/types/models";

interface Props {
  position: Position;
}

export function PositionForm({ position }: Props) {
  const { patchPosition, removePosition } = useEventStore();
  const uid = useId();

  const patch = (fields: Partial<Position>) => patchPosition(position.id, fields);

  return (
    <div className="p-3 border border-border rounded-lg bg-raised flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <input
          className="bg-transparent border-none text-sm font-semibold text-text focus:outline-none w-full"
          value={position.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Position name"
        />
        <Button
          variant="danger"
          size="sm"
          onClick={() => removePosition(position.id)}
          title="Remove position"
        >
          ✕
        </Button>
      </div>

      <ColorPicker value={position.color} onChange={(c) => patch({ color: c })} />

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
