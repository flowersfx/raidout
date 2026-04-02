"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { getAllSlots, type Artist, type Position } from "@/types/models";

interface Props {
  artist: Artist;
  position?: Position;
  printMode?: boolean;
  focused?: boolean;
  onSelect?: (id: string | undefined) => void;
}

function DataBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <pre className="preformatted text-text">{value}</pre>
    </div>
  );
}

export function FOHArtistCard({ artist, position, printMode = false, focused = false, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = printMode || expanded;

  useEffect(() => {
    if (focused) setExpanded(true);
  }, [focused]);

  return (
    <div
      id={`artist-${artist.id}`}
      className="rounded-lg overflow-hidden bg-surface transition-colors"
      style={{ border: focused && position && !printMode ? `2px solid ${position.color}` : "1px solid var(--border)" }}
    >
      {/* Card header — click to expand/collapse */}
      <button
        className={cn(
          "w-full px-4 py-3 flex items-center gap-3 text-left",
          isExpanded && "border-b border-border"
        )}
        style={position ? { borderLeftColor: position.color, borderLeftWidth: 3 } : undefined}
        onClick={() => {
          if (printMode) return;
          setExpanded((v) => !v);
          onSelect?.(focused ? undefined : artist.id);
        }}
      >
        <div className="flex-1">
          <p className="font-bold text-text">{artist.name}</p>
          <p className="text-xs text-muted mono mt-0.5">
            {getAllSlots(artist).map((s, i) => `${i > 0 ? ", " : ""}${s.startTime}–${s.endTime}`).join("")}
            {artist.arrivalTime && ` · Arrival: ${artist.arrivalTime}`}
            {artist.soundcheckStart && artist.soundcheckEnd && ` · SC: ${artist.soundcheckStart}–${artist.soundcheckEnd}`}
            {artist.tableMin && ` · Table: ${artist.tableMin}`}
          </p>
        </div>
        {position && <Badge label={position.name} color={position.color} />}
        {!printMode && (
          <svg
            viewBox="0 0 6 10" width="6" height="10"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={cn("text-dim flex-shrink-0 transition-transform", isExpanded && "rotate-90")}
          >
            <path d="M1 1l4 4-4 4" />
          </svg>
        )}
      </button>

      {/* Body — only when expanded */}
      {isExpanded && (
        <div className="p-4 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataBlock label="Gear they bring" value={artist.gearBrings} />
            <DataBlock label="Venue must provide" value={artist.venueNeeds} />
          </div>
          <DataBlock label="Signal routing" value={artist.routing} />
          <DataBlock label="Notes" value={artist.notes} />
        </div>
      )}
    </div>
  );
}
