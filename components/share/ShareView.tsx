import { StageSVG } from "@/components/editor/stage/StageSVG";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { ChangeoverBadge } from "@/components/editor/running-order/ChangeoverBadge";
import { Badge } from "@/components/ui/Badge";
import { gapMinutes, changeoverStatus } from "@/lib/utils/time";
import type { Event, Position, Artist } from "@/types/models";

interface Props {
  event: Event;
  positions: Position[];
  artists: Artist[];
}

export function ShareView({ event, positions, artists }: Props) {
  const sorted = [...artists].sort((a, b) =>
    a.startTime.replace(":", "").localeCompare(b.startTime.replace(":", ""))
  );

  // Pre-compute changeovers
  const changeovers = sorted.slice(1).map((artist, i) => {
    const prev = sorted[i];
    const gap = gapMinutes(prev.endTime, artist.startTime);
    return {
      afterArtistId: artist.id,
      gapMin: gap,
      status: changeoverStatus(gap),
      samePosition: !!prev.positionId && prev.positionId === artist.positionId,
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-10">
      {/* Event header */}
      <header className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-text">{event.name}</h1>
        <p className="text-muted mt-1">
          {new Date(event.date).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          &bull; {event.venue}
        </p>
        <p className="text-xs text-dim mono mt-2">
          Stage: {event.stageWidth}×{event.stageDepth} units &bull;{" "}
          {positions.length} positions &bull; {artists.length} artists
        </p>
      </header>

      {/* Stage plot */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Stage Plot</h2>
        <div className="border border-border rounded-lg overflow-hidden aspect-video bg-[#111]">
          <StageSVG
            mode="view"
            externalPositions={positions}
            externalArtists={artists}
            stageWidth={event.stageWidth}
            stageDepth={event.stageDepth}
            annotateGear
          />
        </div>
      </section>

      {/* Running order */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Running Order</h2>
        <div className="mb-4">
          <TimelineBar artists={sorted} positions={positions} />
        </div>
        <div className="flex flex-col">
          {sorted.map((artist, i) => {
            const position = positions.find((p) => p.id === artist.positionId);
            const changeover = changeovers.find((c) => c.afterArtistId === artist.id);
            return (
              <div key={artist.id}>
                {changeover && (
                  <ChangeoverBadge
                    gap={changeover.gapMin}
                    status={changeover.status}
                    samePosition={changeover.samePosition}
                  />
                )}
                <div className="flex items-center gap-4 py-3 border-b border-border/50">
                  <span className="text-dim mono text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: position?.color ?? "#333" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text">{artist.name}</p>
                    {position && <Badge label={position.name} color={position.color} className="mt-0.5" />}
                  </div>
                  <span className="mono text-sm text-muted whitespace-nowrap">
                    {artist.startTime} – {artist.endTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOH artist cards */}
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
