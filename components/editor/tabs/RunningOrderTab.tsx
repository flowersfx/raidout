"use client";

import { useEventStore } from "@/store/eventStore";
import { RunningOrderGrid } from "@/components/editor/running-order/RunningOrderGrid";

export function RunningOrderTab() {
  const { artists, positions } = useEventStore();

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 w-full flex flex-col gap-6">
      <section>
        <RunningOrderGrid artists={artists} positions={positions} />
      </section>
    </div>
  );
}
