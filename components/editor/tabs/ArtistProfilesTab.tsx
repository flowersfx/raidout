"use client";

import { useEventStore } from "@/store/eventStore";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";

export function ArtistProfilesTab() {
  const { artists, positions } = useEventStore();

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 w-full flex flex-col gap-4">
      {sorted.map((artist) => (
        <FOHArtistCard
          key={artist.id}
          artist={artist}
          position={positions.find((p) => p.id === artist.positionId)}
        />
      ))}
      {sorted.length === 0 && (
        <p className="text-sm text-muted">No artists — add them in the Artists tab.</p>
      )}
    </div>
  );
}
