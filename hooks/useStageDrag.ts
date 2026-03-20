"use client";

import { useRef, useCallback } from "react";
import { useEventStore } from "@/store/eventStore";
import type { Position } from "@/types/models";

interface DragState {
  positionId: string;
  startMouseX: number;
  startMouseY: number;
  startPosX: number;
  startPosY: number;
}

export function useStageDrag(svgRef: React.RefObject<SVGSVGElement | null>) {
  const dragRef = useRef<DragState | null>(null);
  const { patchPosition, event } = useEventStore();

  const stageWidth = event?.stageWidth ?? 800;
  const stageDepth = event?.stageDepth ?? 400;

  const getSVGScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return { scaleX: 1, scaleY: 1 };
    const rect = svg.getBoundingClientRect();
    return {
      scaleX: stageWidth / rect.width,
      scaleY: stageDepth / rect.height,
    };
  }, [svgRef, stageWidth, stageDepth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, position: Position) => {
      e.preventDefault();
      dragRef.current = {
        positionId: position.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };
    },
    []
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { positionId, startMouseX, startMouseY, startPosX, startPosY } =
        dragRef.current;
      const { scaleX, scaleY } = getSVGScale();

      const dx = (e.clientX - startMouseX) * scaleX;
      const dy = (e.clientY - startMouseY) * scaleY;

      const newX = Math.max(0, Math.round(startPosX + dx));
      const newY = Math.max(0, Math.round(startPosY + dy));

      patchPosition(positionId, { x: newX, y: newY });
    },
    [getSVGScale, patchPosition]
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { onMouseDown, onMouseMove, onMouseUp };
}
