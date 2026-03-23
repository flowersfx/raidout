"use client";

import { StageSVG } from "@/components/editor/stage/StageSVG";
import { useEventStore } from "@/store/eventStore";

export function StagePlotTab() {
  const { stages, activeStageId, setActiveStageId } = useEventStore();

  const activeStage = stages.find((s) => s.id === activeStageId) ?? stages[0];

  if (!activeStage) return null;

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-text">{activeStage.name} Plot</h2>
          <p className="text-xs text-muted mt-0.5">
            {activeStage.stageWidth} × {activeStage.stageDepth} cm
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stages.length > 1 && (
            <div className="flex gap-1">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStageId(s.id)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    s.id === activeStage.id
                      ? "bg-accent/15 border-accent text-accent"
                      : "border-border text-muted hover:text-text"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-dim">Read-only — edit positions in Setup tab</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-[#111]">
        <StageSVG
          mode="view"
          annotateGear
          stageWidth={activeStage.stageWidth}
          stageDepth={activeStage.stageDepth}
          fohPosition={activeStage.fohPosition}
          filterStageId={activeStage.id}
        />
      </div>
    </div>
  );
}
