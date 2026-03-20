import { notFound } from "next/navigation";
import { getEvent } from "@/lib/actions/events";
import { ShareView } from "@/components/share/ShareView";
import { DownloadButton } from "@/components/share/DownloadButton";
import { PrintButton } from "@/components/share/PrintButton";
import type { Event, Position, Artist } from "@/types/models";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const serializedEvent: Event = {
    ...event,
    date: event.date.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Action bar (hidden in print) */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-3 flex items-center justify-between no-print">
        <div>
          <p className="font-semibold text-text text-sm">{event.name}</p>
          <p className="text-xs text-muted">
            {new Date(event.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            · {event.venue}
          </p>
        </div>
        <div className="flex gap-3">
          <PrintButton />
          <DownloadButton eventId={event.id} />
        </div>
      </div>

      <ShareView
        event={serializedEvent}
        positions={event.positions as Position[]}
        artists={event.artists as Artist[]}
      />
    </div>
  );
}
