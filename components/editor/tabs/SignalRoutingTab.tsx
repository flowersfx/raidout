"use client";

import { useEventStore } from "@/store/eventStore";
import { MasterInputList } from "@/components/editor/foh/MasterInputList";
import { sortableStartTime } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";

export function SignalRoutingTab() {
  const { artists, positions } = useEventStore();

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));
  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 w-full">
      <div className="bg-surface border border-border rounded-lg p-4">
        <MasterInputList artists={sorted} positions={positions} />
      </div>
    </div>
  );
}
