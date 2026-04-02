import { parseRoutingLines } from "@/lib/utils/routing";
import type { Artist, Position } from "@/types/models";

interface Props {
  artists: Artist[];
  positions: Position[];
}

export function MasterInputList({ artists, positions }: Props) {
  const rows = artists.flatMap((artist) => {
    const position = positions.find((p) => p.id === artist.positionId);
    return parseRoutingLines(artist.routing).map((line) => ({
      ...line,
      artistName: artist.name,
      positionName: position?.name ?? "—",
      positionColor: position?.color,
    }));
  }).sort((a, b) => a.positionName.localeCompare(b.positionName));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No routing data — add signal routing to artist profiles.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 text-xs text-muted uppercase tracking-wider font-medium mono w-24">
              Type
            </th>
            <th className="py-2 pr-4 text-xs text-muted uppercase tracking-wider font-medium">
              Description
            </th>
            <th className="py-2 pr-4 text-xs text-muted uppercase tracking-wider font-medium">
              Artist
            </th>
            <th className="py-2 text-xs text-muted uppercase tracking-wider font-medium">
              Position
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/50 hover:bg-raised/50 transition-colors"
            >
              <td className="py-2 pr-4 mono text-accent text-xs">{row.channel || "—"}</td>
              <td className="py-2 pr-4 mono text-text text-xs">{row.description}</td>
              <td className="py-2 pr-4 text-muted text-xs">{row.artistName}</td>
              <td className="py-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  {row.positionColor && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: row.positionColor }}
                    />
                  )}
                  <span className="text-muted">{row.positionName}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
