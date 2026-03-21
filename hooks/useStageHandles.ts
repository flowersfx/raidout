"use client";

import { useRef, useCallback } from "react";
import { useEventStore } from "@/store/eventStore";
import type { Position } from "@/types/models";

export type ResizeCorner = "nw" | "ne" | "se" | "sw";

interface ResizeState {
  posId: string;
  corner: ResizeCorner;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  rotation: number;
}

interface RotateState {
  posId: string;
  cx: number;
  cy: number;
  startAngle: number; // radians from center at drag start
  startRotation: number; // degrees
}

const MIN_SIZE = 40; // minimum position dimension in stage units (cm)

export function useStageHandles(svgRef: React.RefObject<SVGSVGElement | null>) {
  const resizeRef = useRef<ResizeState | null>(null);
  const rotateRef = useRef<RotateState | null>(null);
  const { patchPosition } = useEventStore();

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return {
      x: (clientX - ctm.e) / ctm.a,
      y: (clientY - ctm.f) / ctm.d,
    };
  }, [svgRef]);

  const screenToSVGDelta = useCallback((dxScreen: number, dyScreen: number) => {
    const svg = svgRef.current;
    if (!svg) return { dx: dxScreen, dy: dyScreen };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { dx: dxScreen, dy: dyScreen };
    return { dx: dxScreen / ctm.a, dy: dyScreen / ctm.d };
  }, [svgRef]);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, pos: Position, corner: ResizeCorner) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
        posId: pos.id,
        corner,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: pos.x,
        startY: pos.y,
        startW: pos.width,
        startH: pos.height,
        rotation: pos.rotation ?? 0,
      };
    },
    []
  );

  const onRotateMouseDown = useCallback(
    (e: React.MouseEvent, pos: Position) => {
      e.preventDefault();
      e.stopPropagation();
      const cx = pos.x + pos.width / 2;
      const cy = pos.y + pos.height / 2;
      const svgPt = getSVGPoint(e.clientX, e.clientY);
      rotateRef.current = {
        posId: pos.id,
        cx,
        cy,
        startAngle: Math.atan2(svgPt.y - cy, svgPt.x - cx),
        startRotation: pos.rotation ?? 0,
      };
    },
    [getSVGPoint]
  );

  const onHandleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (resizeRef.current) {
        const r = resizeRef.current;
        const { dx: dxSVG, dy: dySVG } = screenToSVGDelta(
          e.clientX - r.startMouseX,
          e.clientY - r.startMouseY
        );

        // Project screen-space delta into the element's local (pre-rotation) coordinate frame
        const rad = -(r.rotation * Math.PI) / 180;
        const localDx = dxSVG * Math.cos(rad) - dySVG * Math.sin(rad);
        const localDy = dxSVG * Math.sin(rad) + dySVG * Math.cos(rad);

        const { snapEnabled, snapSize } = useEventStore.getState();
        const snap = (v: number) =>
          snapEnabled && snapSize > 0 ? Math.round(v / snapSize) * snapSize : Math.round(v);

        let { startX: x, startY: y, startW: w, startH: h } = r;

        if (r.corner === "se") {
          w = Math.max(MIN_SIZE, snap(r.startW + localDx));
          h = Math.max(MIN_SIZE, snap(r.startH + localDy));
        } else if (r.corner === "sw") {
          const newW = Math.max(MIN_SIZE, snap(r.startW - localDx));
          x = r.startX + r.startW - newW;
          w = newW;
          h = Math.max(MIN_SIZE, snap(r.startH + localDy));
        } else if (r.corner === "ne") {
          w = Math.max(MIN_SIZE, snap(r.startW + localDx));
          const newH = Math.max(MIN_SIZE, snap(r.startH - localDy));
          y = r.startY + r.startH - newH;
          h = newH;
        } else if (r.corner === "nw") {
          const newW = Math.max(MIN_SIZE, snap(r.startW - localDx));
          x = r.startX + r.startW - newW;
          w = newW;
          const newH = Math.max(MIN_SIZE, snap(r.startH - localDy));
          y = r.startY + r.startH - newH;
          h = newH;
        }

        patchPosition(r.posId, {
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: w,
          height: h,
        });
        return;
      }

      if (rotateRef.current) {
        const r = rotateRef.current;
        const svgPt = getSVGPoint(e.clientX, e.clientY);
        const currentAngle = Math.atan2(svgPt.y - r.cy, svgPt.x - r.cx);
        const deltaRad = currentAngle - r.startAngle;
        let newRotation = r.startRotation + (deltaRad * 180) / Math.PI;

        const { snapEnabled } = useEventStore.getState();
        if (snapEnabled) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        patchPosition(r.posId, { rotation: newRotation });
      }
    },
    [screenToSVGDelta, getSVGPoint, patchPosition]
  );

  const onHandleMouseUp = useCallback(() => {
    resizeRef.current = null;
    rotateRef.current = null;
  }, []);

  return {
    onResizeMouseDown,
    onRotateMouseDown,
    onHandleMouseMove,
    onHandleMouseUp,
    resizeRef,
    rotateRef,
  };
}
