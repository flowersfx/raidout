import { sortableStartTime, resolveEndTime, parseHHMM, changeoverStatus, formatGap } from "@/lib/utils/time";
import { getAllSlots, type Position, type Artist } from "@/types/models";
import { TimelineBar } from "@/components/editor/running-order/TimelineBar";
import { cn } from "@/lib/utils/cn";

interface Props {
  artists: Artist[];
  positions: Position[];
  printMode?: boolean;
  onArtistClick?: (artistId: string) => void;
  /** When true, suppresses the embedded TimelineBar (used in ShareView where timeline is its own tab) */
  noTimeline?: boolean;
}

interface FlatSlot {
  artistId: string;
  artistName: string;
  positionId: string | null;
  startTime: string;
  endTime: string;
  sortKey: number;
  resolvedEnd: number;
}

interface Row {
  slots: Map<string | null, FlatSlot[]>;
  maxEnd: number;
  changeovers: Map<string | null, { gap: number; status: ReturnType<typeof changeoverStatus> }>;
}

export function RunningOrderGrid({ artists, positions, printMode, onArtistClick, noTimeline }: Props) {
  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));

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

  flatSlots.sort((a, b) => a.sortKey - b.sortKey);

  const usedPositionIds = [...new Set(artists.map((a) => a.positionId).filter(Boolean))] as string[];
  const hasUnassigned = artists.some((a) => !a.positionId);
  const columns = [
    ...usedPositionIds.map((pid) => {
      const pos = positions.find((p) => p.id === pid);
      return { id: pid as string | null, label: pos?.name ?? "Unknown", color: pos?.color ?? "#666" };
    }),
    ...(hasUnassigned ? [{ id: null as string | null, label: "Unassigned", color: "#666" }] : []),
  ];

  const rows: Row[] = [];
  const lastEndPerPosition = new Map<string | null, { end: number }>();

  for (const slot of flatSlots) {
    const colId = slot.positionId ?? null;
    let placed = false;
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const existing = lastRow.slots.get(colId);
      if (existing && existing.some((e) => slot.sortKey < e.resolvedEnd)) {
        existing.push(slot);
        lastRow.maxEnd = Math.max(lastRow.maxEnd, slot.resolvedEnd);
        placed = true;
      } else if (!existing && slot.sortKey < lastRow.maxEnd) {
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
      rows.push({ slots: new Map([[colId, [slot]]]), maxEnd: slot.resolvedEnd, changeovers });
    }
    lastEndPerPosition.set(colId, { end: slot.resolvedEnd });
  }

  const sorted = [...artists].sort((a, b) =>
    sortableStartTime(a.startTime, allStartTimes) - sortableStartTime(b.startTime, allStartTimes)
  );

  if (artists.length === 0) {
    return <p className="text-sm text-muted">No artists.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {!noTimeline && (
        <div>
          <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Timeline</h2>
          <TimelineBar artists={sorted} positions={positions} printMode={printMode} onArtistClick={onArtistClick} />
        </div>
      )}

      <div>
        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Running Order</h2>
        {/* Column headers */}
        <div
          className="grid gap-3 mb-2"
          style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
        >
          <div />
          {columns.map((col) => (
            <div key={col.id ?? "__unassigned"} className="text-xs font-medium truncate" style={{ color: col.color }}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, ri) => (
            <div key={ri}>
              {row.changeovers.size > 0 && (
                <div
                  className="grid gap-3 py-0.5"
                  style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
                >
                  <div />
                  {columns.map((col) => {
                    const co = row.changeovers.get(col.id);
                    if (!co) return <div key={col.id ?? "__u"} />;
                    return (
                      <div key={col.id ?? "__u"} className="flex items-center">
                        <span className={cn("text-xs mono",
                          co.status === "overlap" ? "text-danger" :
                          co.status === "tight" ? "text-warn" : "text-ok"
                        )}>
                          {formatGap(co.gap)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div
                className="grid gap-3 border-b border-border/30 py-2 items-start"
                style={{ gridTemplateColumns: `2rem repeat(${columns.length}, 1fr)` }}
              >
                <span className="text-dim mono text-xs text-right self-center">{ri + 1}</span>
                {columns.map((col) => {
                  const slots = row.slots.get(col.id);
                  if (!slots || slots.length === 0) return <div key={col.id ?? "__u"} />;
                  return (
                    <div key={col.id ?? "__u"} className="flex gap-2 min-w-0">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {slots.map((slot, si) => (
                          <div
                            key={si}
                            className={cn("min-w-0", onArtistClick && "cursor-pointer")}
                            onClick={() => onArtistClick?.(slot.artistId)}
                          >
                            <p className="font-semibold text-sm text-text truncate">{slot.artistName}</p>
                            <span className="mono text-xs text-muted">{slot.startTime} – {slot.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}
