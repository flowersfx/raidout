"use client";

import { useEventStore } from "@/store/eventStore";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";

interface Props {
  onArtistClick: (artistId: string) => void;
}

export function TimelineTab({ onArtistClick }: Props) {
  const { artists, positions } = useEventStore();

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 w-full">
      <TimelineBar artists={sorted} positions={positions} onArtistClick={onArtistClick} />
    </div>
  );
}
