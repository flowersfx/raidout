"use client";

import { useId, useState } from "react";
import { useEventStore } from "@/store/eventStore";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Artist, TimeSlot } from "@/types/models";

interface Props {
  artist: Artist;
}

export function ArtistForm({ artist }: Props) {
  const uid = useId();
  const { positions, stages, patchArtist, removeArtist, addArtist, artists } = useEventStore();
  const [linkCopied, setLinkCopied] = useState(false);
  const multiStage = stages.length > 1;

  const patch = (fields: Partial<Artist>) => patchArtist(artist.id, fields);

  const extraSlots: TimeSlot[] = (() => {
    try { return JSON.parse(artist.extraSlots || "[]"); } catch { return []; }
  })();

  function patchExtraSlot(index: number, fields: Partial<TimeSlot>) {
    const updated = extraSlots.map((s, i) => i === index ? { ...s, ...fields } : s);
    patch({ extraSlots: JSON.stringify(updated) });
  }

  function addExtraSlot() {
    const last = extraSlots.length > 0 ? extraSlots[extraSlots.length - 1] : { startTime: artist.startTime, endTime: artist.endTime };
    patch({ extraSlots: JSON.stringify([...extraSlots, { startTime: last.endTime, endTime: last.endTime }]) });
  }

  function removeExtraSlot(index: number) {
    patch({ extraSlots: JSON.stringify(extraSlots.filter((_, i) => i !== index)) });
  }

  function handleCopyIntakeLink() {
    const url = `${window.location.origin}/intake/${artist.intakeToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      if (!artist.intakeSentAt) {
        patch({ intakeSentAt: new Date().toISOString() });
      }
    });
  }

  function handleClearIntake() {
    patch({ intakeSentAt: null, intakeUpdatedAt: null });
  }

  function handleDuplicate() {
    const newArtist: Artist = {
      ...artist,
      id: Math.random().toString(36).slice(2, 11),
      name: `${artist.name} (copy)`,
      intakeToken: crypto.randomUUID(),
      intakeSentAt: null,
      intakeUpdatedAt: null,
      sortOrder: artists.length,
    };
    addArtist(newArtist);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Row 1: name + position + times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            id={`${uid}-name`}
            label="Artist name"
            value={artist.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <Input
          id={`${uid}-arrival`}
          label="Arrival time"
          type="time"
          value={artist.arrivalTime ?? ""}
          onChange={(e) => patch({ arrivalTime: e.target.value || null })}
        />
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
            {positions.map((p) => {
              const stageName = multiStage
                ? (stages.find((s) => s.id === p.stageId)?.name ?? "")
                : null;
              return (
                <option key={p.id} value={p.id}>
                  {stageName ? `${stageName} — ${p.name}` : p.name}
                </option>
              );
            })}
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

      {/* Extra time slots */}
      {extraSlots.map((slot, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Input
            id={`${uid}-extra-start-${i}`}
            label={`Slot ${i + 2} start`}
            type="time"
            value={slot.startTime}
            onChange={(e) => patchExtraSlot(i, { startTime: e.target.value })}
          />
          <Input
            id={`${uid}-extra-end-${i}`}
            label={`Slot ${i + 2} end`}
            type="time"
            value={slot.endTime}
            onChange={(e) => patchExtraSlot(i, { endTime: e.target.value })}
          />
          <button
            onClick={() => removeExtraSlot(i)}
            className="text-dim hover:text-danger text-sm pb-1.5 px-1"
            title="Remove slot"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addExtraSlot}
        className="text-xs text-accent hover:text-accent/80 self-start"
      >
        + Add time slot
      </button>

      {/* Soundcheck */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          id={`${uid}-sc-start`}
          label="Soundcheck start"
          type="time"
          value={artist.soundcheckStart ?? ""}
          onChange={(e) => patch({ soundcheckStart: e.target.value || null })}
        />
        <Input
          id={`${uid}-sc-end`}
          label="Soundcheck end"
          type="time"
          value={artist.soundcheckEnd ?? ""}
          onChange={(e) => patch({ soundcheckEnd: e.target.value || null })}
        />
        <Input
          id={`${uid}-sc-min`}
          label="Min length (proposed)"
          placeholder="e.g. 45 min"
          value={artist.soundcheckMinLength ?? ""}
          onChange={(e) => patch({ soundcheckMinLength: e.target.value || null })}
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
      <div className="flex gap-2 pt-1 flex-wrap">
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
        <div className="flex-1" />
        {(artist.intakeSentAt || artist.intakeUpdatedAt) && (
          <Button size="sm" variant="outline" onClick={handleClearIntake}>
            Clear intake
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleCopyIntakeLink}>
          {linkCopied ? "✓ Copied" : "⇗ Copy intake link"}
        </Button>
      </div>
    </div>
  );
}
