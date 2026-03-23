"use client";

import { StageSVG } from "@/components/editor/stage/StageSVG";
import { useEventStore } from "@/store/eventStore";

export function StagePlotTab() {
  const { event } = useEventStore();

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-text">{event?.stageName ?? "Stage"} Plot</h2>
          {event && (
            <p className="text-xs text-muted mt-0.5">
              {event.stageWidth} × {event.stageDepth} cm
            </p>
          )}
        </div>
        <p className="text-xs text-dim">Read-only — edit positions in Setup tab</p>
      </div>

      <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-[#111]">
        <StageSVG mode="view" annotateGear />
      </div>
    </div>
  );
}
