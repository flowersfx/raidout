"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useEventStore } from "@/store/eventStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { SetupTab } from "./tabs/SetupTab";
import { ArtistsTab } from "./tabs/ArtistsTab";
import { StagePlotTab } from "./tabs/StagePlotTab";
import { FOHTab } from "./tabs/FOHTab";
import { RunningOrderTab } from "./tabs/RunningOrderTab";
import { cn } from "@/lib/utils/cn";
import type { Event, Position, Artist } from "@/types/models";

interface Props {
  initial: {
    event: Event;
    positions: Position[];
    artists: Artist[];
  };
}

const TABS = [
  { id: "setup" as const, label: "Setup" },
  { id: "artists" as const, label: "Artists" },
  { id: "plot" as const, label: "Stage Plot" },
  { id: "foh" as const, label: "FOH Summary" },
  { id: "order" as const, label: "Running Order" },
];

export function EventEditor({ initial }: Props) {
  const { setEvent, setPositions, setArtists, activeTab, setActiveTab, event } =
    useEventStore();

  // Hydrate store from server data on mount
  useEffect(() => {
    setEvent(initial.event);
    setPositions(initial.positions);
    setArtists(initial.artists);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire up auto-save
  useAutoSave();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <Link href="/" className="text-xs text-muted hover:text-text transition-colors no-print">
          ← Events
        </Link>
        <span className="text-text font-semibold text-sm truncate flex-1">
          {event?.name ?? initial.event.name}
        </span>
        <div className="flex items-center gap-3">
          <AutoSaveIndicator />
          <Link
            href={`/event/${initial.event.id}/share`}
            target="_blank"
            className="text-xs text-accent hover:text-accent-dim transition-colors"
          >
            Share →
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-border bg-surface flex-shrink-0 px-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "setup" && <SetupTab />}
        {activeTab === "artists" && <ArtistsTab />}
        {activeTab === "plot" && <StagePlotTab />}
        {activeTab === "foh" && <FOHTab />}
        {activeTab === "order" && <RunningOrderTab />}
      </div>
    </div>
  );
}
