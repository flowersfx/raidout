export default function EventLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar skeleton */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <div className="h-3 w-14 rounded bg-raised animate-pulse opacity-50" />
        <div className="h-3.5 w-48 rounded bg-raised animate-pulse flex-1 max-w-xs" />
        <div className="h-3 w-10 rounded bg-raised animate-pulse opacity-30" />
      </header>

      {/* Tab bar skeleton */}
      <nav className="flex items-stretch border-b border-border bg-surface flex-shrink-0 px-4 gap-1">
        {[72, 56, 80, 96, 104].map((w, i) => (
          <div
            key={i}
            className="my-2.5 h-5 rounded bg-raised animate-pulse"
            style={{ width: w, opacity: i === 0 ? 0.7 : 0.35 }}
          />
        ))}
      </nav>

      {/* Content area skeleton */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col gap-4">
        <div className="h-4 w-1/3 rounded bg-raised animate-pulse opacity-40" />
        <div className="h-4 w-1/2 rounded bg-raised animate-pulse opacity-30" />
        <div className="h-4 w-2/5 rounded bg-raised animate-pulse opacity-25" />
        <div className="mt-4 flex-1 rounded-lg border border-border bg-surface animate-pulse opacity-20" />
      </div>
    </div>
  );
}
