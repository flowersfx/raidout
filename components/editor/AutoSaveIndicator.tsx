"use client";

import { useEventStore } from "@/store/eventStore";
import { cn } from "@/lib/utils/cn";

export function AutoSaveIndicator() {
  const saving = useEventStore((s) => s.saving);
  const dirty = useEventStore((s) => s.dirty);
  const saveError = useEventStore((s) => s.saveError);

  if (saveError) {
    return (
      <span className="text-danger text-xs mono" title={saveError}>
        ✕ Save failed
      </span>
    );
  }

  if (saving) {
    return <span className="text-muted text-xs mono animate-pulse">Saving…</span>;
  }

  if (!dirty) {
    return <span className="text-dim text-xs mono">Saved</span>;
  }

  return <span className="text-dim text-xs mono">Unsaved</span>;
}
