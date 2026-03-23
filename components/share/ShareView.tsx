import { StageSVG } from "@/components/editor/stage/StageSVG";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { RunningOrderGrid } from "@/components/editor/running-order/RunningOrderGrid";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots, type Event, type Position, type Artist } from "@/types/models";

// FOH_LABEL_HEIGHT must match StageSVG constant
const FOH_LABEL_HEIGHT = 24;

interface Props {
  event: Event;
  positions: Position[];
  artists: Artist[];
}

export function ShareView({ event, positions, artists }: Props) {
  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  const fohPos = event.fohPosition ?? "bottom";
  const fohHidden = fohPos === "none";
  const isVerticalFoh = fohPos === "left" || fohPos === "right";
  const stageAspect = fohHidden
    ? event.stageWidth / event.stageDepth
    : isVerticalFoh
    ? (event.stageWidth + FOH_LABEL_HEIGHT) / event.stageDepth
    : event.stageWidth / (event.stageDepth + FOH_LABEL_HEIGHT);

  return (
    <div className="py-8 flex flex-col gap-10">

      {/* Event header — constrained width */}
      <header className="max-w-6xl mx-auto w-full px-6 border-b border-border pb-6">
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
          Stage: {event.stageWidth}×{event.stageDepth} cm &bull;{" "}
          {positions.length} positions &bull; {artists.length} artists
        </p>
      </header>

      {/* Stage plot — constrained width */}
      <section className="max-w-6xl mx-auto w-full px-6">
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Stage Plot</h2>
        <div
          className="border border-border rounded-lg overflow-hidden bg-[#111] w-full"
          style={{ aspectRatio: stageAspect }}
        >
          <StageSVG
            mode="view"
            externalPositions={positions}
            externalArtists={artists}
            stageWidth={event.stageWidth}
            stageDepth={event.stageDepth}
            fohPosition={fohPos}
            annotateGear
          />
        </div>
      </section>

      {/* Running order — constrained width */}
      <section className="max-w-6xl mx-auto w-full px-6">
        <RunningOrderGrid artists={sorted} positions={positions} />
      </section>

      {/* FOH artist cards — constrained width */}
      <section className="max-w-6xl mx-auto w-full px-6">
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

      {/* Master input list — constrained width */}
      <section className="max-w-6xl mx-auto w-full px-6">
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
