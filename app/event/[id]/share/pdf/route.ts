import { type NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/actions/events";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate event exists
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Build the URL to render
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/event/${id}/share?print=1`;

  let browser;
  try {
    // Dev: use full puppeteer. Prod (Vercel): swap to @sparticuz/chromium-min + puppeteer-core.
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Inject print-mode class (same effect as CSS @media print)
    await page.evaluate(() => {
      document.documentElement.classList.add("print-mode");
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rider-${event.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: String(err) },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
