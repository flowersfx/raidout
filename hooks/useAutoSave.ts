"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { saveEventSnapshot, getSerializedEvent } from "@/lib/actions/events";

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
          const fresh = await getSerializedEvent(event.id);
          if (fresh) {
            setEvent(fresh.event);
            setStages(fresh.stages);
            setPositions(fresh.positions);
            setArtists(fresh.artists);
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
