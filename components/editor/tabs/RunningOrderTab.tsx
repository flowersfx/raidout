"use client";

import { useEventStore } from "@/store/eventStore";
import { sortableStartTime, resolveEndTime, parseHHMM, gapMinutes, changeoverStatus, formatGap } from "@/lib/utils/time";
import { getAllSlots } from "@/types/models";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface FlatSlot {
  artistId: string;
  artistName: string;
  positionId: string | null;
  startTime: string;
  endTime: string;
  sortKey: number;
  resolvedEnd: number;
}

export function RunningOrderTab() {
  const { artists, positions } = useEventStore();

  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));

  // Flatten all slots
  const flatSlots: FlatSlot[] = artists.flatMap((a) =>
    getAllSlots(a).map((slot) => {
      const sk = sortableStartTime(slot.startTime, allStartTimes);
      const rawStart = parseHHMM(slot.startTime);
      const re = resolveEndTime(slot.startTime, slot.endTime) + (sk - rawStart);
      return {
        artistId: a.id,
        artistName: a.name,
        positionId: a.positionId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sortKey: sk,
        resolvedEnd: re,
      };
    })
  );

  // Sort by start time
  flatSlots.sort((a, b) => a.sortKey - b.sortKey);

  // Build position columns
  const usedPositionIds = [...new Set(artists.map((a) => a.positionId).filter(Boolean))] as string[];
  const hasUnassigned = artists.some((a) => !a.positionId);
  const columns = [
    ...usedPositionIds.map((pid) => {
      const pos = positions.find((p) => p.id === pid);
      return { id: pid as string | null, label: pos?.name ?? "Unknown", color: pos?.color ?? "#666" };
    }),
    ...(hasUnassigned ? [{ id: null as string | null, label: "Unassigned", color: "#666" }] : []),
  ];

  // Build rows: group overlapping slots into the same row
  // Multiple artists at the same position stack within the same cell
  interface Row {
    slots: Map<string | null, FlatSlot[]>; // positionId → slots (multiple if stacked)
    maxEnd: number;
    changeovers: Map<string | null, { gap: number; status: ReturnType<typeof changeoverStatus> }>;
  }

  const rows: Row[] = [];
  const lastEndPerPosition = new Map<string | null, { end: number }>();

  for (const slot of flatSlots) {
    const colId = slot.positionId ?? null;

    // Try to place in the last row if this slot overlaps with an existing slot
    // in the SAME column within that row
    let placed = false;
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const existing = lastRow.slots.get(colId);
      if (existing && existing.some((e) => slot.sortKey < e.resolvedEnd)) {
        // Overlaps with at least one slot in this column — stack here
        existing.push(slot);
        lastRow.maxEnd = Math.max(lastRow.maxEnd, slot.resolvedEnd);
        placed = true;
      } else if (!existing && slot.sortKey < lastRow.maxEnd) {
        // Different column but overlaps with the row's time span — place side by side
        lastRow.slots.set(colId, [slot]);
        lastRow.maxEnd = Math.max(lastRow.maxEnd, slot.resolvedEnd);
        placed = true;
      }
    }

    if (!placed) {
      const changeovers = new Map<string | null, { gap: number; status: ReturnType<typeof changeoverStatus> }>();
      const prev = lastEndPerPosition.get(colId);
      if (prev && slot.sortKey >= prev.end) {
        const gap = slot.sortKey - prev.end;
        changeovers.set(colId, { gap, status: changeoverStatus(gap) });
      }

      const newRow: Row = {
        slots: new Map([[colId, [slot]]]),
        maxEnd: slot.resolvedEnd,
        changeovers,
      };
      rows.push(newRow);
    }

    lastEndPerPosition.set(colId, { end: slot.resolvedEnd });
  }

  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 w-full flex flex-col gap-6">
      {/* Timeline bar */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Timeline</h2>
        <TimelineBar artists={sorted} positions={positions} />
      </section>

      {/* Running order grid */}
      <section>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Running Order</h2>

        {artists.length === 0 ? (
          <p className="text-sm text-muted">No artists — add them in the Artists tab.</p>
        ) : (
          <div>
            {/* Column headers */}
            <div
              className="grid gap-3 mb-2"
              style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
            >
              <div /> {/* spacer for index */}
              {columns.map((col) => (
                <div key={col.id ?? "__unassigned"} className="text-xs font-medium truncate" style={{ color: col.color }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, ri) => {
              // Check if any column has a changeover to show
              const hasChangeover = row.changeovers.size > 0;

              return (
                <div key={ri}>
                  {/* Changeover row */}
                  {hasChangeover && (
                    <div
                      className="grid gap-3 py-0.5"
                      style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
                    >
                      <div />
                      {columns.map((col) => {
                        const co = row.changeovers.get(col.id);
                        if (!co) return <div key={col.id ?? "__u"} />;
                        const statusStyle = co.status === "overlap"
                          ? "text-danger"
                          : co.status === "tight"
                            ? "text-warn"
                            : "text-ok";
                        return (
                          <div key={col.id ?? "__u"} className="flex items-center">
                            <span className={cn("text-xs mono", statusStyle)}>
                              {formatGap(co.gap)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Slot row */}
                  <div
                    className="grid gap-3 border-b border-border/30 py-2"
                    style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
                  >
                    {/* Row index */}
                    <span className="text-dim mono text-xs text-right self-center">
                      {ri + 1}
                    </span>

                    {/* One cell per position column */}
                    {columns.map((col) => {
                      const slots = row.slots.get(col.id);
                      if (!slots || slots.length === 0) return <div key={col.id ?? "__u"} />;

                      return (
                        <div
                          key={col.id ?? "__u"}
                          className="flex gap-2 min-w-0"
                        >
                          <div
                            className="w-1 self-stretch rounded-full flex-shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            {slots.map((slot, si) => (
                              <div key={si} className="min-w-0">
                                <p className="font-semibold text-sm text-text truncate">
                                  {slot.artistName}
                                </p>
                                <span className="mono text-xs text-muted">
                                  {slot.startTime} – {slot.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
