"use client";

import { useEventStore } from "@/store/eventStore";
import { useChangeovers } from "@/hooks/useChangeovers";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { ChangeoverBadge } from "@/components/editor/running-order/ChangeoverBadge";
import { Badge } from "@/components/ui/Badge";

export function RunningOrderTab() {
  const { artists, positions } = useEventStore();
  const changeovers = useChangeovers();

  const sorted = [...artists].sort((a, b) =>
    a.startTime.replace(":", "").localeCompare(b.startTime.replace(":", ""))
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 w-full flex flex-col gap-6">
      {/* Timeline bar */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Timeline</h2>
        <TimelineBar artists={sorted} positions={positions} />
      </section>

      {/* Detailed list */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Running Order</h2>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No artists — add them in the Artists tab.</p>
        ) : (
          <div className="flex flex-col">
            {sorted.map((artist, i) => {
              const position = positions.find((p) => p.id === artist.positionId);
              const changeover = changeovers.find((c) => c.afterArtistId === artist.id);

              return (
                <div key={artist.id}>
                  {/* Changeover before this slot */}
                  {changeover && (
                    <ChangeoverBadge
                      gap={changeover.gapMin}
                      status={changeover.status}
                      samePosition={changeover.samePosition}
                    />
                  )}

                  {/* Artist row */}
                  <div className="flex items-center gap-4 py-3 border-b border-border/50">
                    {/* Index */}
                    <span className="text-dim mono text-xs w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* Color stripe */}
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: position?.color ?? "#333" }}
                    />

                    {/* Name + position */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text">{artist.name}</p>
                      {position && (
                        <Badge
                          label={position.name}
                          color={position.color}
                          className="mt-0.5"
                        />
                      )}
                    </div>

                    {/* Times */}
                    <span className="mono text-sm text-muted whitespace-nowrap">
                      {artist.startTime} – {artist.endTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
