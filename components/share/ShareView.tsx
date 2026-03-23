import { StageSVG } from "@/components/editor/stage/StageSVG";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { RunningOrderGrid } from "@/components/editor/running-order/RunningOrderGrid";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots, type Event, type Stage, type Position, type Artist } from "@/types/models";

// FOH_LABEL_HEIGHT must match StageSVG constant
const FOH_LABEL_HEIGHT = 24;

interface Props {
  event: Event;
  stages: Stage[];
  positions: Position[];
  artists: Artist[];
  printMode?: boolean;
}

function stageAspectRatio(stage: Stage): number {
  const fohHidden = stage.fohPosition === "none";
  const isVertical = stage.fohPosition === "left" || stage.fohPosition === "right";
  if (fohHidden) return stage.stageWidth / stage.stageDepth;
  if (isVertical) return (stage.stageWidth + FOH_LABEL_HEIGHT) / stage.stageDepth;
  return stage.stageWidth / (stage.stageDepth + FOH_LABEL_HEIGHT);
}

export function ShareView({ event, stages, positions, artists, printMode = false }: Props) {
  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="py-8 flex flex-col gap-10">

      {/* Event header */}
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
          {stages.length} stage{stages.length > 1 ? "s" : ""} &bull;{" "}
          {positions.length} positions &bull; {artists.length} artists
        </p>
      </header>

      {/* One stage plot section per stage */}
      {stages.map((stage) => {
        const stagePositions = positions.filter((p) => p.stageId === stage.id);
        const aspectRatio = stageAspectRatio(stage);
        return (
          <section key={stage.id} className="max-w-6xl mx-auto w-full px-6">
            <h2 className="text-xs text-muted uppercase tracking-wider mb-3">{stage.name} Plot</h2>
            <div
              className={`border border-border rounded-lg overflow-hidden w-full ${printMode ? "bg-white" : "bg-[#111]"}`}
              style={{ aspectRatio }}
            >
              <StageSVG
                mode="view"
                externalPositions={stagePositions}
                externalArtists={artists}
                stageWidth={stage.stageWidth}
                stageDepth={stage.stageDepth}
                fohPosition={stage.fohPosition}
                annotateGear
                printMode={printMode}
              />
            </div>
          </section>
        );
      })}

      {/* Running order — spans all stages */}
      <section className="max-w-6xl mx-auto w-full px-6">
        <RunningOrderGrid artists={sorted} positions={positions} />
      </section>

      {/* FOH artist cards — spans all stages */}
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

      {/* Master input list — spans all stages */}
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
