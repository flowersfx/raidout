"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  eventId: string;
}

export function DownloadButton({ eventId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/event/${eventId}/share/pdf`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rider-${eventId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? "Generating PDF…" : <><svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4 4-4" /></svg> Download PDF</>}
    </Button>
  );
}
