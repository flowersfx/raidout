"use client";

import { parseHHMM, resolveEndTime, sortableStartTime } from "@/lib/utils/time";
import { getAllSlots, type Artist, type Position } from "@/types/models";

interface Props {
  artists: Artist[];
  positions: Position[];
}

const SUB_LANE_HEIGHT = 22; // px per sub-row
const SUB_LANE_GAP = 2;    // gap between sub-rows
const LANE_PADDING = 12;   // top padding within a lane (room for label)
const LANE_BOTTOM_PAD = 4; // bottom padding
const TICK_HEADER = 20;    // px for the hour labels row

interface ResolvedSlot {
  artist: Artist;
  slotIndex: number;
  start: number;
  end: number;
  slot: { startTime: string; endTime: string };
  laneId: string | null;
}

/** Pack slots into sub-lanes using greedy interval scheduling */
function packSubLanes(slots: ResolvedSlot[]): number[] {
  const sorted = slots
    .map((s, i) => ({ ...s, origIndex: i }))
    .sort((a, b) => a.start - b.start);

  const subLaneEnds: number[] = []; // tracks the end time of each sub-lane
  const result = new Array<number>(slots.length);

  for (const s of sorted) {
    let placed = false;
    for (let lane = 0; lane < subLaneEnds.length; lane++) {
      if (subLaneEnds[lane] <= s.start) {
        subLaneEnds[lane] = s.end;
        result[s.origIndex] = lane;
        placed = true;
        break;
      }
    }
    if (!placed) {
      result[s.origIndex] = subLaneEnds.length;
      subLaneEnds.push(s.end);
    }
  }

  return result;
}

export function TimelineBar({ artists, positions }: Props) {
  if (artists.length === 0) return null;

  // Collect all start times across all slots for midnight heuristic
  const allStartTimes = artists.flatMap((a) => getAllSlots(a).map((s) => s.startTime));

  // Compute resolved times for all slots (handling midnight crossing)
  const resolved: ResolvedSlot[] = artists.flatMap((a) => {
    const slots = getAllSlots(a);
    return slots.map((slot, slotIndex) => {
      const sortedStart = sortableStartTime(slot.startTime, allStartTimes);
      const rawStart = parseHHMM(slot.startTime);
      const resolvedEnd = resolveEndTime(slot.startTime, slot.endTime);
      return {
        artist: a,
        slotIndex,
        start: sortedStart,
        end: resolvedEnd + (sortedStart - rawStart),
        slot,
        laneId: a.positionId ?? null,
      };
    });
  });

  const allTimes = resolved.flatMap((r) => [r.start, r.end]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const span = maxTime - minTime || 60;

  const toPercent = (t: number) => ((t - minTime) / span) * 100;

  // Hour tick marks
  const startHour = Math.ceil(minTime / 60);
  const endHour = Math.floor(maxTime / 60);
  const ticks = [];
  for (let h = startHour; h <= endHour; h++) {
    ticks.push(h);
  }

  // Build lanes: one per position that has artists, plus one for unassigned
  const usedPositionIds = [...new Set(artists.map((a) => a.positionId).filter(Boolean))] as string[];
  const lanes: { id: string | null; label: string; color: string }[] = usedPositionIds.map((pid) => {
    const pos = positions.find((p) => p.id === pid);
    return { id: pid, label: pos?.name ?? "Unknown", color: pos?.color ?? "#666" };
  });

  const hasUnassigned = artists.some((a) => !a.positionId);
  if (hasUnassigned) {
    lanes.push({ id: null, label: "Unassigned", color: "#666" });
  }

  // Pack sub-lanes per position lane and compute sub-lane assignments
  const subLaneAssignments = new Map<number, number>(); // resolved index → sub-lane
  const laneSubCount = new Map<number, number>(); // lane index → number of sub-lanes

  for (let li = 0; li < lanes.length; li++) {
    const laneSlots = resolved
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.laneId === lanes[li].id);

    const slotsForPacking = laneSlots.map(({ r }) => r);
    const packed = packSubLanes(slotsForPacking);

    let maxSub = 0;
    for (let si = 0; si < laneSlots.length; si++) {
      subLaneAssignments.set(laneSlots[si].i, packed[si]);
      maxSub = Math.max(maxSub, packed[si]);
    }
    laneSubCount.set(li, laneSlots.length > 0 ? maxSub + 1 : 1);
  }

  // Compute lane tops based on variable heights
  const laneTops: number[] = [];
  const laneHeights: number[] = [];
  let currentTop = TICK_HEADER;
  for (let li = 0; li < lanes.length; li++) {
    laneTops.push(currentTop);
    const subCount = laneSubCount.get(li) ?? 1;
    const height = LANE_PADDING + subCount * (SUB_LANE_HEIGHT + SUB_LANE_GAP) - SUB_LANE_GAP + LANE_BOTTOM_PAD;
    laneHeights.push(height);
    currentTop += height;
  }

  const totalHeight = currentTop;

  return (
    <div className="relative bg-black rounded-lg overflow-hidden border border-border" style={{ height: totalHeight }}>
      {/* Hour ticks — full height */}
      {ticks.map((h) => {
        const pct = toPercent(h * 60);
        return (
          <div
            key={h}
            className="absolute top-0 border-l border-border/50"
            style={{ left: `${pct}%`, height: totalHeight }}
          >
            <span className="absolute top-0.5 left-1 text-xs text-dim mono leading-none">
              {String(h % 24).padStart(2, "0")}:00
            </span>
          </div>
        );
      })}

      {/* Lane separators + labels */}
      {lanes.map((lane, i) => {
        const top = laneTops[i];
        return (
          <div key={lane.id ?? "__unassigned"}>
            {i > 0 && (
              <div
                className="absolute left-0 right-0 border-t border-border/30"
                style={{ top }}
              />
            )}
            <span
              className="absolute text-xs truncate leading-none pointer-events-none"
              style={{
                top: top + 2,
                left: 4,
                color: lane.color,
                opacity: 0.5,
                maxWidth: 100,
                fontSize: 9,
              }}
            >
              {lane.label}
            </span>
          </div>
        );
      })}

      {/* Artist blocks */}
      {resolved.map(({ artist, slotIndex, start, end, slot }, resolvedIndex) => {
        const position = positions.find((p) => p.id === artist.positionId);
        const laneIndex = lanes.findIndex((l) => l.id === (artist.positionId ?? null));
        const subLane = subLaneAssignments.get(resolvedIndex) ?? 0;
        const left = toPercent(start);
        const width = toPercent(end) - left;
        const color = position?.color ?? "#666";
        const top = laneTops[laneIndex] + LANE_PADDING + subLane * (SUB_LANE_HEIGHT + SUB_LANE_GAP);

        return (
          <div
            key={`${artist.id}-${slotIndex}`}
            className="absolute rounded flex items-center justify-center overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.5)}%`,
              top,
              height: SUB_LANE_HEIGHT,
              backgroundColor: color + "33",
              borderLeft: `2px solid ${color}`,
            }}
            title={`${artist.name} · ${slot.startTime}–${slot.endTime}`}
          >
            <span className="text-xs font-medium text-text truncate px-1">
              {artist.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
