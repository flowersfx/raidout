"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  saving: boolean;
  dirty: boolean;
  saveError: string | null;
}

export function IntakeAutoSaveIndicator({ saving, dirty, saveError }: Props) {
  if (saveError) {
    return (
      <span className={cn("text-danger text-xs mono")} title={saveError}>
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
