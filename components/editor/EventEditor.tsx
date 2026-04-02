"use client";

import { useEffect, Fragment } from "react";
import Link from "next/link";
import { useEventStore } from "@/store/eventStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { SetupTab } from "./tabs/SetupTab";
import { ArtistsTab } from "./tabs/ArtistsTab";
import { StagePlotTab } from "./tabs/StagePlotTab";
import { FOHTab } from "./tabs/FOHTab";
import { RunningOrderTab } from "./tabs/RunningOrderTab";
import { markArtistsTabViewed } from "@/lib/actions/events";
import { cn } from "@/lib/utils/cn";
import type { Event, Stage, Position, Artist } from "@/types/models";

interface Props {
  initial: {
    event: Event;
    stages: Stage[];
    positions: Position[];
    artists: Artist[];
  };
}

const TABS = [
  { id: "setup"    as const, label: "Setup",         edit: true  },
  { id: "artists"  as const, label: "Artists",        edit: true  },
  { id: "plot"     as const, label: "Stage Plot",     edit: false },
  { id: "foh"      as const, label: "FOH Summary",    edit: false },
  { id: "order"    as const, label: "Running Order",  edit: false },
];

export function EventEditor({ initial }: Props) {
  const { setEvent, setStages, setPositions, setArtists, activeTab, setActiveTab, event, artists, patchEvent, removeSelectedPositions } =
    useEventStore();

  const hasUnreadArtistIntake = artists.some(
    (a) =>
      a.intakeUpdatedAt !== null &&
      (!event?.artistsLastReviewedAt ||
        new Date(a.intakeUpdatedAt) > new Date(event.artistsLastReviewedAt))
  );

  function handleTabClick(tabId: typeof TABS[number]["id"]) {
    setActiveTab(tabId);
    if (tabId === "artists" && event && hasUnreadArtistIntake) {
      patchEvent({ artistsLastReviewedAt: new Date().toISOString() });
      markArtistsTabViewed(event.id);
    }
  }

  // Hydrate store from server data on mount
  useEffect(() => {
    setEvent(initial.event);
    setStages(initial.stages);
    setPositions(initial.positions);
    setArtists(initial.artists);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire up auto-save
  useAutoSave();

  // Delete key removes selected positions (guard: ignore when focus is in an input)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      removeSelectedPositions();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [removeSelectedPositions]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <Link href="/" className="text-xs text-muted hover:text-text transition-colors no-print">
          <svg viewBox="0 0 6 10" width="6" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 1l-4 4 4 4" /></svg> Events
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
            Share <svg viewBox="0 0 6 10" width="6" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4-4 4" /></svg>
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex items-stretch border-b border-border bg-surface flex-shrink-0 px-4 overflow-x-auto">
        {TABS.map((tab, i) => (
          <Fragment key={tab.id}>
            {/* Divider between edit and view groups */}
            {i === 2 && (
              <div className="flex items-center px-3">
                <div className="w-px h-4 bg-border" />
              </div>
            )}
            <button
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                activeTab === tab.id
                  ? tab.edit
                    ? "border-accent text-accent"
                    : "border-text/40 text-text"
                  : "border-transparent text-muted hover:text-text"
              )}
            >
              {tab.id === "artists" && hasUnreadArtistIntake ? (
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                </span>
              ) : (
                tab.label
              )}
            </button>
          </Fragment>
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
