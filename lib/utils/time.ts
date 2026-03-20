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

/** Gap in minutes between prevEnd and nextStart. Negative = overlap. */
export function gapMinutes(prevEnd: string, nextStart: string): number {
  return parseHHMM(nextStart) - parseHHMM(prevEnd);
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
