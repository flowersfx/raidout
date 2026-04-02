"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useEventStore } from "@/store/eventStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEventPoll } from "@/hooks/useEventPoll";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { SetupTab } from "./tabs/SetupTab";
import { ArtistsTab } from "./tabs/ArtistsTab";
import { StagePlotTab } from "./tabs/StagePlotTab";
import { ArtistProfilesTab } from "./tabs/ArtistProfilesTab";
import { RunningOrderTab } from "./tabs/RunningOrderTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { SignalRoutingTab } from "./tabs/SignalRoutingTab";
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
  { id: "setup"    as const, label: "Setup",            edit: true  },
  { id: "artists"  as const, label: "Artists",          edit: true  },
  { id: "plot"     as const, label: "Stage Plot",       edit: false },
  { id: "profiles" as const, label: "Artist Profiles",  edit: false },
  { id: "order"    as const, label: "Running Order",    edit: false },
  { id: "timeline" as const, label: "Timeline",         edit: false },
  { id: "routing"  as const, label: "Signal Routing",   edit: false },
];

export function EventEditor({ initial }: Props) {
  const { setEvent, setStages, setPositions, setArtists, activeTab, setActiveTab, event, artists, patchEvent, removeSelectedPositions } =
    useEventStore();

  const [focusArtistId, setFocusArtistId] = useState<string | undefined>();

  function handleArtistClick(artistId: string) {
    setFocusArtistId(artistId);
    setActiveTab("profiles");
    setTimeout(() => {
      document.getElementById(`artist-${artistId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

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

  // Wire up auto-save and background polling
  useAutoSave();
  useEventPoll();

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
        <Link href="/" className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors no-print">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6.5L7 1l6 5.5" /><path d="M3 5v7h3V8h2v4h3V5" /></svg> Events
        </Link>
        <span className="text-text font-semibold text-sm truncate flex-1">
          {event?.name ?? initial.event.name}
        </span>
        <div className="flex items-center gap-3">
          <AutoSaveIndicator />
          <Link
            href={`/event/${initial.event.id}/share`}
            target="_blank"
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-dim transition-colors"
          >
            Share <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 2H2v9h9V8M7 1h4v4M11 1 6 6" /></svg>
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
        {activeTab === "setup"    && <SetupTab />}
        {activeTab === "artists"  && <ArtistsTab />}
        {activeTab === "plot"     && <StagePlotTab />}
        {activeTab === "profiles" && <ArtistProfilesTab focusArtistId={focusArtistId} onSelectArtist={setFocusArtistId} />}
        {activeTab === "order"    && <RunningOrderTab onArtistClick={handleArtistClick} />}
        {activeTab === "timeline" && <TimelineTab onArtistClick={handleArtistClick} />}
        {activeTab === "routing"  && <SignalRoutingTab />}
      </div>
    </div>
  );
}
