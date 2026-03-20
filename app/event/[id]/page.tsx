import { notFound } from "next/navigation";
import { getEvent } from "@/lib/actions/events";
import { EventEditor } from "@/components/editor/EventEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  // Serialize Prisma dates to strings for client components
  const serialized = {
    event: {
      ...event,
      date: event.date.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      positions: undefined,
      artists: undefined,
      user: undefined,
    },
    positions: event.positions,
    artists: event.artists,
  };

  return <EventEditor initial={serialized} />;
}
