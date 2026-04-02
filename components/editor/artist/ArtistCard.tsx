"use client";

import { useEffect, useRef, useState } from "react";
import { useEventStore } from "@/store/eventStore";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { getAllSlots, type Artist } from "@/types/models";

interface Props {
  artist: Artist;
  dragHandle?: React.HTMLAttributes<HTMLElement>;
}

export function ArtistCard({ artist, dragHandle }: Props) {
  const { positions, expandedArtistId, setExpandedArtist } = useEventStore();
  const position = positions.find((p) => p.id === artist.positionId);
  const isSelected = expandedArtistId === artist.id;
  const cardRef = useRef<HTMLButtonElement>(null);
  const prevIntakeUpdatedAt = useRef(artist.intakeUpdatedAt);
  const [submittedAnimatingOut, setSubmittedAnimatingOut] = useState(false);

  useEffect(() => {
    if (isSelected) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  useEffect(() => {
    const prev = prevIntakeUpdatedAt.current;
    prevIntakeUpdatedAt.current = artist.intakeUpdatedAt;
    if (prev !== null && artist.intakeUpdatedAt === null) {
      setSubmittedAnimatingOut(true);
      const t = setTimeout(() => setSubmittedAnimatingOut(false), 300);
      return () => clearTimeout(t);
    }
  }, [artist.intakeUpdatedAt]);

  return (
    <button
      ref={cardRef}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left rounded-lg border transition-colors",
        isSelected
          ? "border-accent/50 bg-surface"
          : "border-border bg-surface hover:border-border/80"
      )}
      onClick={() => setExpandedArtist(artist.id)}
    >
      {/* Drag handle */}
      {dragHandle && (
        <span
          className="text-dim text-xs cursor-grab active:cursor-grabbing select-none flex-shrink-0 mt-0.5"
          {...dragHandle}
          onClick={(e) => e.stopPropagation()}
        >
          ⣿
        </span>
      )}

      {/* Three-row content */}
      <span className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Row 1: name + intake badge */}
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm text-text truncate">{artist.name}</span>
          {(artist.intakeUpdatedAt || submittedAnimatingOut) ? (
            <span className={cn(
              "text-xs font-medium text-accent border border-accent/30 rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0",
              submittedAnimatingOut ? "anim-pop-out" : "anim-pop-in"
            )}>
              SUBMITTED
            </span>
          ) : artist.intakeSentAt ? (
            <span className="text-xs font-medium text-dim border border-border rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0 anim-pop-in">
              AWAITING
            </span>
          ) : null}
        </span>

        {/* Row 2: time slots (wrapping) */}
        <span className="text-xs text-muted mono flex flex-wrap gap-x-1.5">
          {getAllSlots(artist).map((s, i) => (
            <span key={i} className="whitespace-nowrap">{s.startTime}–{s.endTime}</span>
          ))}
        </span>

        {/* Row 3: position badge */}
        {position && (
          <span>
            <Badge label={position.name} color={position.color} />
          </span>
        )}
      </span>
    </button>
  );
}
