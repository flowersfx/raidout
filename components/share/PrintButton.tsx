"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs text-muted hover:text-text transition-colors"
    >
      Print
    </button>
  );
}
