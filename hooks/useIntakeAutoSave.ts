"use client";

import { useEffect, useRef, useState } from "react";
import { saveArtistIntake, type IntakeData } from "@/lib/actions/intake";

const DEBOUNCE_MS = 800;

export function useIntakeAutoSave(token: string, data: IntakeData) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Skip the very first render — data hasn't changed yet
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    setDirty(true);
    setSaveError(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveArtistIntake(token, data);
        setDirty(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    data.gearBrings,
    data.venueNeeds,
    data.tableMin,
    data.arrivalTime,
    data.soundcheckMinLength,
    data.notes,
  ]);

  return { saving, dirty, saveError };
}
