"use client";

import { useRef, useEffect } from "react";
import { useEventStore } from "@/store/eventStore";
import { useStageDrag } from "@/hooks/useStageDrag";
import type { Position, Artist } from "@/types/models";

interface Props {
  mode: "edit" | "view";
  // For share/PDF — pass data directly instead of reading from store
  externalPositions?: Position[];
  externalArtists?: Artist[];
  stageWidth?: number;
  stageDepth?: number;
  annotateGear?: boolean; // show first gear line near each position
}

const GRID_STEP = 80; // grid lines every 80 stage units
const FOH_LABEL_HEIGHT = 24;

export function StageSVG({
  mode,
  externalPositions,
  externalArtists,
  stageWidth: extWidth,
  stageDepth: extDepth,
  annotateGear = false,
}: Props) {
  const store = useEventStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const { onMouseDown, onMouseMove, onMouseUp } = useStageDrag(svgRef);

  const positions = externalPositions ?? store.positions;
  const artists = externalArtists ?? store.artists;
  const stageWidth = extWidth ?? store.event?.stageWidth ?? 800;
  const stageDepth = extDepth ?? store.event?.stageDepth ?? 400;

  // Global mouse events for drag
  useEffect(() => {
    if (mode !== "edit") return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [mode, onMouseMove, onMouseUp]);

  const totalHeight = stageDepth + FOH_LABEL_HEIGHT;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${stageWidth} ${totalHeight}`}
      className="w-full h-full"
      style={{ fontFamily: "var(--font-mono, monospace)" }}
    >
      {/* Stage background */}
      <rect x={0} y={0} width={stageWidth} height={stageDepth} fill="#111" stroke="#2a2a2a" strokeWidth={1} />

      {/* Grid lines */}
      {Array.from({ length: Math.floor(stageWidth / GRID_STEP) - 1 }, (_, i) => (
        <line
          key={`vg-${i}`}
          x1={(i + 1) * GRID_STEP}
          y1={0}
          x2={(i + 1) * GRID_STEP}
          y2={stageDepth}
          stroke="#1e1e1e"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: Math.floor(stageDepth / GRID_STEP) - 1 }, (_, i) => (
        <line
          key={`hg-${i}`}
          x1={0}
          y1={(i + 1) * GRID_STEP}
          x2={stageWidth}
          y2={(i + 1) * GRID_STEP}
          stroke="#1e1e1e"
          strokeWidth={1}
        />
      ))}

      {/* Positions */}
      {positions.map((pos) => {
        const assignedArtists = artists.filter((a) => a.positionId === pos.id);
        const firstGearLine = assignedArtists[0]?.gearBrings?.split("\n")[0] ?? "";

        return (
          <g key={pos.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={pos.width}
              height={pos.height}
              fill={pos.color + "22"}
              stroke={pos.color}
              strokeWidth={1.5}
              rx={3}
              style={mode === "edit" ? { cursor: "grab" } : undefined}
              onMouseDown={mode === "edit" ? (e) => onMouseDown(e, pos) : undefined}
            />
            {/* Position name */}
            <text
              x={pos.x + pos.width / 2}
              y={pos.y + 14}
              textAnchor="middle"
              fontSize={10}
              fontWeight="600"
              fill={pos.color}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {pos.name}
            </text>
            {/* Artist names stacked inside */}
            {assignedArtists.map((a, i) => (
              <text
                key={a.id}
                x={pos.x + pos.width / 2}
                y={pos.y + 28 + i * 13}
                textAnchor="middle"
                fontSize={8.5}
                fill="#ccc"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {a.name}
              </text>
            ))}
            {/* Gear annotation (plot view only) */}
            {annotateGear && firstGearLine && (
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + pos.height + 12}
                textAnchor="middle"
                fontSize={7.5}
                fill="#888"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {firstGearLine.length > 28 ? firstGearLine.slice(0, 27) + "…" : firstGearLine}
              </text>
            )}
          </g>
        );
      })}

      {/* FOH label */}
      <rect
        x={0}
        y={stageDepth}
        width={stageWidth}
        height={FOH_LABEL_HEIGHT}
        fill="#0a0a0a"
      />
      <text
        x={stageWidth / 2}
        y={stageDepth + 16}
        textAnchor="middle"
        fontSize={9}
        fontWeight="600"
        fill="#555"
        letterSpacing={3}
        style={{ userSelect: "none" }}
      >
        FRONT OF HOUSE
      </text>
    </svg>
  );
}
