"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { saveEventSnapshot, getEvent } from "@/lib/actions/events";

const DEBOUNCE_MS = 800;

export function useAutoSave() {
  const { event, stages, positions, artists, version, dirty, clearDirty, setSaving, setSaveError, setVersion, setEvent, setStages, setPositions, setArtists } =
    useEventStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty || !event) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        const { version: newVersion } = await saveEventSnapshot({ event, stages, positions, artists, clientVersion: version });
        setVersion(newVersion);
        clearDirty();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        if (msg === "STALE_DATA") {
          setSaveError("conflict");
          const fresh = await getEvent(event.id);
          if (fresh) {
            setEvent(fresh as Parameters<typeof setEvent>[0]);
            setStages(fresh.stages as Parameters<typeof setStages>[0]);
            setPositions(fresh.positions as Parameters<typeof setPositions>[0]);
            setArtists(fresh.artists as Parameters<typeof setArtists>[0]);
          }
        } else {
          setSaveError(msg);
        }
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dirty, event, stages, positions, artists, version, clearDirty, setSaving, setSaveError, setVersion, setEvent, setStages, setPositions, setArtists]);
}
