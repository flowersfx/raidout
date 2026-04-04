"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { saveEventSnapshot, getSerializedEvent } from "@/lib/actions/events";

const DEBOUNCE_MS = 800;

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let savingInFlight = false;

    function scheduleOrReschedule() {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (savingInFlight) {
          // A save is already in flight — reschedule so changes aren't dropped
          scheduleOrReschedule();
          return;
        }

        const state = useEventStore.getState();
        if (!state.dirty || !state.event) return;

        // Snapshot what we're about to save so we can detect new changes after
        const savedEvent = state.event;
        const savedStages = state.stages;
        const savedPositions = state.positions;
        const savedArtists = state.artists;

        savingInFlight = true;
        state.setSaving(true);
        state.setSaveError(null);

        try {
          const { version: newVersion } = await saveEventSnapshot({
            event: savedEvent,
            stages: savedStages,
            positions: savedPositions,
            artists: savedArtists,
            clientVersion: state.version,
          });
          useEventStore.getState().setVersion(newVersion);

          // Only clear dirty if no new mutations arrived during the save.
          // If data changed, dirty stays true and the subscription will have
          // already scheduled another save via the timer.
          const current = useEventStore.getState();
          if (
            current.event === savedEvent &&
            current.stages === savedStages &&
            current.positions === savedPositions &&
            current.artists === savedArtists
          ) {
            current.clearDirty();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Save failed";
          const s = useEventStore.getState();
          if (msg === "STALE_DATA") {
            s.setSaveError("conflict");
            const fresh = await getSerializedEvent(savedEvent.id);
            if (fresh) {
              s.setEvent(fresh.event);
              s.setStages(fresh.stages);
              s.setPositions(fresh.positions);
              s.setArtists(fresh.artists);
            }
          } else {
            s.setSaveError(msg);
          }
        } finally {
          savingInFlight = false;
          useEventStore.getState().setSaving(false);
        }
      }, DEBOUNCE_MS);
    }

    // Subscribe to data changes only — dirty/saving/version changes do not fire
    // this callback, so clearDirty() can never accidentally cancel a pending timer
    const unsubscribe = useEventStore.subscribe((state, prev) => {
      if (
        state.event === prev.event &&
        state.stages === prev.stages &&
        state.positions === prev.positions &&
        state.artists === prev.artists
      ) return;

      if (!state.dirty || !state.event) return;

      scheduleOrReschedule();
    });

    // Handle the case where store is already dirty on mount (e.g. hydration race)
    const initial = useEventStore.getState();
    if (initial.dirty && initial.event) scheduleOrReschedule();

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // Runs once — subscription handles all subsequent triggers
}
