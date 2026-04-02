"use client";

export function PrintButton() {
  function handlePrint() {
    const url = new URL(window.location.href);
    url.searchParams.set("print", "1");
    window.open(url.toString(), "_blank");
  }

  return (
    <button
      onClick={handlePrint}
      className="text-xs text-muted hover:text-text transition-colors"
    >
      Print
    </button>
  );
}
