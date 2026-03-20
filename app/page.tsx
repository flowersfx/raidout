import Link from "next/link";
import { getEvents } from "@/lib/actions/events";
import { Button } from "@/components/ui/Button";

export default async function Dashboard() {
  const events = await getEvents();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 w-full">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            RAIDOUT
          </h1>
          <p className="text-sm text-muted mt-0.5">Stage tech rider consolidation</p>
        </div>
        <Link href="/event/new">
          <Button>+ New Event</Button>
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-muted text-sm">No events yet.</p>
          <Link href="/event/new" className="mt-4 inline-block">
            <Button>Create your first event</Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/event/${event.id}`}
                className="flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-4 hover:border-accent/40 hover:bg-raised transition-colors group"
              >
                <div>
                  <p className="font-semibold text-text group-hover:text-accent transition-colors">
                    {event.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    &bull; {event.venue}
                  </p>
                </div>
                <span className="text-dim text-xs mono">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
