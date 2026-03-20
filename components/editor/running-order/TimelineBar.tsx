"use client";

import { parseHHMM } from "@/lib/utils/time";
import type { Artist, Position } from "@/types/models";

interface Props {
  artists: Artist[];
  positions: Position[];
}

export function TimelineBar({ artists, positions }: Props) {
  if (artists.length === 0) return null;

  const times = artists.flatMap((a) => [parseHHMM(a.startTime), parseHHMM(a.endTime)]);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
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
      {artists.map((artist) => {
        const position = positions.find((p) => p.id === artist.positionId);
        const left = toPercent(parseHHMM(artist.startTime));
        const width = toPercent(parseHHMM(artist.endTime)) - left;

        return (
          <div
            key={artist.id}
            className="absolute top-4 bottom-4 rounded flex items-center justify-center overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: (position?.color ?? "#00e5ff") + "33",
              borderLeft: `2px solid ${position?.color ?? "#00e5ff"}`,
            }}
            title={`${artist.name} · ${artist.startTime}–${artist.endTime}`}
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
