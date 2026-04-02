"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { getEvent } from "@/lib/actions/events";

const POLL_INTERVAL_MS = 60_000;

export function useEventPoll() {
  const { event, dirty, setEvent, setStages, setPositions, setArtists } = useEventStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!event) return;

    function schedule() {
      timerRef.current = setTimeout(async () => {
        // Only poll when document is visible and store is not dirty
        if (document.visibilityState !== "visible" || useEventStore.getState().dirty) {
          schedule();
          return;
        }

        const fresh = await getEvent(event!.id);
        if (fresh && fresh.updatedAt > event!.updatedAt) {
          setEvent(fresh as Parameters<typeof setEvent>[0]);
          setStages(fresh.stages as Parameters<typeof setStages>[0]);
          setPositions(fresh.positions as Parameters<typeof setPositions>[0]);
          setArtists(fresh.artists as Parameters<typeof setArtists>[0]);
        }

        schedule();
      }, POLL_INTERVAL_MS);
    }

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
