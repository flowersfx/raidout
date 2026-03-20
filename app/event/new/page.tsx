"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/actions/events";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date || !venue.trim()) return;
    setPending(true);
    setError(null);
    try {
      const event = await createEvent({ name: name.trim(), date, venue: venue.trim() });
      router.push(`/event/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
      setPending(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10 w-full">
      <Link href="/" className="text-xs text-muted hover:text-text mb-6 inline-block">
        ← Dashboard
      </Link>
      <h1 className="text-xl font-bold mb-6 text-text">New Event</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="name"
          label="Event name"
          placeholder="Syntax Error: STACK OVERFLOW"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          id="venue"
          label="Venue"
          placeholder="Fabric, London"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create Event →"}
          </Button>
          <Link href="/">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </main>
  );
}
