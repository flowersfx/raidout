"use client";

import { POSITION_COLORS } from "@/types/models";
import { cn } from "@/lib/utils/cn";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {POSITION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className={cn(
            "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer",
            value === c ? "border-white scale-110" : "border-transparent"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
