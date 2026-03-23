import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dev user (replaces auth in Phase 1-8)
  const user = await prisma.user.upsert({
    where: { email: "dev@raidout.local" },
    update: {},
    create: {
      email: "dev@raidout.local",
      name: "Dev User",
    },
  });

  // Sample event with a default stage
  const event = await prisma.event.create({
    data: {
      name: "Syntax Error: STACK OVERFLOW",
      date: new Date("2026-04-12T20:00:00"),
      venue: "Fabric, London",
      createdBy: user.id,
      stages: {
        create: {
          name: "Stage",
          stageWidth: 800,
          stageDepth: 400,
          fohPosition: "bottom",
          sortOrder: 0,
        },
      },
    },
    include: { stages: true },
  });

  const stage = event.stages[0];

  // Positions
  const boothA = await prisma.position.create({
    data: {
      eventId: event.id,
      stageId: stage.id,
      name: "DJ Booth A",
      x: 80,
      y: 120,
      width: 160,
      height: 90,
      color: "#00e5ff",
    },
  });

  const liveB = await prisma.position.create({
    data: {
      eventId: event.id,
      stageId: stage.id,
      name: "Live Act B",
      x: 400,
      y: 100,
      width: 200,
      height: 120,
      color: "#ff4081",
    },
  });

  // Artists
  await prisma.artist.createMany({
    data: [
      {
        eventId: event.id,
        positionId: boothA.id,
        name: "DJ Fractal",
        startTime: "22:00",
        endTime: "23:00",
        tableMin: "120×60 cm",
        gearBrings: "Pioneer CDJ-3000 x2\nPioneer DJM-900NXS2\nAudio-Technica ATH-M50x",
        venueNeeds: "Power strip (4 outlets)\nMonitor wedge\nDI box x2",
        routing: "Ch 1-2: Stereo master from DJM (XLR)\nCh 3: Booth monitor send (TRS)",
        notes: "Needs extra table for laptop. Arrives 60 min early for soundcheck.",
        sortOrder: 0,
      },
      {
        eventId: event.id,
        positionId: liveB.id,
        name: "Null Pointer",
        startTime: "23:00",
        endTime: "01:00",
        tableMin: "160×80 cm",
        gearBrings: "Elektron Digitakt\nKorg Minilogue XD\nAbleton Push 3\nMacBook Pro",
        venueNeeds: "Power strip (6 outlets)\n2x Monitor wedge\nDI box x4\nMIDI keyboard stand",
        routing:
          "Ch 1-2: Stereo master from Ableton (XLR)\nCh 3-4: Synth direct out (TRS)\nCh 5: Click track for IEM (XLR)",
        notes: "IEM system brought by artist. Needs FOH engineer briefing before show.",
        sortOrder: 1,
      },
      {
        eventId: event.id,
        positionId: boothA.id,
        name: "Heap Overflow",
        startTime: "01:00",
        endTime: "03:00",
        tableMin: "120×60 cm",
        gearBrings: "Pioneer CDJ-2000NXS2 x2\nAllen & Heath Xone:96",
        venueNeeds: "Power strip (4 outlets)\nMonitor wedge",
        routing: "Ch 1-2: Stereo master from Xone (XLR)",
        notes: "Vinyl-only set. Requires needle on deck 1 replaced before set.",
        sortOrder: 2,
      },
    ],
  });

  console.log(`Seeded event "${event.name}" with ${3} artists and ${2} positions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
