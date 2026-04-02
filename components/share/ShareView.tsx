"use client";

import { useState, useEffect } from "react";
import { StageCanvas } from "@/components/editor/stage/StageCanvas";
import { FOHArtistCard } from "@/components/editor/foh/FOHArtistCard";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { RunningOrderGrid } from "@/components/editor/running-order/RunningOrderGrid";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots, type Event, type Stage, type Position, type Artist } from "@/types/models";
import { cn } from "@/lib/utils/cn";

// FOH_LABEL_HEIGHT must match StageSVG constant
const FOH_LABEL_HEIGHT = 24;

const SHARE_TABS = [
  { id: "profiles"  as const, label: "Artist Profiles" },
  { id: "timeline"  as const, label: "Timeline" },
  { id: "order"     as const, label: "Running Order" },
  { id: "routing"   as const, label: "Signal Routing" },
] as const;

type ShareTabId = typeof SHARE_TABS[number]["id"];

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
  const [activeTab, setActiveTab] = useState<ShareTabId>("profiles");
  const [focusArtistId, setFocusArtistId] = useState<string | undefined>();

  // When printMode is active, apply the print-mode CSS class to <html> (so all theme
  // tokens flip to light) and auto-trigger the browser print dialog.
  useEffect(() => {
    if (!printMode) return;
    document.documentElement.classList.add("print-mode");
    const t = setTimeout(() => window.print(), 400);
    return () => {
      document.documentElement.classList.remove("print-mode");
      clearTimeout(t);
    };
  }, [printMode]);

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  function handleArtistClick(artistId: string) {
    setFocusArtistId(artistId);
    setActiveTab("profiles");
    setTimeout(() => {
      document.getElementById(`artist-${artistId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  return (
    <div className="py-8 flex flex-col gap-10">

      {/* Event header - only visible in print/pdf */}
      <header className="max-w-6xl mx-auto w-full px-6 border-b border-border pb-6 print-only hidden">
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

      {/* Stage plots — always above tabs, scroll away naturally */}
      {stages.map((stage) => {
        const stagePositions = positions.filter((p) => p.stageId === stage.id);
        const aspectRatio = stageAspectRatio(stage);
        return (
          <section key={stage.id} className="max-w-6xl mx-auto w-full px-6">
            <h2 className="text-xs text-muted uppercase tracking-wider mb-3">{stage.name} Plot</h2>
            <StageCanvas
              stageId={stage.id}
              mode="view"
              externalPositions={stagePositions}
              externalArtists={artists}
              stageWidth={stage.stageWidth}
              stageDepth={stage.stageDepth}
              fohPosition={stage.fohPosition}
              annotateGear
              printMode={printMode}
              containerClassName={`border border-border rounded-lg overflow-hidden w-full ${printMode ? "bg-white" : "bg-[#111]"}`}
              containerStyle={{ aspectRatio }}
            />
          </section>
        );
      })}

      {/* Sticky tab bar — hidden in printMode */}
      {!printMode && (
        <div className="sticky top-0 z-10 bg-bg border-b border-border -mb-4">
          <div className="max-w-6xl mx-auto px-6 flex">
            {SHARE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-text/40 text-text"
                    : "border-transparent text-muted hover:text-text"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {(printMode || activeTab === "timeline") && (
        <section className="max-w-6xl mx-auto w-full px-6">
          {printMode && <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Timeline</h2>}
          <TimelineBar
            artists={sorted}
            positions={positions}
            printMode={printMode}
            onArtistClick={handleArtistClick}
          />
        </section>
      )}

      {/* Running Order */}
      {(printMode || activeTab === "order") && (
        <section className="max-w-6xl mx-auto w-full px-6">
          {printMode && <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Running Order</h2>}
          <RunningOrderGrid
            artists={sorted}
            positions={positions}
            printMode={printMode}
            onArtistClick={handleArtistClick}
            noTimeline
          />
        </section>
      )}

      {/* Artist Profiles */}
      {(printMode || activeTab === "profiles") && (
        <section className="max-w-6xl mx-auto w-full px-6">
          {printMode && <h2 className="text-xs text-muted uppercase tracking-wider mb-4">Artist Profiles</h2>}
          <div className="flex flex-col gap-4">
            {sorted.map((artist) => (
              <FOHArtistCard
                key={artist.id}
                artist={artist}
                position={positions.find((p) => p.id === artist.positionId)}
                printMode={printMode}
                focused={artist.id === focusArtistId}
                onSelect={setFocusArtistId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Signal Routing */}
      {(printMode || activeTab === "routing") && (
        <section className="max-w-6xl mx-auto w-full px-6">
          {printMode && <h2 className="text-xs text-muted uppercase tracking-wider mb-4">Signal Routing</h2>}
          <div className="bg-surface border border-border rounded-lg p-4">
            <MasterInputList artists={sorted} positions={positions} />
          </div>
        </section>
      )}

    </div>
  );
}
