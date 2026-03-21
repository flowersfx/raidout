import { Badge } from "@/components/ui/Badge";
import { getAllSlots, type Artist, type Position } from "@/types/models";

interface Props {
  artist: Artist;
  position?: Position;
}

function DataBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <pre className="preformatted text-text">{value}</pre>
    </div>
  );
}

export function FOHArtistCard({ artist, position }: Props) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Card header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-3"
        style={position ? { borderLeftColor: position.color, borderLeftWidth: 3 } : undefined}
      >
        <div className="flex-1">
          <p className="font-bold text-text">{artist.name}</p>
          <p className="text-xs text-muted mono mt-0.5">
            {getAllSlots(artist).map((s, i) => `${i > 0 ? ", " : ""}${s.startTime}–${s.endTime}`).join("")}
            {artist.arrivalTime && ` · Arrival: ${artist.arrivalTime}`}
            {artist.soundcheckStart && artist.soundcheckEnd && ` · SC: ${artist.soundcheckStart}–${artist.soundcheckEnd}`}
            {artist.tableMin && ` · Table: ${artist.tableMin}`}
          </p>
        </div>
        {position && <Badge label={position.name} color={position.color} />}
      </div>

      {/* Body */}
      <div className="p-4 grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataBlock label="Gear they bring" value={artist.gearBrings} />
          <DataBlock label="Venue must provide" value={artist.venueNeeds} />
        </div>
        <DataBlock label="Signal routing" value={artist.routing} />
        <DataBlock label="Notes" value={artist.notes} />
      </div>
    </div>
  );
}
