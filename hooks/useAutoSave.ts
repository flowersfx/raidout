"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { saveEventSnapshot } from "@/lib/actions/events";

const DEBOUNCE_MS = 800;

export function useAutoSave() {
  const { event, stages, positions, artists, dirty, clearDirty, setSaving, setSaveError } =
    useEventStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty || !event) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        await saveEventSnapshot({ event, stages, positions, artists });
        clearDirty();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dirty, event, stages, positions, artists, clearDirty, setSaving, setSaveError]);
}
