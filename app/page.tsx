import Image from "next/image";
import Link from "next/link";
import { getEvents } from "@/lib/actions/events";
import { Button } from "@/components/ui/Button";
import { ImportButton } from "@/components/ImportButton";
import { EventList } from "@/components/EventList";

const SUFFIXES = ["a","b","c","d","e","f","g","h"] as const;
const DURS     = [0.70, 1.10, 0.85, 1.45, 0.95, 1.25, 0.75, 1.00];
const SVG_W    = 800;
const SVG_H    = 32;
const BAR_MAX_H = SVG_H - 4;
const H_SPACING = 11;
const TEXT_HALF_GAP = 72;

export default async function Dashboard() {
  const events = await getEvents();

  const halfW      = SVG_W / 2;
  const leftEnd    = halfW - TEXT_HALF_GAP;
  const rightStart = halfW + TEXT_HALF_GAP;
  const nL         = Math.floor(leftEnd / H_SPACING);
  const nR         = Math.floor((SVG_W - rightStart) / H_SPACING);
  const lSpacing   = leftEnd / Math.max(nL, 1);
  const rSpacing   = (SVG_W - rightStart) / Math.max(nR, 1);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 w-full flex flex-col min-h-screen">
      <header className="mb-8">

        {/* Spectrum title strip — mirrors the FOH strip concept */}
        <div className="relative w-full mb-3">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height={SVG_H}
            aria-hidden="true"
            className="block"
          >
            <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#0a0a0a" rx={3} />

            {/* Left channel — energy peaks nearest center */}
            {Array.from({ length: nL }, (_, i) => {
              const idx = (nL - 1 - i) % 8;
              return (
                <rect
                  key={`l${i}`}
                  className={`foh-bar foh-bar-h foh-y-${SUFFIXES[idx]}`}
                  x={(i + 0.5) * lSpacing - 1.5}
                  y={2}
                  width={3}
                  height={BAR_MAX_H}
                  fill="#00e5ff"
                  opacity={0.45}
                  rx={1}
                  style={{
                    animationDuration: `${DURS[idx]}s`,
                    animationDelay: `-${((nL - 1 - i) * 0.17 % 2.5).toFixed(2)}s`,
                  }}
                />
              );
            })}

            {/* Right channel — energy peaks nearest center */}
            {Array.from({ length: nR }, (_, i) => {
              const idx = i % 8;
              return (
                <rect
                  key={`r${i}`}
                  className={`foh-bar foh-bar-h foh-y-${SUFFIXES[idx]}`}
                  x={rightStart + (i + 0.5) * rSpacing - 1.5}
                  y={2}
                  width={3}
                  height={BAR_MAX_H}
                  fill="#00e5ff"
                  opacity={0.45}
                  rx={1}
                  style={{
                    animationDuration: `${DURS[idx]}s`,
                    animationDelay: `-${(i * 0.17 % 2.5).toFixed(2)}s`,
                  }}
                />
              );
            })}
          </svg>

          {/* Title centered over the gap */}
          <h1 className="absolute inset-0 flex items-center justify-center text-sm font-bold tracking-[0.35em] text-accent pointer-events-none select-none">
            RAIDOUT
          </h1>
        </div>

        {/* Subtitle + actions */}
        <div className="grid grid-cols-3 items-center">
          <div />
          <p className="text-sm text-muted text-center">Consolidate the chaos.</p>
          <div className="flex items-center gap-2 justify-end">
            <ImportButton />
            <Link href="/event/new">
              <Button>+ New Event</Button>
            </Link>
          </div>
        </div>

      </header>

      {events.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-muted text-sm">No events yet.</p>
          <Link href="/event/new" className="mt-4 inline-block">
            <Button>Create your first event</Button>
          </Link>
        </div>
      ) : (
        <EventList
          events={events.map((e) => ({
            id: e.id,
            name: e.name,
            date: e.date.toISOString(),
            venue: e.venue,
            stageName: e.stages.length > 1
            ? `${e.stages[0]?.name ?? "Stage"} +${e.stages.length - 1}`
            : (e.stages[0]?.name ?? "Stage"),
          }))}
        />
      )}

      <footer className="mt-auto pt-10 pb-8 flex justify-center">
        <a href="https://www.flowersfx.com" target="_blank" rel="noopener noreferrer">
          <Image src="/ffx-logo.png" alt="FlowersFX" width={200} height={100} priority className="opacity-50" />
        </a>
      </footer>
    </main>
  );
}
