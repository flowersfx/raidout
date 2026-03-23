"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deleteEvent, duplicateEvent } from "@/lib/actions/events";

interface Props {
  id: string;
  name: string;
  date: string; // ISO string
  venue: string;
  stageName: string;
  onDuplicateStart: () => void;
}

export function EventCard({ id, name, date, venue, stageName, onDuplicateStart }: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteFiredRef = useRef(false);
  const [isPendingDel, startDel] = useTransition();
  const [isNavigating, startNavigate] = useTransition();

  useEffect(() => {
    if (flipped) {
      const t = setTimeout(() => inputRef.current?.focus(), 460);
      return () => clearTimeout(t);
    } else {
      setConfirmName("");
    }
  }, [flipped]);

  async function handleDuplicate() {
    if (duplicating) return;
    setDuplicating(true);
    onDuplicateStart();
    await duplicateEvent(id);
    router.refresh();
    setDuplicating(false);
  }

  function handleDelete() {
    if (confirmName !== name) return;
    setDeleting(true);
    // Brief pause so the user sees the action registered, then flip back, then collapse
    setTimeout(() => {
      setFlipped(false);
      setTimeout(() => {
        setExiting(true); // server action fires in onTransitionEnd
      }, 500); // wait for flip-back to complete (flip duration is 450ms)
    }, 380);
  }

  function onCollapseEnd() {
    if (!exiting || deleteFiredRef.current) return;
    deleteFiredRef.current = true;
    startDel(async () => {
      await deleteEvent(id);
      router.refresh();
    });
  }

  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  const canDelete = confirmName === name;

  return (
    <li
      ref={setNodeRef}
      className="grid"
      style={{
        gridTemplateRows: exiting ? "0fr" : "1fr",
        opacity: exiting ? 0 : isDragging ? 0.4 : 1,
        marginBottom: exiting ? "-12px" : "0",
        transform: CSS.Transform.toString(transform),
        transition: exiting
          ? "grid-template-rows 0.35s ease, opacity 0.25s ease, margin-bottom 0.35s ease"
          : (transition ?? undefined),
      }}
      onTransitionEnd={onCollapseEnd}
    >
      {/* min-h-0 is required for the grid row collapse to clip the content */}
      <div className="min-h-0 overflow-hidden">
        <div style={{ perspective: "900px" }} className="pb-0">
          <div
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: flipped ? "rotateX(-180deg)" : "rotateX(0deg)",
              position: "relative",
            }}
          >

            {/* ── Front face ── */}
            <div
              className="flex items-stretch gap-2"
              style={{
                backfaceVisibility: "hidden",
                pointerEvents: flipped ? "none" : "auto",
              }}
            >
              {/* Drag handle */}
              <button
                {...attributes}
                {...listeners}
                tabIndex={flipped ? -1 : 0}
                className="flex items-center px-1.5 text-dim hover:text-muted cursor-grab active:cursor-grabbing touch-none"
                aria-label="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                  <circle cx="4" cy="3" r="1.5" /><circle cx="8" cy="3" r="1.5" />
                  <circle cx="4" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" />
                  <circle cx="4" cy="13" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
              <button
                tabIndex={flipped ? -1 : 0}
                disabled={isNavigating}
                onClick={() => startNavigate(() => router.push(`/event/${id}`))}
                className="flex-1 flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-4 hover:border-accent/40 hover:bg-raised transition-colors group text-left disabled:opacity-60 disabled:cursor-wait"
              >
                <div>
                  <p className="font-semibold text-text group-hover:text-accent transition-colors">
                    {name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formattedDate} &bull; {venue} &bull; {stageName}
                  </p>
                </div>
                <span className="text-dim text-xs mono">{isNavigating ? "…" : "→"}</span>
              </button>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleDuplicate}
                    disabled={duplicating}
                    tabIndex={flipped ? -1 : 0}
                    title="Duplicate event"
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-muted border border-border rounded-lg hover:text-text hover:bg-raised transition-colors disabled:opacity-40"
                  >
                    {duplicating ? "…" : "⧉"}
                  </button>
                  <button
                    onClick={() => setFlipped(true)}
                    tabIndex={flipped ? -1 : 0}
                    title="Delete event"
                    className="inline-flex items-center px-3 py-2 text-xs font-medium text-danger border border-border rounded-lg hover:border-danger/40 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <a
                  href={`/api/events/${id}/export`}
                  download
                  tabIndex={flipped ? -1 : 0}
                  title="Export event as JSON"
                  className="flex-1 inline-flex items-center justify-center px-3 text-xs font-medium text-muted border border-border rounded-lg hover:text-text hover:bg-raised transition-colors"
                >
                  ↓ Export
                </a>
              </div>
            </div>

            {/* ── Back face — delete confirmation ── */}
            <div
              className="absolute inset-0 flex items-center gap-3 bg-surface border border-danger/50 rounded-lg px-5"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateX(180deg)",
                pointerEvents: flipped ? "auto" : "none",
              }}
            >
              <p className="text-xs text-muted shrink-0">
                Type <span className="font-semibold text-text">{name}</span> to confirm
              </p>
              <input
                ref={inputRef}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDelete();
                  if (e.key === "Escape") setFlipped(false);
                }}
                placeholder={name}
                className="flex-1 min-w-0 bg-raised border border-border rounded px-2 py-1.5 text-xs text-text placeholder:text-dim focus:outline-none focus:border-danger/60 transition-colors"
              />
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-danger border border-danger/40 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-30"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setFlipped(false)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:text-text hover:bg-raised transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </li>
  );
}
