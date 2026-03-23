"use client";

import { useRef, useCallback } from "react";
import { useEventStore } from "@/store/eventStore";
import type { Position } from "@/types/models";

interface DragState {
  startMouseX: number;
  startMouseY: number;
  // Snapshot of all dragged positions at drag start
  positionStarts: { id: string; x: number; y: number }[];
}

export function useStageDrag(svgRef: React.RefObject<SVGSVGElement | null>) {
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const { patchPosition } = useEventStore();

  /** Convert a screen-pixel delta to SVG-unit delta using the SVG's CTM */
  const screenToSVGDelta = useCallback((dxScreen: number, dyScreen: number) => {
    const svg = svgRef.current;
    if (!svg) return { dx: dxScreen, dy: dyScreen };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { dx: dxScreen, dy: dyScreen };
    // CTM maps SVG coords → screen coords. Inverse maps screen → SVG.
    return { dx: dxScreen / ctm.a, dy: dyScreen / ctm.d };
  }, [svgRef]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, position: Position) => {
      e.preventDefault();
      e.stopPropagation();

      // Determine which positions to drag: all selected if clicked pos is in selection,
      // otherwise just the clicked position
      const selected = useEventStore.getState().selectedPositionIds;
      const allPositions = useEventStore.getState().positions;
      const dragging = selected.has(position.id)
        ? allPositions.filter((p) => selected.has(p.id))
        : [position];

      didDragRef.current = false;
      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        positionStarts: dragging.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      };
    },
    []
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startMouseX, startMouseY, positionStarts } = dragRef.current;
      const { dx, dy } = screenToSVGDelta(e.clientX - startMouseX, e.clientY - startMouseY);

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        didDragRef.current = true;
      }

      const { snapEnabled, snapSize } = useEventStore.getState();
      const snap = (v: number) => snapEnabled && snapSize > 0
        ? Math.round(v / snapSize) * snapSize
        : Math.round(v);

      for (const ps of positionStarts) {
        const newX = Math.max(0, snap(ps.x + dx));
        const newY = Math.max(0, snap(ps.y + dy));
        patchPosition(ps.id, { x: newX, y: newY });
      }
    },
    [screenToSVGDelta, patchPosition]
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { onMouseDown, onMouseMove, onMouseUp, didDragRef };
}
