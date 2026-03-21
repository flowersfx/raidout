/** Parse "HH:MM" → total minutes since midnight */
export function parseHHMM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Format total minutes → "HH:MM" */
export function formatMinutes(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 1440) + 1440) % 1440 % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Resolve an artist's end time considering midnight crossing.
 * If endTime < startTime, the end is on the next day (add 1440 min).
 */
export function resolveEndTime(startTime: string, endTime: string): number {
  const s = parseHHMM(startTime);
  const e = parseHHMM(endTime);
  return e < s ? e + 1440 : e;
}

/**
 * Sort key for an artist's start time that handles midnight-crossing events.
 * Artists with small start times (e.g. 00:30) that are clearly "after midnight"
 * (start < 12:00 while other artists start >= 12:00) get pushed after midnight.
 * Pass the full list of start times to enable this heuristic.
 */
export function sortableStartTime(startTime: string, allStartTimes?: string[]): number {
  const s = parseHHMM(startTime);
  if (allStartTimes && allStartTimes.length > 1) {
    const hasEveningActs = allStartTimes.some((t) => parseHHMM(t) >= 720);
    if (hasEveningActs && s < 720) {
      return s + 1440; // push after-midnight acts to sort after evening acts
    }
  }
  return s;
}

/** Gap in minutes between prevEnd and nextStart, considering midnight crossing. */
export function gapMinutes(prevEnd: string, nextStart: string, prevStart?: string): number {
  const prevEndMin = prevStart ? resolveEndTime(prevStart, prevEnd) : parseHHMM(prevEnd);
  let nextStartMin = parseHHMM(nextStart);
  // If nextStart appears before prevEnd, it's across midnight
  if (nextStartMin < prevEndMin) {
    nextStartMin += 1440;
  }
  return nextStartMin - prevEndMin;
}

export type ChangeoverStatus = "overlap" | "tight" | "comfortable";

export function changeoverStatus(gap: number): ChangeoverStatus {
  if (gap < 0) return "overlap";
  if (gap <= 15) return "tight";
  return "comfortable";
}

/** Format a gap for display: "-5 min" or "+20 min" */
export function formatGap(gap: number): string {
  if (gap === 0) return "0 min";
  return `${gap > 0 ? "+" : ""}${gap} min`;
}
