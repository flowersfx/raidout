"use client";

import { useEventStore } from "@/store/eventStore";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";

export function FOHTab() {
  const { artists, positions } = useEventStore();

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 w-full flex flex-col gap-8">
      {/* Per-artist cards */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-4">Artist Profiles</h2>
        <div className="flex flex-col gap-4">
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
      </section>

      {/* Master input list */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-4">
          Master Input / Channel List
        </h2>
        <div className="bg-surface border border-border rounded-lg p-4">
          <MasterInputList artists={sorted} positions={positions} />
        </div>
      </section>
    </div>
  );
}
