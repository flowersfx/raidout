"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useEventStore } from "@/store/eventStore";
import { useStageDrag } from "@/hooks/useStageDrag";
import { useStageHandles } from "@/hooks/useStageHandles";
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

const GRID_STEP = 100; // grid lines every 100 cm
const FOH_LABEL_HEIGHT = 24;
const POS_NAME_SIZE = 10;
const POS_NAME_Y = 14; // offset from top of rect
const DIM_SIZE = 7;    // dimensions label font size
const DIM_ABOVE = 8;   // distance above the top edge of the rect
const ARTIST_SIZE = 8.5;
const ARTIST_START_Y = 30; // first artist offset from top (reduced now that dims are above)
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

interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
  const { onMouseDown: onDragMouseDown, onMouseMove: onDragMouseMove, onMouseUp: onDragMouseUp, didDragRef } = useStageDrag(svgRef);
  const { onResizeMouseDown, onRotateMouseDown, onHandleMouseMove, onHandleMouseUp, resizeRef, rotateRef } = useStageHandles(svgRef);

  const positions = externalPositions ?? store.positions;
  const artists = externalArtists ?? store.artists;
  const stageWidth = extWidth ?? store.event?.stageWidth ?? 800;
  const stageDepth = extDepth ?? store.event?.stageDepth ?? 400;

  // Selection rectangle state
  const [selRect, setSelRect] = useState<SelectionRect | null>(null);
  const selRectRef = useRef<SelectionRect | null>(null);
  const isMarqueeRef = useRef(false);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return {
      x: (clientX - ctm.e) / ctm.a,
      y: (clientY - ctm.f) / ctm.d,
    };
  }, []);

  // Handle background mousedown — start selection rectangle
  const onBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== "edit") return;
    // Only on the background, not on positions
    const pt = getSVGPoint(e.clientX, e.clientY);
    selRectRef.current = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    isMarqueeRef.current = false;
    setSelRect(null);
  }, [mode, getSVGPoint]);

  // Global mouse events for drag + selection rectangle
  useEffect(() => {
    if (mode !== "edit") return;

    function handleMouseMove(e: MouseEvent) {
      // Handle operations (resize / rotate) take priority
      if (resizeRef.current || rotateRef.current) {
        onHandleMouseMove(e);
        return;
      }
      // Selection rectangle
      if (selRectRef.current) {
        const pt = getSVGPoint(e.clientX, e.clientY);
        const dx = Math.abs(pt.x - selRectRef.current.x1);
        const dy = Math.abs(pt.y - selRectRef.current.y1);
        if (dx > 3 || dy > 3) {
          isMarqueeRef.current = true;
        }
        if (isMarqueeRef.current) {
          selRectRef.current = { ...selRectRef.current, x2: pt.x, y2: pt.y };
          setSelRect({ ...selRectRef.current });
        }
        return;
      }
      onDragMouseMove(e);
    }

    function handleMouseUp(e: MouseEvent) {
      if (resizeRef.current || rotateRef.current) {
        onHandleMouseUp();
        return;
      }
      if (selRectRef.current) {
        if (isMarqueeRef.current) {
          // Compute which positions intersect the rectangle
          const r = selRectRef.current;
          const minX = Math.min(r.x1, r.x2);
          const maxX = Math.max(r.x1, r.x2);
          const minY = Math.min(r.y1, r.y2);
          const maxY = Math.max(r.y1, r.y2);

          const hit = positions.filter((pos) => {
            const cx = pos.x + pos.width / 2;
            const cy = pos.y + pos.height / 2;
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
          });

          if (hit.length > 0) {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              // Add to existing selection
              const next = new Set(store.selectedPositionIds);
              hit.forEach((p) => next.add(p.id));
              store.setSelectedPositionIds(next);
            } else {
              store.setSelectedPositionIds(new Set(hit.map((p) => p.id)));
            }
          } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            store.setSelectedPosition(null);
          }
        } else {
          // Click on background without drag — deselect
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            store.setSelectedPosition(null);
          }
        }
        selRectRef.current = null;
        isMarqueeRef.current = false;
        setSelRect(null);
        return;
      }
      onDragMouseUp();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mode, onDragMouseMove, onDragMouseUp, onHandleMouseMove, onHandleMouseUp, getSVGPoint, positions, store, resizeRef, rotateRef]);

  const totalHeight = stageDepth + FOH_LABEL_HEIGHT;

  // Selection rectangle display coords
  const selDisplay = selRect ? {
    x: Math.min(selRect.x1, selRect.x2),
    y: Math.min(selRect.y1, selRect.y2),
    width: Math.abs(selRect.x2 - selRect.x1),
    height: Math.abs(selRect.y2 - selRect.y1),
  } : null;

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
        onMouseDown={mode === "edit" ? onBgMouseDown : undefined}
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
          style={{ pointerEvents: "none" }}
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
          style={{ pointerEvents: "none" }}
        />
      ))}

      {/* Clip path definitions */}
      <defs>
        {positions.map((pos) => {
          const isSelected = mode === "edit" && store.selectedPositionIds.has(pos.id);
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
        const isSelected = mode === "edit" && store.selectedPositionIds.has(pos.id);

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

        // All selection logic lives in mousedown; click only fires for
        // plain clicks (no drag) on an already-selected position.
        const handleClick = mode === "edit" ? (e: React.MouseEvent) => {
          if (didDragRef.current) return;
          if (e.ctrlKey || e.metaKey || e.shiftKey) return; // already handled in mousedown
          // Plain click on an already-selected position when multi-selected → narrow to just this one
          if (store.selectedPositionIds.size > 1 && store.selectedPositionIds.has(pos.id)) {
            store.setSelectedPosition(pos.id);
          }
        } : undefined;

        const handleMouseDown = mode === "edit" ? (e: React.MouseEvent) => {
          const alreadySelected = store.selectedPositionIds.has(pos.id);
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            store.toggleSelectedPosition(pos.id);
          } else if (!alreadySelected) {
            store.setSelectedPosition(pos.id);
          }
          // Always start drag tracking (even if no movement occurs)
          onDragMouseDown(e, pos);
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
                  onMouseDown={handleMouseDown}
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
                onMouseDown={handleMouseDown}
                onClick={handleClick}
              />
            )}
            {/* Dimensions label above the rect */}
            {(pos.showSize ?? true) && (
              <text
                x={pos.x + pos.width / 2}
                y={pos.y - DIM_ABOVE}
                textAnchor="middle"
                fontSize={DIM_SIZE}
                fill={pos.color}
                opacity={0.5}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {pos.width}x{pos.height}cm
              </text>
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

      {/* Resize + rotate handles for a single selected position */}
      {mode === "edit" && store.selectedPositionIds.size === 1 && (() => {
        const pos = positions.find((p) => store.selectedPositionIds.has(p.id));
        if (!pos) return null;
        const cx = pos.x + pos.width / 2;
        const cy = pos.y + pos.height / 2;
        const rotation = pos.rotation ?? 0;
        const H = 7;  // handle square size in SVG units
        const R = 4;  // rotate circle radius
        const ROPE = 14; // distance of rotate handle above top edge

        return (
          <g key="handles" transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}>
            {/* Rotate connector line */}
            <line
              x1={cx} y1={pos.y - H / 2}
              x2={cx} y2={pos.y - ROPE}
              stroke={pos.color} strokeWidth={1} opacity={0.5}
              style={{ pointerEvents: "none" }}
            />
            {/* Rotate handle */}
            <circle
              cx={cx} cy={pos.y - ROPE}
              r={R}
              fill="#1a1a1a" stroke={pos.color} strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onMouseDown={(e) => onRotateMouseDown(e, pos)}
            />
            {/* Corner resize handles */}
            {(["nw", "ne", "se", "sw"] as const).map((corner) => {
              const hx = corner.includes("e") ? pos.x + pos.width - H / 2 : pos.x - H / 2;
              const hy = corner.includes("s") ? pos.y + pos.height - H / 2 : pos.y - H / 2;
              const cursor =
                corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
              return (
                <rect
                  key={corner}
                  x={hx} y={hy}
                  width={H} height={H}
                  rx={2}
                  fill="#1a1a1a" stroke={pos.color} strokeWidth={1.5}
                  style={{ cursor }}
                  onMouseDown={(e) => onResizeMouseDown(e, pos, corner)}
                />
              );
            })}
          </g>
        );
      })()}

      {/* Selection rectangle */}
      {selDisplay && selDisplay.width > 0 && selDisplay.height > 0 && (
        <rect
          x={selDisplay.x}
          y={selDisplay.y}
          width={selDisplay.width}
          height={selDisplay.height}
          fill="rgba(0, 229, 255, 0.08)"
          stroke="#00e5ff"
          strokeWidth={0.5}
          strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      )}

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
