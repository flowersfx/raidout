"use client";

import { useMemo } from "react";
import { useEventStore } from "@/store/eventStore";
import { gapMinutes, changeoverStatus, type ChangeoverStatus } from "@/lib/utils/time";

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
    const sorted = [...artists].sort((a, b) => {
      const ta = a.startTime.replace(":", "");
      const tb = b.startTime.replace(":", "");
      return ta.localeCompare(tb);
    });

    const result: ChangeoverInfo[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const gap = gapMinutes(cur.endTime, next.startTime);
      result.push({
        beforeArtistId: cur.id,
        afterArtistId: next.id,
        gapMin: gap,
        status: changeoverStatus(gap),
        samePosition: !!cur.positionId && cur.positionId === next.positionId,
      });
    }
    return result;
  }, [artists]);
}
