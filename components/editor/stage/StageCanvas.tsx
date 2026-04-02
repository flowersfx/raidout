"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { useCanvasTransform } from "@/hooks/useCanvasTransform";
import { StageSVG } from "./StageSVG";
import type { ComponentPropsWithoutRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FOH_LABEL_HEIGHT = 24; // must match StageSVG

// Zoom presets shown in the dropdown (as percentages)
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300];

// ─── Icons ────────────────────────────────────────────────────────────────────

function FitIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* four corner arrows pointing inward */}
      <path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1v-4" />
    </svg>
  );
}

// ─── Zoom controls sub-component (exported so callers can embed elsewhere) ────

interface ZoomControlsProps {
  scale: number;
  onZoomIn(): void;   // +1%
  onZoomOut(): void;  // -1%
  onFit(): void;
  onSetScale(s: number): void;
  className?: string;
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  onSetScale,
  className,
}: ZoomControlsProps) {
  const pct = Math.round(scale * 100);
  const showCustom = !ZOOM_PRESETS.includes(pct);

  const btnCls =
    "flex items-center justify-center w-6 h-6 rounded text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer select-none";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <button onClick={onZoomOut} title="Zoom out (Ctrl −)" className={btnCls}>
        <svg viewBox="0 0 10 2" width="10" height="10" fill="currentColor" aria-hidden="true">
          <rect x="0" y="0.5" width="10" height="1.5" rx="0.75" />
        </svg>
      </button>

      {/* Percentage dropdown */}
      <div className="relative">
        <select
          value={pct}
          onChange={(e) => onSetScale(Number(e.target.value) / 100)}
          title="Zoom level"
          className={cn(
            "appearance-none bg-transparent border border-border rounded",
            "px-1.5 py-0.5 text-xs text-text cursor-pointer hover:bg-raised transition-colors",
            "text-center min-w-[4.5rem]"
          )}
        >
          {showCustom && (
            <option value={pct} disabled>
              {pct}%
            </option>
          )}
          {ZOOM_PRESETS.map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
        {/* Custom chevron so it lines up with app style */}
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-dim"
          aria-hidden="true"
        >
          <svg viewBox="0 0 8 5" width="8" height="5" fill="currentColor">
            <path d="M0 0l4 5 4-5H0z" />
          </svg>
        </span>
      </div>

      <button onClick={onZoomIn} title="Zoom in (Ctrl +)" className={btnCls}>
        <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" aria-hidden="true">
          <rect x="0" y="4.25" width="10" height="1.5" rx="0.75" />
          <rect x="4.25" y="0" width="1.5" height="10" rx="0.75" />
        </svg>
      </button>

      <button onClick={onFit} title="Fit to view" className={btnCls}>
        <FitIcon />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type SVGProps = ComponentPropsWithoutRef<typeof StageSVG>;

interface StageCanvasProps extends SVGProps {
  /** Used to persist zoom/pan state in the store across tab switches */
  stageId: string;
  /**
   * Key used for the store entry. Defaults to `stageId`.
   * Pass a different value (e.g. `${stageId}-setup`) when the same stage is
   * shown in multiple surfaces that should keep independent zoom levels.
   */
  transformKey?: string;
  /** CSS class for the canvas container div (default: "flex-1 min-h-0") */
  containerClassName?: string;
  /** Inline style for the canvas container div (e.g. { aspectRatio } for ShareView) */
  containerStyle?: React.CSSProperties;
  /** Whether to render the toolbar strip. Default true. Always false when printMode. */
  showToolbar?: boolean;
  /** Extra content rendered on the leading (left) side of the toolbar */
  toolbarLeading?: React.ReactNode;
}

export function StageCanvas({
  stageId,
  transformKey,
  containerClassName,
  containerStyle,
  showToolbar = true,
  toolbarLeading,
  // StageSVG props we need to inspect for naturalWidth/Height
  stageWidth: extWidth,
  stageDepth: extDepth,
  fohPosition: extFohPosition,
  printMode,
  // Everything else forwarded to StageSVG
  ...svgProps
}: StageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const stageWidth = extWidth ?? 800;
  const stageDepth = extDepth ?? 400;
  const fohPosition = extFohPosition ?? "bottom";

  // Compute natural SVG dimensions — same formula as StageSVG's totalWidth/totalHeight
  const fohHidden = fohPosition === "none";
  const naturalWidth =
    !fohHidden && (fohPosition === "left" || fohPosition === "right")
      ? stageWidth + FOH_LABEL_HEIGHT
      : stageWidth;
  const naturalHeight =
    !fohHidden && (fohPosition === "top" || fohPosition === "bottom")
      ? stageDepth + FOH_LABEL_HEIGHT
      : stageDepth;

  const {
    transformStyle,
    scale,
    isSpaceHeld,
    isPanning,
    startPan,
    zoomInStep,
    zoomOutStep,
    fit,
    setScale,
  } = useCanvasTransform(containerRef, {
    naturalWidth,
    naturalHeight,
    stageId: transformKey ?? stageId,
    disabled: printMode,
  });

  const renderToolbar = showToolbar && !printMode;

  return (
    <>
      {/* Canvas container */}
      <div
        ref={containerRef}
        className={cn("relative overflow-hidden", containerClassName ?? "flex-1 min-h-0")}
        style={containerStyle}
      >
        {printMode ? (
          // In print mode: SVG fills the container normally (no transform)
          <StageSVG
            stageWidth={stageWidth}
            stageDepth={stageDepth}
            fohPosition={fohPosition}
            printMode={printMode}
            {...svgProps}
          />
        ) : (
          <>
            {/* CSS-transform wrapper — drives zoom and pan */}
            <div style={transformStyle}>
              <StageSVG
                stageWidth={stageWidth}
                stageDepth={stageDepth}
                fohPosition={fohPosition}
                printMode={printMode}
                overrideWidth={naturalWidth}
                overrideHeight={naturalHeight}
                {...svgProps}
              />
            </div>

            {/* Transparent overlay captures mouse when space is held or mid-mouse panning */}
            {(isSpaceHeld || isPanning) && (
              <div
                className="absolute inset-0"
                style={{
                  cursor: isPanning ? "grabbing" : "grab",
                  zIndex: 10,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  startPan(e.clientX, e.clientY);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Toolbar strip — fragment sibling so parent flex-col can absorb it */}
      {renderToolbar && (
        <div className="no-print flex-shrink-0 flex items-center gap-3 pt-1 border-t border-border text-xs text-muted">
          {toolbarLeading}
          <div className="ml-auto">
            <ZoomControls
              scale={scale}
              onZoomIn={zoomInStep}
              onZoomOut={zoomOutStep}
              onFit={fit}
              onSetScale={setScale}
            />
          </div>
        </div>
      )}
    </>
  );
}
