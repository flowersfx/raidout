"use client";

import { parseHHMM, resolveEndTime, sortableStartTime } from "@/lib/utils/time";
import { getAllSlots, type Artist, type Position } from "@/types/models";

interface Props {
  artists: Artist[];
  positions: Position[];
}

export function TimelineBar({ artists, positions }: Props) {
  if (artists.length === 0) return null;

  // Collect all start times across all slots for midnight heuristic
  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));

  // Compute resolved times for all slots (handling midnight crossing)
  const resolved = artists.flatMap((a) => {
    const slots = getAllSlots(a);
    return slots.map((slot, slotIndex) => {
      const sortedStart = sortableStartTime(slot.startTime, allStartTimes);
      const rawStart = parseHHMM(slot.startTime);
      const resolvedEnd = resolveEndTime(slot.startTime, slot.endTime);
      return {
        artist: a,
        slotIndex,
        start: sortedStart,
        end: resolvedEnd + (sortedStart - rawStart),
        slot,
      };
    });
  });

  const allTimes = resolved.flatMap((r) => [r.start, r.end]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const span = maxTime - minTime || 60;

  const toPercent = (t: number) => ((t - minTime) / span) * 100;

  // Hour tick marks
  const startHour = Math.ceil(minTime / 60);
  const endHour = Math.floor(maxTime / 60);
  const ticks = [];
  for (let h = startHour; h <= endHour; h++) {
    ticks.push(h);
  }

  return (
    <div className="relative h-16 bg-raised rounded-lg overflow-hidden border border-border">
      {/* Hour ticks */}
      {ticks.map((h) => {
        const pct = toPercent(h * 60);
        return (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-border/50"
            style={{ left: `${pct}%` }}
          >
            <span className="absolute top-1 left-1 text-xs text-dim mono">
              {String(h % 24).padStart(2, "0")}:00
            </span>
          </div>
        );
      })}

      {/* Artist blocks */}
      {resolved.map(({ artist, slotIndex, start, end, slot }) => {
        const position = positions.find((p) => p.id === artist.positionId);
        const left = toPercent(start);
        const width = toPercent(end) - left;

        return (
          <div
            key={`${artist.id}-${slotIndex}`}
            className="absolute top-4 bottom-4 rounded flex items-center justify-center overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.5)}%`,
              backgroundColor: (position?.color ?? "#00e5ff") + "33",
              borderLeft: `2px solid ${position?.color ?? "#00e5ff"}`,
            }}
            title={`${artist.name} · ${slot.startTime}–${slot.endTime}`}
          >
            <span className="text-xs font-medium text-text truncate px-1">
              {artist.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
