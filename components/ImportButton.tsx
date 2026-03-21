"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importEvent, type EventExport } from "@/lib/actions/events";
import { Button } from "@/components/ui/Button";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as EventExport;
        if (data.version !== 1) {
          alert("Unsupported export format.");
          return;
        }
        startTransition(async () => {
          const id = await importEvent(data);
          router.push(`/event/${id}`);
        });
      } catch {
        alert("Invalid file — could not parse event data.");
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="md"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? "Importing…" : "Import"}
      </Button>
    </>
  );
}
