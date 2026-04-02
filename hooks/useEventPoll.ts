"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/eventStore";
import { getSerializedEvent } from "@/lib/actions/events";

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

        const fresh = await getSerializedEvent(event!.id);
        if (fresh && fresh.event.updatedAt > event!.updatedAt) {
          setEvent(fresh.event);
          setStages(fresh.stages);
          setPositions(fresh.positions);
          setArtists(fresh.artists);
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
