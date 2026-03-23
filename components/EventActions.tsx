"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent, duplicateEvent } from "@/lib/actions/events";

export function EventActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPendingDupe, startDupe] = useTransition();
  const [isPendingDel, startDel] = useTransition();

  function handleDuplicate() {
    startDupe(async () => {
      await duplicateEvent(id);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startDel(async () => {
      await deleteEvent(id);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={handleDuplicate}
        disabled={isPendingDupe}
        title="Duplicate event"
        className="inline-flex items-center px-3 py-2 text-xs font-medium text-muted border border-border rounded-lg hover:text-text hover:bg-raised transition-colors disabled:opacity-40"
      >
        {isPendingDupe ? "…" : "⧉"}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPendingDel}
        title="Delete event"
        className="inline-flex items-center px-3 py-2 text-xs font-medium text-danger border border-border rounded-lg hover:border-danger/40 transition-colors disabled:opacity-40"
      >
        {isPendingDel ? "…" : "✕"}
      </button>
    </>
  );
}
