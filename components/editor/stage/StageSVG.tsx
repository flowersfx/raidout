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
const POS_NAME_SIZE = 10;
const POS_NAME_Y = 14; // offset from top of rect
const ARTIST_SIZE = 8.5;
const ARTIST_START_Y = 28; // first artist offset from top
const ARTIST_LINE_H = 13; // spacing between artist lines
const PADDING_BOTTOM = 2; // breathing room at bottom of rect

/** Estimate max chars that fit in a given width at a given font size */
function maxChars(width: number, fontSize: number): number {
  const avgCharWidth = fontSize * 0.6; // monospace approximation
  return Math.max(3, Math.floor((width - 20) / avgCharWidth)); // 20 = horizontal padding from borders
}

/** Truncate text to fit width */
function truncate(text: string, width: number, fontSize: number): string {
  const max = maxChars(width, fontSize);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Wrap text into multiple lines that fit within width */
function wrapText(text: string, width: number, fontSize: number): string[] {
  const max = maxChars(width, fontSize);
  if (text.length <= max) return [text];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= max) {
      lines.push(remaining);
      break;
    }
    // Try to break at a space
    let breakAt = remaining.lastIndexOf(" ", max);
    if (breakAt <= 0) breakAt = max; // no space found, hard break
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  return lines;
}

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
      <rect
        x={0} y={0} width={stageWidth} height={stageDepth}
        fill="#111" stroke="#2a2a2a" strokeWidth={1}
        onClick={mode === "edit" ? () => store.setSelectedPosition(null) : undefined}
      />

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

      {/* Clip path definitions */}
      <defs>
        {positions.map((pos) => {
          const isSelected = mode === "edit" && store.selectedPositionId === pos.id;
          const assignedArtists = artists.filter((a) => a.positionId === pos.id);
          const lastAllowedBaseline = pos.height - PADDING_BOTTOM;
          const maxVisible = Math.max(0, Math.floor((lastAllowedBaseline - ARTIST_START_Y) / ARTIST_LINE_H) + 1);
          const hasOverflow = assignedArtists.length > maxVisible;
          // When selected, compute total wrapped lines for expanded height
          const totalWrappedLines = isSelected && hasOverflow
            ? assignedArtists.reduce((sum, a) => sum + wrapText(a.name, pos.width, ARTIST_SIZE).length, 0)
            : assignedArtists.length;
          const expandedH = hasOverflow && isSelected
            ? ARTIST_START_Y + totalWrappedLines * ARTIST_LINE_H + PADDING_BOTTOM
            : pos.height;

          return (
            <clipPath key={`clip-${pos.id}`} id={`clip-${pos.id}`}>
              <rect x={pos.x} y={pos.y} width={pos.width} height={expandedH} rx={3} />
            </clipPath>
          );
        })}
      </defs>

      {positions.map((pos) => {
        const assignedArtists = artists.filter((a) => a.positionId === pos.id);
        const gearLines = assignedArtists
          .flatMap((a) => a.gearBrings ? a.gearBrings.split("\n").filter((l) => l.trim()) : []);
        const cx = pos.x + pos.width / 2;
        const cy = pos.y + pos.height / 2;
        const rotation = pos.rotation ?? 0;
        const isSelected = mode === "edit" && store.selectedPositionId === pos.id;

        // How many artist lines fit vertically?
        const lastAllowedBaseline = pos.height - PADDING_BOTTOM;
        const maxVisible = Math.max(0, Math.floor((lastAllowedBaseline - ARTIST_START_Y) / ARTIST_LINE_H) + 1);
        const hasOverflow = assignedArtists.length > maxVisible;

        // When selected + overflow: show all artists with word wrap, no "+N more"
        const showAll = isSelected && hasOverflow;

        // Pre-compute wrapped lines for selected mode
        const wrappedArtists = showAll
          ? assignedArtists.map((a) => ({ artist: a, lines: wrapText(a.name, pos.width, ARTIST_SIZE) }))
          : null;
        const totalWrappedLines = wrappedArtists
          ? wrappedArtists.reduce((sum, wa) => sum + wa.lines.length, 0)
          : 0;

        const showCount = showAll ? assignedArtists.length : (hasOverflow ? Math.max(0, maxVisible - 1) : assignedArtists.length);
        const hiddenCount = assignedArtists.length - showCount;

        // Expanded height for the background rect when showing overflow
        const expandedH = showAll
          ? ARTIST_START_Y + totalWrappedLines * ARTIST_LINE_H + PADDING_BOTTOM
          : pos.height;

        const handleClick = mode === "edit" ? () => {
          store.setSelectedPosition(pos.id);
        } : undefined;

        return (
          <g key={pos.id} transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}>
            {showAll ? (
              <>
                {/* Combined background fill for original + overflow area */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={expandedH}
                  fill={pos.color + "22"}
                  rx={3}
                  style={mode === "edit" ? { cursor: "grab" } : undefined}
                  onMouseDown={mode === "edit" ? (e) => onMouseDown(e, pos) : undefined}
                  onClick={handleClick}
                />
                {/* Top + sides border (no bottom) using a path */}
                <path
                  d={`M ${pos.x},${pos.y + pos.height} L ${pos.x},${pos.y + 3} Q ${pos.x},${pos.y} ${pos.x + 3},${pos.y} L ${pos.x + pos.width - 3},${pos.y} Q ${pos.x + pos.width},${pos.y} ${pos.x + pos.width},${pos.y + 3} L ${pos.x + pos.width},${pos.y + pos.height}`}
                  fill="none"
                  stroke={pos.color}
                  strokeWidth={2}
                  style={{ pointerEvents: "none" }}
                />
                {/* Dashed sides + bottom for the overflow extension */}
                <path
                  d={`M ${pos.x},${pos.y + pos.height} L ${pos.x},${pos.y + expandedH - 3} Q ${pos.x},${pos.y + expandedH} ${pos.x + 3},${pos.y + expandedH} L ${pos.x + pos.width - 3},${pos.y + expandedH} Q ${pos.x + pos.width},${pos.y + expandedH} ${pos.x + pos.width},${pos.y + expandedH - 3} L ${pos.x + pos.width},${pos.y + pos.height}`}
                  fill="none"
                  stroke={pos.color}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.5}
                  style={{ pointerEvents: "none" }}
                />
              </>
            ) : (
              /* Normal rect */
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                fill={pos.color + "22"}
                stroke={pos.color}
                strokeWidth={isSelected ? 2 : 1.5}
                opacity={isSelected ? 1 : 0.5}
                rx={3}
                style={mode === "edit" ? { cursor: "grab" } : undefined}
                onMouseDown={mode === "edit" ? (e) => onMouseDown(e, pos) : undefined}
                onClick={handleClick}
              />
            )}
            {/* Clipped text content */}
            <g clipPath={`url(#clip-${pos.id})`}>
              {/* Position name */}
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + POS_NAME_Y}
                textAnchor="middle"
                fontSize={POS_NAME_SIZE}
                fontWeight="600"
                fill={pos.color}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {truncate(pos.name, pos.width, POS_NAME_SIZE)}
              </text>
              {/* Artist names */}
              {wrappedArtists ? (
                // Selected mode: render wrapped lines
                (() => {
                  let lineIdx = 0;
                  return wrappedArtists.map((wa) =>
                    wa.lines.map((line, li) => {
                      const y = pos.y + ARTIST_START_Y + lineIdx * ARTIST_LINE_H;
                      lineIdx++;
                      return (
                        <text
                          key={`${wa.artist.id}-${li}`}
                          x={pos.x + pos.width / 2}
                          y={y}
                          textAnchor="middle"
                          fontSize={ARTIST_SIZE}
                          fill="#ccc"
                          style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                          {line}
                        </text>
                      );
                    })
                  );
                })()
              ) : (
                // Normal mode: truncated single lines
                <>
                  {assignedArtists.slice(0, showCount).map((a, i) => (
                    <text
                      key={a.id}
                      x={pos.x + pos.width / 2}
                      y={pos.y + ARTIST_START_Y + i * ARTIST_LINE_H}
                      textAnchor="middle"
                      fontSize={ARTIST_SIZE}
                      fill="#ccc"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {truncate(a.name, pos.width, ARTIST_SIZE)}
                    </text>
                  ))}
                  {/* Overflow indicator */}
                  {hiddenCount > 0 && (
                    <text
                      x={pos.x + pos.width / 2}
                      y={pos.y + ARTIST_START_Y + showCount * ARTIST_LINE_H}
                      textAnchor="middle"
                      fontSize={7.5}
                      fill={pos.color}
                      opacity={0.7}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      +{hiddenCount} more
                    </text>
                  )}
                </>
              )}
            </g>
            {/* Gear annotation (plot view only) */}
            {annotateGear && gearLines.length > 0 && (
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + pos.height + 12}
                textAnchor="middle"
                fontSize={7.5}
                fill="#888"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {gearLines.map((line, gi) => (
                  <tspan
                    key={gi}
                    x={pos.x + pos.width / 2}
                    dy={gi === 0 ? 0 : 10}
                  >
                    {truncate(line, pos.width * 1.5, 7.5)}
                  </tspan>
                ))}
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
