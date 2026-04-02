"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from "react";
import { useEventStore, type CanvasTransform } from "@/store/eventStore";

// ─── Zoom behaviour ────────────────────────────────────────────────────────────
// "ctrl"  → Ctrl/Cmd + wheel zooms, plain wheel pans  (Figma-style for mouse)
// "wheel" → plain wheel zooms, space/middle-mouse pans
const ZOOM_MODE: "ctrl" | "wheel" = "ctrl";

const ZOOM_STEP = 1.25;   // per discrete zoom action
const WHEEL_ZOOM_SENSITIVITY = 0.001;  // for smooth trackpad pinch
const MIN_SCALE = 0.05;
const MAX_SCALE = 20;

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCanvasTransform(
  containerRef: React.RefObject<HTMLDivElement | null>,
  opts: {
    naturalWidth: number;
    naturalHeight: number;
    stageId: string;
    disabled?: boolean;
  }
) {
  const { naturalWidth, naturalHeight, stageId, disabled } = opts;

  const { canvasTransforms, setCanvasTransform } = useEventStore();
  const stored: CanvasTransform | undefined = canvasTransforms[stageId];

  // Container pixel dimensions — kept in a ref to avoid stale captures in callbacks
  const containerSizeRef = useRef({ width: 0, height: 0 });

  // Compute the transform that fits the stage centred in the container
  const computeFit = useCallback((): CanvasTransform => {
    const { width, height } = containerSizeRef.current;
    if (width === 0 || height === 0) return { panX: 0, panY: 0, scale: 1 };
    const scale = Math.min(width / naturalWidth, height / naturalHeight) * 0.95;
    return {
      scale,
      panX: (width - naturalWidth * scale) / 2,
      panY: (height - naturalHeight * scale) / 2,
    };
  }, [naturalWidth, naturalHeight]);

  const initializedRef = useRef(false);

  // ── Sync container size + initialize on first mount (before paint) ──────────
  useLayoutEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth: width, clientHeight: height } = el;
    if (width > 0 && height > 0) {
      containerSizeRef.current = { width, height };
      if (!initializedRef.current && !useEventStore.getState().canvasTransforms[stageId]) {
        initializedRef.current = true;
        setCanvasTransform(stageId, computeFit());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally once on mount

  // ── ResizeObserver — keeps container size current and handles resize ─────────
  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      containerSizeRef.current = { width, height };
      if (!initializedRef.current && !useEventStore.getState().canvasTransforms[stageId]) {
        initializedRef.current = true;
        setCanvasTransform(stageId, computeFit());
      } else {
        initializedRef.current = true;
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [disabled, containerRef, stageId, computeFit, setCanvasTransform]);

  // ── Auto-refit when stage dimensions change ─────────────────────────────────
  const prevNaturalRef = useRef({ naturalWidth, naturalHeight });
  useEffect(() => {
    if (
      prevNaturalRef.current.naturalWidth !== naturalWidth ||
      prevNaturalRef.current.naturalHeight !== naturalHeight
    ) {
      prevNaturalRef.current = { naturalWidth, naturalHeight };
      if (!disabled) setCanvasTransform(stageId, computeFit());
    }
  }, [naturalWidth, naturalHeight, disabled, stageId, setCanvasTransform, computeFit]);

  // ── Core read ────────────────────────────────────────────────────────────────
  // Fallback while not yet initialized
  const transform: CanvasTransform = stored ?? { panX: 0, panY: 0, scale: 1 };

  // Always read fresh state inside callbacks to avoid stale closures
  const freshTransform = () =>
    useEventStore.getState().canvasTransforms[stageId] ?? { panX: 0, panY: 0, scale: 1 };

  // ── Zoom helpers ─────────────────────────────────────────────────────────────
  const zoomAt = useCallback(
    (newScale: number, mouseX: number, mouseY: number) => {
      const { panX, panY, scale } = freshTransform();
      newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);
      const svgX = (mouseX - panX) / scale;
      const svgY = (mouseY - panY) / scale;
      setCanvasTransform(stageId, {
        scale: newScale,
        panX: mouseX - svgX * newScale,
        panY: mouseY - svgY * newScale,
      });
    },
    // freshTransform is intentionally not a dep (always current via getState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageId, setCanvasTransform]
  );

  const zoomIn = useCallback(() => {
    const { scale } = freshTransform();
    const { width, height } = containerSizeRef.current;
    zoomAt(scale * ZOOM_STEP, width / 2, height / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  const zoomOut = useCallback(() => {
    const { scale } = freshTransform();
    const { width, height } = containerSizeRef.current;
    zoomAt(scale / ZOOM_STEP, width / 2, height / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  // ±1 percentage point, centred on container midpoint
  const zoomInStep = useCallback(() => {
    const { scale } = freshTransform();
    const { width, height } = containerSizeRef.current;
    zoomAt(Math.round(scale * 100) / 100 + 0.01, width / 2, height / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  const zoomOutStep = useCallback(() => {
    const { scale } = freshTransform();
    const { width, height } = containerSizeRef.current;
    zoomAt(Math.round(scale * 100) / 100 - 0.01, width / 2, height / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  const fit = useCallback(() => {
    setCanvasTransform(stageId, computeFit());
  }, [stageId, setCanvasTransform, computeFit]);

  const setScale = useCallback(
    (s: number) => {
      const { width, height } = containerSizeRef.current;
      zoomAt(s, width / 2, height / 2);
    },
    [zoomAt]
  );

  // ── Wheel zoom / pan ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      const rect = el!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const shouldZoom =
        ZOOM_MODE === "wheel" || e.ctrlKey || e.metaKey;

      e.preventDefault();

      if (shouldZoom) {
        // Smooth pinch (trackpad) delivers small fractional deltas; discrete scroll
        // delivers large integer deltas. Normalise both.
        const delta = e.deltaY;
        const factor = delta < 0
          ? 1 + Math.abs(delta) * WHEEL_ZOOM_SENSITIVITY
          : 1 / (1 + Math.abs(delta) * WHEEL_ZOOM_SENSITIVITY);
        const clamped = clamp(factor, 0.8, 1.25); // cap single-event jump
        const { scale } = freshTransform();
        zoomAt(scale * clamped, mouseX, mouseY);
      } else {
        // Pan
        const { panX, panY, scale } = freshTransform();
        setCanvasTransform(stageId, {
          scale,
          panX: panX - e.deltaX,
          panY: panY - e.deltaY,
        });
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, containerRef, stageId, zoomAt, setCanvasTransform]);

  // ── Pan state (space+drag and middle-mouse) ──────────────────────────────────
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { panX, panY } = freshTransform();
      panStateRef.current = {
        startX: clientX - rect.left,
        startY: clientY - rect.top,
        startPanX: panX,
        startPanY: panY,
      };
      setIsPanning(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerRef]
  );

  useEffect(() => {
    if (!isPanning) return;

    function onMove(e: MouseEvent) {
      if (!panStateRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const { scale } = freshTransform();
      setCanvasTransform(stageId, {
        scale,
        panX: panStateRef.current.startPanX + (mouseX - panStateRef.current.startX),
        panY: panStateRef.current.startPanY + (mouseY - panStateRef.current.startY),
      });
    }

    function onUp() {
      panStateRef.current = null;
      setIsPanning(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanning, containerRef, stageId, setCanvasTransform]);

  // Middle-mouse capture — intercept before SVG element handlers
  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 1) return;
      e.preventDefault();
      startPan(e.clientX, e.clientY);
    }

    el.addEventListener("mousedown", onMouseDown, { capture: true });
    return () => el.removeEventListener("mousedown", onMouseDown, { capture: true });
  }, [disabled, containerRef, startPan]);

  // ── Space key ────────────────────────────────────────────────────────────────
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  useEffect(() => {
    if (disabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || isInputFocused()) return;
      e.preventDefault();
      setIsSpaceHeld(true);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setIsSpaceHeld(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [disabled]);

  // ── Output ───────────────────────────────────────────────────────────────────
  const transformStyle: React.CSSProperties = {
    transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.scale})`,
    transformOrigin: "0 0",
    willChange: "transform",
  };

  return {
    transformStyle,
    scale: transform.scale,
    isSpaceHeld,
    isPanning,
    startPan,
    zoomIn,
    zoomOut,
    zoomInStep,
    zoomOutStep,
    fit,
    setScale,
  };
}
