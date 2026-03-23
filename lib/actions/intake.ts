"use server";

import { prisma } from "@/lib/db";

export type IntakeData = {
  gearBrings: string;
  venueNeeds: string;
  tableMin: string | null;
  arrivalTime: string | null;
  soundcheckMinLength: string | null;
  notes: string;
};

export async function getArtistByIntakeToken(token: string) {
  const artist = await prisma.artist.findUnique({
    where: { intakeToken: token },
    include: {
      event: {
        select: {
          name: true,
          date: true,
          venue: true,
        },
      },
      position: {
        select: { name: true, color: true },
      },
    },
  });
  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.name,
    startTime: artist.startTime,
    endTime: artist.endTime,
    gearBrings: artist.gearBrings,
    venueNeeds: artist.venueNeeds,
    tableMin: artist.tableMin,
    arrivalTime: artist.arrivalTime,
    soundcheckStart: artist.soundcheckStart,
    soundcheckEnd: artist.soundcheckEnd,
    soundcheckMinLength: artist.soundcheckMinLength,
    notes: artist.notes,
    intakeToken: artist.intakeToken,
    intakeUpdatedAt: artist.intakeUpdatedAt?.toISOString() ?? null,
    event: {
      name: artist.event.name,
      date: artist.event.date.toISOString(),
      venue: artist.event.venue,
    },
    position: artist.position
      ? { name: artist.position.name, color: artist.position.color }
      : null,
  };
}

export type IntakeArtist = NonNullable<Awaited<ReturnType<typeof getArtistByIntakeToken>>>;

export async function saveArtistIntake(token: string, data: IntakeData) {
  await prisma.artist.update({
    where: { intakeToken: token },
    data: {
      gearBrings: data.gearBrings,
      venueNeeds: data.venueNeeds,
      tableMin: data.tableMin,
      arrivalTime: data.arrivalTime,
      soundcheckMinLength: data.soundcheckMinLength,
      notes: data.notes,
      intakeUpdatedAt: new Date(),
    },
  });
}
