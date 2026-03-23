"use client";

import { useId, useState } from "react";
import { useIntakeAutoSave } from "@/hooks/useIntakeAutoSave";
import { IntakeAutoSaveIndicator } from "./IntakeAutoSaveIndicator";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { IntakeArtist } from "@/lib/actions/intake";

interface Props {
  artist: IntakeArtist;
}

export function IntakeForm({ artist }: Props) {
  const uid = useId();

  const [gearBrings, setGearBrings] = useState(artist.gearBrings);
  const [venueNeeds, setVenueNeeds] = useState(artist.venueNeeds);
  const [tableMin, setTableMin] = useState(artist.tableMin ?? "");
  const [arrivalTime, setArrivalTime] = useState(artist.arrivalTime ?? "");
  const [soundcheckMinLength, setSoundcheckMinLength] = useState(artist.soundcheckMinLength ?? "");
  const [notes, setNotes] = useState(artist.notes);

  const data = {
    gearBrings,
    venueNeeds,
    tableMin: tableMin || null,
    arrivalTime: arrivalTime || null,
    soundcheckMinLength: soundcheckMinLength || null,
    notes,
  };

  const { saving, dirty, saveError } = useIntakeAutoSave(artist.intakeToken, data);

  const formattedDate = new Date(artist.event.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="font-semibold text-text text-sm">{artist.name}</p>
          <p className="text-xs text-muted">
            {artist.event.name} · {formattedDate} · {artist.event.venue}
          </p>
        </div>
        <IntakeAutoSaveIndicator saving={saving} dirty={dirty} saveError={saveError} />
      </header>

      {/* Form body */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Context: position (if assigned) */}
        {artist.position && (
          <>
            <section className="flex flex-wrap gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted uppercase tracking-wider">Position</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: artist.position.color }}
                  />
                  <span className="text-text font-medium">{artist.position.name}</span>
                </span>
              </div>
            </section>
            <hr className="border-border" />
          </>
        )}

        {/* Logistics */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Logistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id={`${uid}-arrival`}
              label="Arrival time"
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
            <Input
              id={`${uid}-table`}
              label="Min table space"
              placeholder="160×60 cm"
              value={tableMin}
              onChange={(e) => setTableMin(e.target.value)}
            />
          </div>
        </section>

        {/* Soundcheck */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Soundcheck</h2>
          <Input
            id={`${uid}-sc-min`}
            label="Minimum duration needed"
            placeholder="e.g. 45 min"
            value={soundcheckMinLength}
            onChange={(e) => setSoundcheckMinLength(e.target.value)}
          />
        </section>

        {/* Gear */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Equipment</h2>
          <Textarea
            id={`${uid}-gear`}
            label="Gear you're bringing"
            placeholder={"CDJ-3000 ×2\nDJM-900NXS2\nLaptop + audio interface"}
            value={gearBrings}
            onChange={(e) => setGearBrings(e.target.value)}
            rows={5}
          />
          <Textarea
            id={`${uid}-venue`}
            label="What you need from the venue"
            placeholder={"Power strip (4 outlets)\nMonitor wedge\nDI box"}
            value={venueNeeds}
            onChange={(e) => setVenueNeeds(e.target.value)}
            rows={4}
          />
        </section>

        {/* Notes */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Notes</h2>
          <Textarea
            id={`${uid}-notes`}
            label="Anything else the production team should know"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </section>

        <p className="text-xs text-dim pb-4">
          Changes are saved automatically. You can return to this page at any time using this link.
        </p>
      </main>
    </div>
  );
}
