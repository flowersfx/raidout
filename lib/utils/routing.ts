export interface RoutingLine {
  raw: string;
  channel: string;
  description: string;
}

/**
 * Parse multi-line routing text into structured lines.
 * Handles "Ch 1-2: Stereo master (XLR)" and plain "Monitor return" lines.
 */
export function parseRoutingLines(text: string): RoutingLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((raw) => {
      const colonIdx = raw.indexOf(":");
      if (colonIdx > 0 && colonIdx < 20) {
        return {
          raw,
          channel: raw.slice(0, colonIdx).trim(),
          description: raw.slice(colonIdx + 1).trim(),
        };
      }
      return { raw, channel: "", description: raw };
    });
}
