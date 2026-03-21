"use client";

import { useEventStore } from "@/store/eventStore";
import { Badge } from "@/components/ui/Badge";
import { ArtistForm } from "./ArtistForm";
import { cn } from "@/lib/utils/cn";
import { getAllSlots, type Artist } from "@/types/models";

interface Props {
  artist: Artist;
  dragHandle?: React.HTMLAttributes<HTMLElement>;
}

export function ArtistCard({ artist, dragHandle }: Props) {
  const { positions, expandedArtistId, setExpandedArtist } = useEventStore();
  const position = positions.find((p) => p.id === artist.positionId);
  const isExpanded = expandedArtistId === artist.id;

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-colors",
        isExpanded ? "border-accent/50 bg-surface" : "border-border bg-surface hover:border-border/80"
      )}
    >
      {/* Header / collapsed chip */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
        onClick={() => setExpandedArtist(isExpanded ? null : artist.id)}
      >
        {/* Drag handle */}
        {dragHandle && (
          <span
            className="text-dim text-xs cursor-grab active:cursor-grabbing select-none"
            {...dragHandle}
            onClick={(e) => e.stopPropagation()}
          >
            ⣿
          </span>
        )}

        {/* Color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: position?.color ?? "#444" }}
        />

        {/* Name + time */}
        <span className="font-semibold text-sm text-text flex-1 truncate">{artist.name}</span>
        <span className="text-xs text-muted mono whitespace-nowrap">
          {getAllSlots(artist).map((s, i) => (
            <span key={i}>{i > 0 && ", "}{s.startTime}–{s.endTime}</span>
          ))}
        </span>

        {/* Position badge */}
        {position && (
          <Badge label={position.name} color={position.color} />
        )}

        {/* Chevron */}
        <span className={cn("text-dim text-xs transition-transform", isExpanded && "rotate-180")}>
          ▾
        </span>
      </button>

      {isExpanded && <ArtistForm artist={artist} />}
    </div>
  );
}
