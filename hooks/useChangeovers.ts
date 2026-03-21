"use client";

import { useMemo } from "react";
import { useEventStore } from "@/store/eventStore";
import { gapMinutes, changeoverStatus, sortableStartTime, type ChangeoverStatus } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";

export interface ChangeoverInfo {
  beforeArtistId: string;
  afterArtistId: string;
  gapMin: number;
  status: ChangeoverStatus;
  samePosition: boolean;
}

export function useChangeovers(): ChangeoverInfo[] {
  const artists = useEventStore((s) => s.artists);

  return useMemo(() => {
    // Flatten all slots from all artists
    const flatSlots = artists.flatMap((a) =>
      getAllSlots(a).map((slot) => ({
        artistId: a.id,
        positionId: a.positionId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
    );

    const allStartTimes = flatSlots.map((s) => s.startTime);
    const sorted = [...flatSlots].sort((a, b) =>
      sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
    );

    const result: ChangeoverInfo[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      // Skip changeover between consecutive slots of the same artist
      if (cur.artistId === next.artistId) continue;
      const gap = gapMinutes(cur.endTime, next.startTime, cur.startTime);
      result.push({
        beforeArtistId: cur.artistId,
        afterArtistId: next.artistId,
        gapMin: gap,
        status: changeoverStatus(gap),
        samePosition: !!cur.positionId && cur.positionId === next.positionId,
      });
    }
    return result;
  }, [artists]);
}
