"use client";

import { useId } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Artist } from "@/types/models";

interface Props {
  artist: Artist;
}

export function ArtistForm({ artist }: Props) {
  const uid = useId();
  const { positions, patchArtist, removeArtist, addArtist, artists } = useEventStore();

  const patch = (fields: Partial<Artist>) => patchArtist(artist.id, fields);

  function handleDuplicate() {
    const newArtist: Artist = {
      ...artist,
      id: Math.random().toString(36).slice(2, 11),
      name: `${artist.name} (copy)`,
      sortOrder: artists.length,
    };
    addArtist(newArtist);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Row 1: name + position + times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            id={`${uid}-name`}
            label="Artist name"
            value={artist.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider block mb-1">
            Position
          </label>
          <select
            value={artist.positionId ?? ""}
            onChange={(e) => patch({ positionId: e.target.value || null })}
            className="w-full bg-raised border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">— Unassigned —</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          id={`${uid}-table`}
          label="Min table space"
          placeholder="160×60 cm"
          value={artist.tableMin ?? ""}
          onChange={(e) => patch({ tableMin: e.target.value || null })}
        />
        <Input
          id={`${uid}-start`}
          label="Start time"
          type="time"
          value={artist.startTime}
          onChange={(e) => patch({ startTime: e.target.value })}
        />
        <Input
          id={`${uid}-end`}
          label="End time"
          type="time"
          value={artist.endTime}
          onChange={(e) => patch({ endTime: e.target.value })}
        />
      </div>

      {/* Text fields */}
      <Textarea
        id={`${uid}-gear`}
        label="Gear they bring"
        placeholder={"CDJ-3000 ×2\nDJM-900NXS2"}
        value={artist.gearBrings}
        onChange={(e) => patch({ gearBrings: e.target.value })}
        rows={4}
      />
      <Textarea
        id={`${uid}-venue`}
        label="Venue must provide"
        placeholder={"Power strip (4 outlets)\nMonitor wedge"}
        value={artist.venueNeeds}
        onChange={(e) => patch({ venueNeeds: e.target.value })}
        rows={3}
      />
      <Textarea
        id={`${uid}-routing`}
        label="Signal routing"
        placeholder={"Ch 1-2: Stereo master (XLR)\nCh 3: Monitor send (TRS)"}
        value={artist.routing}
        onChange={(e) => patch({ routing: e.target.value })}
        rows={3}
      />
      <Textarea
        id={`${uid}-notes`}
        label="Notes"
        value={artist.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        rows={2}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={handleDuplicate}>
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => removeArtist(artist.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
